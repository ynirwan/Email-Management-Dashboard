import { Router } from "express";
import { db, licensesTable, usersTable } from "@workspace/db";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import jwt from "jsonwebtoken";

const router = Router();

const LICENSE_SECRET      = process.env["LICENSE_SECRET"]       || "zenipost-license-secret-2026";
const ADMIN_ACCESS_SECRET = process.env["ADMIN_ACCESS_SECRET"]  || "zenipost-admin-access-secret-2026";
// In production: use RSA private key — ADMIN_ACCESS_SECRET should be a long random string
// The email app verifies tokens using the matching public value

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseIdParam(value: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseInt(raw, 10);
}

function parseFeatures(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function computeStatus(lic: any): "active" | "expiring" | "revoked" | "expired" {
  if (lic.revokedAt)                                   return "revoked";
  const now     = Date.now();
  const expires = new Date(lic.expiresAt).getTime();
  if (expires < now)                                   return "expired";
  const daysLeft = (expires - now) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 30)                                  return "expiring";
  return "active";
}

function signLicense(payload: object): string {
  return jwt.sign(payload, LICENSE_SECRET, { algorithm: "HS256" });
}

function formatLicense(lic: any, customerName?: string) {
  return {
    ...lic,
    features:      parseFeatures(lic.features),
    status:        computeStatus(lic),
    customerName:  customerName ?? null,
    // managed service fields — safe defaults if columns not yet migrated
    isManaged:          lic.isManaged          ?? false,
    adminAccessEnabled: lic.adminAccessEnabled ?? false,
    managedSince:       lic.managedSince ? (lic.managedSince instanceof Date ? lic.managedSince.toISOString() : lic.managedSince) : null,
    managedNote:        lic.managedNote ?? null,
    issuedAt:     lic.issuedAt  instanceof Date ? lic.issuedAt.toISOString().slice(0, 10)  : lic.issuedAt,
    expiresAt:    lic.expiresAt instanceof Date ? lic.expiresAt.toISOString().slice(0, 10) : lic.expiresAt,
    revokedAt:    lic.revokedAt  ? (lic.revokedAt  instanceof Date ? lic.revokedAt.toISOString()  : lic.revokedAt)  : null,
    lastPingAt:   lic.lastPingAt ? (lic.lastPingAt instanceof Date ? lic.lastPingAt.toISOString() : lic.lastPingAt) : null,
  };
}

// ── GET /api/licenses ─────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin only" }); return;
    }

    const page   = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit  = Math.min(100, parseInt((req.query.limit as string) || "20"));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || "";

    const rows = await db
      .select({ lic: licensesTable, customer: { id: usersTable.id, name: usersTable.name, email: usersTable.email, company: usersTable.company } })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.customerId, usersTable.id))
      .orderBy(licensesTable.createdAt)
      .limit(limit).offset(offset);

    let licenses = rows.map(({ lic, customer }) =>
      formatLicense(lic, customer?.company ?? customer?.name ?? "Unknown")
    );

    if (search) {
      const q = search.toLowerCase();
      licenses = licenses.filter((l) =>
        l.domain.toLowerCase().includes(q) || (l.customerName ?? "").toLowerCase().includes(q)
      );
    }
    if (status) {
      licenses = licenses.filter((l) => l.status === status);
    }

    res.json({ licenses, total: licenses.length, page, limit });
  } catch (err) {
    console.error("GET /licenses error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/licenses/:id ─────────────────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const rows = await db
      .select({ lic: licensesTable, customer: { id: usersTable.id, name: usersTable.name, email: usersTable.email, company: usersTable.company } })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.customerId, usersTable.id))
      .where(eq(licensesTable.id, parseIdParam(req.params.id)))
      .limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }
    const { lic, customer } = rows[0];
    res.json({ license: formatLicense(lic, customer?.company ?? customer?.name) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/generate ───────────────────────────────────────────────
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

    const { customerId, domain, plan, emailsPerMonth, subscribersLimit, features, expiresAt } = req.body;

    if (!customerId || !domain || !plan || !expiresAt) {
      res.status(400).json({ error: "Bad Request", message: "customerId, domain, plan, expiresAt required" }); return;
    }

    // Extract root domain
    const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();
    const rootDomain  = cleanDomain.split(".").slice(-2).join(".");

    // Check domain not already licensed
    const existing = await db.select().from(licensesTable).where(eq(licensesTable.domain, cleanDomain)).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: "Conflict", message: `Domain ${cleanDomain} already has a license` }); return;
    }

    const customers = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(customerId))).limit(1);
    if (!customers[0]) { res.status(404).json({ error: "Not Found", message: "Customer not found" }); return; }

    const customer = customers[0];

    const payload = {
      customerId:       parseInt(customerId),
      domain:           cleanDomain,
      rootDomain,
      plan,
      emailsPerMonth:   parseInt(emailsPerMonth) || 2500,
      subscribersLimit: parseInt(subscribersLimit) || 500,
      features:         JSON.stringify(features ?? []),
      status:           "active" as const,
      expiresAt:        new Date(expiresAt),
    };

    // Sign the license
    const licensePayload = {
      license_id:        `pending`,
      customer_id:       customer.id,
      customer_name:     customer.company ?? customer.name,
      domain:            cleanDomain,
      root_domain:       rootDomain,
      plan,
      emails_per_month:  payload.emailsPerMonth,
      subscribers_limit: payload.subscribersLimit,
      features:          features ?? [],
      issued_at:         new Date().toISOString(),
      expires_at:        new Date(expiresAt).toISOString(),
      product:           "ZeniPost Email Platform",
      version:           "2.0",
      // admin_access_allowed is baked into the license file itself
      // The email app reads this field on startup to decide whether to
      // register the /auth/admin-access endpoint at all.
      // Even if someone bypasses the dashboard, this field controls it.
      admin_access_allowed: false,  // set to true via PATCH /:id/managed after opt-in
    };
    const signature = signLicense(licensePayload);

    const [newLic] = await db.insert(licensesTable).values({ ...payload, signature }).returning();

    res.status(201).json({ license: formatLicense(newLic, customer.company ?? customer.name) });
  } catch (err) {
    console.error("POST /licenses/generate error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/revoke/:id ─────────────────────────────────────────────
router.post("/revoke/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const id = parseIdParam(req.params.id);
    const [updated] = await db.update(licensesTable)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(licensesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ message: "License revoked", license: formatLicense(updated) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/unrevoke/:id ───────────────────────────────────────────
router.post("/unrevoke/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const id = parseIdParam(req.params.id);
    const [updated] = await db.update(licensesTable)
      .set({ status: "active", revokedAt: null, updatedAt: new Date() })
      .where(eq(licensesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ message: "License unrevoked", license: formatLicense(updated) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/renew/:id ──────────────────────────────────────────────
router.post("/renew/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }
    const id = parseIdParam(req.params.id);
    const { expiresAt } = req.body;
    if (!expiresAt) { res.status(400).json({ error: "expiresAt required" }); return; }
    const existing = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
    if (!existing[0]) { res.status(404).json({ error: "Not Found" }); return; }
    const [updated] = await db.update(licensesTable)
      .set({ expiresAt: new Date(expiresAt), status: "active", revokedAt: null, updatedAt: new Date() })
      .where(eq(licensesTable.id, id)).returning();
    res.json({ message: "License renewed", license: formatLicense(updated) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/:id/admin-token — generate short-lived admin access token
//
// This creates a signed JWT that the customer's ZeniPost email app will accept
// to grant temporary super-admin access without needing a password.
//
// Token is:
//   - Single purpose: type = "admin_access"
//   - Short-lived: 15 minutes only
//   - Domain-locked: only accepted by the exact app it was issued for
//   - Signed with ADMIN_ACCESS_SECRET (separate from license secret)
//   - Logged for audit purposes
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/admin-token", requireAdmin, async (req, res) => {
  try {
    const adminUser = (req as any).user;
    const id        = parseIdParam(req.params.id);

    const rows = await db
      .select({ lic: licensesTable, customer: { name: usersTable.name, company: usersTable.company, email: usersTable.email } })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.customerId, usersTable.id))
      .where(eq(licensesTable.id, id))
      .limit(1);

    if (!rows[0]) { res.status(404).json({ error: "Not Found", message: "License not found" }); return; }

    const { lic, customer } = rows[0];

    if (lic.status === "revoked") {
      res.status(400).json({ error: "Bad Request", message: "Cannot access a revoked license" }); return;
    }

    // ── Managed service gate ──────────────────────────────────────────────
    // Admin access is ONLY allowed if the customer has opted into managed services
    // AND the admin access toggle is enabled on their license.
    // This ensures self-managed customers have full privacy — no one can log into their app.
    if (!lic.isManaged) {
      res.status(403).json({
        error:   "Forbidden",
        message: "This customer has not opted into ZeniPost Managed Services. Admin access is not available.",
        code:    "NOT_MANAGED",
      }); return;
    }

    if (!lic.adminAccessEnabled) {
      res.status(403).json({
        error:   "Forbidden",
        message: "Admin access is currently disabled for this license. Enable it in the license settings.",
        code:    "ADMIN_ACCESS_DISABLED",
      }); return;
    }

    // Build the token payload
    const tokenPayload = {
      type:           "zenipost_admin_access",    // the email app checks this field
      domain:         lic.domain,                 // email app checks this matches APP_DOMAIN
      license_id:     lic.id,
      issued_by:      adminUser.email,            // who generated this access
      issued_by_name: adminUser.name,
      customer_name:  customer?.company ?? customer?.name ?? "Unknown",
      purpose:        "managed_service_admin",
      iat:            Math.floor(Date.now() / 1000),
    };

    // Sign with short 15-minute expiry
    const token = jwt.sign(tokenPayload, ADMIN_ACCESS_SECRET, {
      algorithm: "HS256",
      expiresIn: "15m",
    });

    // Build the access URL — the email app listens at /auth/admin-access
    const protocol    = process.env["NODE_ENV"] === "production" ? "https" : "http";
    const accessUrl   = `${protocol}://${lic.domain}/auth/admin-access?token=${token}`;

    // Log this access attempt (you can write to an audit_logs table later)
    console.log(`[ADMIN ACCESS] ${adminUser.email} → ${lic.domain} (license #${id}) at ${new Date().toISOString()}`);

    res.json({
      token,
      accessUrl,
      domain:       lic.domain,
      expiresIn:    "15 minutes",
      issuedBy:     adminUser.email,
      issuedAt:     new Date().toISOString(),
      warning:      "This token grants super-admin access. Do not share it.",
    });
  } catch (err) {
    console.error("POST /licenses/:id/admin-token error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ── PATCH /api/licenses/:id/managed — toggle managed service status ───────────
//
// Two separate actions controlled by the `action` field:
//   "opt_in"          → mark customer as managed (isManaged=true, set managedSince)
//   "opt_out"         → remove managed status (isManaged=false, disable admin access)
//   "enable_access"   → enable admin login (adminAccessEnabled=true) — requires isManaged
//   "disable_access"  → disable admin login (adminAccessEnabled=false) without removing managed status
//
// Body: { action: string, note?: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/managed", requireAdmin, async (req, res) => {
  try {
    const id     = parseIdParam(req.params.id);
    const { action, note } = req.body;

    const validActions = ["opt_in", "opt_out", "enable_access", "disable_access"];
    if (!action || !validActions.includes(action)) {
      res.status(400).json({ error: "Bad Request", message: `action must be one of: ${validActions.join(", ")}` }); return;
    }

    const rows = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not Found", message: "License not found" }); return; }

    const lic = rows[0];
    let patch: Record<string, any> = { updatedAt: new Date() };

    if (action === "opt_in") {
      patch.isManaged          = true;
      patch.managedSince       = lic.managedSince ?? new Date(); // don't reset if already managed
      patch.adminAccessEnabled = true;                           // auto-enable access on opt-in
      if (note !== undefined) patch.managedNote = note;
    }

    if (action === "opt_out") {
      patch.isManaged          = false;
      patch.adminAccessEnabled = false;  // always disable access when removing managed status
      patch.managedSince       = null;
      if (note !== undefined) patch.managedNote = note;
    }

    if (action === "enable_access") {
      if (!lic.isManaged) {
        res.status(400).json({
          error:   "Bad Request",
          message: "Cannot enable admin access — customer is not opted into managed services. Use opt_in first.",
          code:    "NOT_MANAGED",
        }); return;
      }
      patch.adminAccessEnabled = true;
    }

    if (action === "disable_access") {
      patch.adminAccessEnabled = false;
      // isManaged stays true — customer keeps managed status, just no login access temporarily
    }

    const [updated] = await db.update(licensesTable).set(patch).where(eq(licensesTable.id, id)).returning();

    const customers = await db.select({ name: usersTable.name, company: usersTable.company })
      .from(usersTable).where(eq(usersTable.id, updated.customerId)).limit(1);

    const customerName = customers[0]?.company ?? customers[0]?.name ?? "Unknown";

    console.log(`[MANAGED] action=${action} license=#${id} domain=${lic.domain} by admin`);

    const actionMessage: Record<"opt_in" | "opt_out" | "enable_access" | "disable_access", string> = {
      opt_in:         "Customer opted into managed services. Admin access enabled.",
      opt_out:        "Customer removed from managed services. Admin access disabled.",
      enable_access:  "Admin access enabled for this license.",
      disable_access: "Admin access disabled. Managed service status unchanged.",
    };

    res.json({
      message: actionMessage[action as keyof typeof actionMessage],
      license: formatLicense(updated, customerName),
    });
  } catch (err) {
    console.error("PATCH /licenses/:id/managed error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/ping ───────────────────────────────────────────────────
router.post("/ping", async (req, res) => {
  try {
    const { domain, signature } = req.body;
    if (!domain || !signature) {
      res.status(400).json({ valid: false, message: "domain and signature required" }); return;
    }

    const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();
    const rows = await db.select().from(licensesTable).where(eq(licensesTable.domain, cleanDomain)).limit(1);
    const lic  = rows[0];

    if (!lic) {
      res.status(404).json({ valid: false, status: "not_found", message: "No license found for this domain" }); return;
    }

    try { jwt.verify(signature, LICENSE_SECRET); }
    catch {
      res.status(401).json({ valid: false, status: "invalid_signature", message: "License signature invalid or tampered" }); return;
    }

    const status = computeStatus(lic);

    if (status === "revoked") {
      res.json({ valid: false, status: "revoked", message: "License revoked. Contact support." }); return;
    }
    if (status === "expired") {
      res.json({ valid: false, status: "expired", message: "License expired. Please renew." }); return;
    }

    await db.update(licensesTable)
      .set({ lastPingAt: new Date(), pingCount: sql`${licensesTable.pingCount} + 1`, updatedAt: new Date() })
      .where(eq(licensesTable.id, lic.id));

    res.json({
      valid:               true,
      status,
      domain:              lic.domain,
      plan:                lic.plan,
      emailsPerMonth:      lic.emailsPerMonth,
      subscribersLimit:    lic.subscribersLimit,
      features:            parseFeatures(lic.features),
      expiresAt:           lic.expiresAt instanceof Date ? lic.expiresAt.toISOString() : lic.expiresAt,
      // The email app uses these two fields to decide whether /auth/admin-access
      // endpoint should be active. It updates its config on every ping.
      admin_access_allowed: (lic.isManaged ?? false) && (lic.adminAccessEnabled ?? false),
      message:             status === "expiring" ? "License expiring soon — please renew." : "License valid.",
    });
  } catch (err) {
    console.error("POST /licenses/ping error:", err);
    res.status(500).json({ valid: false, message: "Internal server error" });
  }
});

export default router;
