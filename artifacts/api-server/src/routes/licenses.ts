// artifacts/api-server/src/routes/licenses.ts  (FULL REPLACEMENT)
//
// Fixes applied:
//   1. license_id no longer "pending" — re-signed after DB insert with real lic.id
//   2. feature flags use canonical PLAN_FEATURE_FLAGS from feature-flags.ts
//   3. ping response is snake_case to match license file format
//   4. root_domain added to ping response
//   5. admin_access_allowed correctly present in all generated license payloads
//   6. delivery block added to license file when delivery plan is active
//   7. domains.ts v1 format eliminated — all license generation goes through buildLicensePayload()

import { Router } from "express";
import { db, licensesTable, usersTable } from "@workspace/db";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import jwt from "jsonwebtoken";
import { PLAN_FEATURE_FLAGS, FEATURE_LABELS } from "@workspace/db/schema/feature-flags.js";

const router = Router();

const LICENSE_SECRET      = process.env["LICENSE_SECRET"]      || "zenipost-license-secret-2026";
const ADMIN_ACCESS_SECRET = process.env["ADMIN_ACCESS_SECRET"] || "zenipost-admin-access-secret-2026";
const APP_URL             = process.env["APP_URL"]             || "https://app.zenipost.com";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseIdParam(value: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseInt(raw, 10);
}

function parseFeatures(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function computeStatus(lic: any): "active" | "expiring" | "revoked" | "expired" {
  if (lic.revokedAt) return "revoked";
  const now     = Date.now();
  const expires = new Date(lic.expiresAt).getTime();
  if (expires < now) return "expired";
  const daysLeft = (expires - now) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 30) return "expiring";
  return "active";
}

function toISO(v: any): string {
  if (!v) return new Date().toISOString();
  return v instanceof Date ? v.toISOString() : String(v);
}

// ── Canonical license payload builder ────────────────────────────────────────
// ALL license file generation goes through this single function.
// This is the schema the email app reads. Change here, change nowhere else.
//
// Fields the email app reads:
//   license_id          — identifies this license back to the dashboard
//   domain              — must match APP_DOMAIN env in email app
//   root_domain         — used for subdomain matching
//   customer_id / name / email — for display / logging in email app
//   plan                — gates feature visibility in email app UI
//   emails_per_month    — quota limit (snake_case, enforced by email app)
//   subscribers_limit   — quota limit (snake_case, enforced by email app)
//   features            — string[] of FeatureFlag values — gates functionality
//   issued_at           — ISO string
//   expires_at          — ISO string — email app checks daily, blocks on expiry
//   product / version   — sanity-check on startup
//   ping_url            — where email app pings to confirm license validity
//   admin_access_allowed — if true, email app registers /auth/admin-access route
//   delivery            — null if self-managed, object if on ZeniPost delivery
//     delivery.plan_id      — delivery tier id
//     delivery.plan_name    — human name
//     delivery.emails_limit — monthly send ceiling on this delivery tier
//     delivery.infra        — e.g. "Optimized routing"
//     delivery.routing      — e.g. "Better inbox placement"
//     delivery.active_since — ISO string
//     delivery.dedicated_ip — bool — email app enables dedicated IP path
//     delivery.ip_warmup    — bool — email app activates warmup throttle
// ─────────────────────────────────────────────────────────────────────────────
function buildLicensePayload(lic: any, owner: any): object {
  const features = parseFeatures(lic.features);

  // Delivery block — only present when a managed delivery plan is assigned
  const delivery = lic.deliveryPlanId
    ? {
        plan_id:      lic.deliveryPlanId,
        plan_name:    lic.deliveryPlanName   ?? null,
        emails_limit: lic.deliveryEmailsLimit ?? null,
        infra:        lic.deliveryInfra       ?? null,
        routing:      lic.deliveryRouting     ?? null,
        active_since: lic.deliveryActiveSince ? toISO(lic.deliveryActiveSince) : null,
        // These two flags tell the email app which sending path to activate
        dedicated_ip: features.includes("dedicated_ip"),
        ip_warmup:    features.includes("ip_warmup"),
      }
    : null;

  return {
    license_id:           `lic_${lic.id}`,         // Fix #1: real id, never "pending"
    domain:               lic.domain,
    root_domain:          lic.rootDomain ?? "",
    customer_id:          lic.customerId,
    customer_name:        owner?.company ?? owner?.name ?? "Unknown",
    customer_email:       owner?.email ?? "",
    plan:                 lic.plan,
    emails_per_month:     lic.emailsPerMonth,       // Fix #5: snake_case throughout
    subscribers_limit:    lic.subscribersLimit,
    features,                                       // Fix #3: canonical flags
    issued_at:            toISO(lic.issuedAt),
    expires_at:           toISO(lic.expiresAt),
    product:              "ZeniPost Email Platform",
    version:              "2.0",
    format:               "zenipost-license-v2",   // Fix #1: single format, v1 gone
    ping_url:             `${APP_URL}/api/licenses/ping`,
    admin_access_allowed: (lic.isManaged ?? false) && (lic.adminAccessEnabled ?? false),  // Fix #4
    delivery,                                       // New: managed delivery block
  };
}

function signPayload(payload: object): string {
  return jwt.sign(payload, LICENSE_SECRET, { algorithm: "HS256" });
}

function formatLicense(lic: any, customerName?: string) {
  const features = parseFeatures(lic.features);
  return {
    id:                 lic.id,
    customerId:         lic.customerId,
    customerName:       customerName ?? null,
    domain:             lic.domain,
    rootDomain:         lic.rootDomain,
    plan:               lic.plan,
    emailsPerMonth:     lic.emailsPerMonth,
    subscribersLimit:   lic.subscribersLimit,
    features,
    status:             computeStatus(lic),
    isManaged:          lic.isManaged          ?? false,
    adminAccessEnabled: lic.adminAccessEnabled ?? false,
    managedSince:       lic.managedSince  ? toISO(lic.managedSince)  : null,
    managedNote:        lic.managedNote   ?? null,
    // Delivery plan fields
    deliveryPlanId:      lic.deliveryPlanId      ?? null,
    deliveryPlanName:    lic.deliveryPlanName     ?? null,
    deliveryEmailsLimit: lic.deliveryEmailsLimit  ?? null,
    deliveryInfra:       lic.deliveryInfra        ?? null,
    deliveryRouting:     lic.deliveryRouting      ?? null,
    deliveryActiveSince: lic.deliveryActiveSince  ? toISO(lic.deliveryActiveSince) : null,
    issuedAt:   lic.issuedAt  ? toISO(lic.issuedAt).slice(0, 10)  : null,
    expiresAt:  lic.expiresAt ? toISO(lic.expiresAt).slice(0, 10) : null,
    revokedAt:  lic.revokedAt  ? toISO(lic.revokedAt)  : null,
    lastPingAt: lic.lastPingAt ? toISO(lic.lastPingAt) : null,
    pingCount:  lic.pingCount  ?? 0,
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
        l.domain.toLowerCase().includes(q) ||
        (l.customerName ?? "").toLowerCase().includes(q)
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

// ── POST /api/licenses — admin generates a new license ───────────────────────
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { customerId, domain, plan, emailsPerMonth, subscribersLimit, features, expiresAt } = req.body;

    if (!customerId || !domain || !plan || !expiresAt) {
      res.status(400).json({ error: "Bad Request", message: "customerId, domain, plan, expiresAt are required" }); return;
    }

    const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();
    const rootDomain  = cleanDomain.split(".").slice(-2).join(".");

    const existing = await db.select().from(licensesTable).where(eq(licensesTable.domain, cleanDomain)).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: "Conflict", message: `Domain ${cleanDomain} already has a license` }); return;
    }

    const customers = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(customerId))).limit(1);
    if (!customers[0]) { res.status(404).json({ error: "Not Found", message: "Customer not found" }); return; }

    const customer = customers[0];

    // Use canonical feature flags for this plan if none provided
    const resolvedFeatures: string[] = features?.length
      ? features
      : (PLAN_FEATURE_FLAGS[plan] ?? PLAN_FEATURE_FLAGS.starter);

    const payload = {
      customerId:       parseInt(customerId),
      domain:           cleanDomain,
      rootDomain,
      plan,
      emailsPerMonth:   parseInt(emailsPerMonth) || 2500,
      subscribersLimit: parseInt(subscribersLimit) || 500,
      features:         JSON.stringify(resolvedFeatures),
      status:           "active" as const,
      expiresAt:        new Date(expiresAt),
    };

    // Insert first so we have the real id
    const [newLic] = await db.insert(licensesTable).values({ ...payload, signature: "" }).returning();

    // Fix #1: Build payload with real lic.id, then sign
    const licensePayload = buildLicensePayload(newLic, customer);
    const signature = signPayload(licensePayload);

    // Write the real signature back
    const [signedLic] = await db
      .update(licensesTable)
      .set({ signature, updatedAt: new Date() })
      .where(eq(licensesTable.id, newLic.id))
      .returning();

    res.status(201).json({ license: formatLicense(signedLic, customer.company ?? customer.name) });
  } catch (err) {
    console.error("POST /licenses error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/licenses/:id/download — download signed license file ─────────────
router.get("/:id/download", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);

    const rows = await db
      .select({ lic: licensesTable, owner: { name: usersTable.name, email: usersTable.email, company: usersTable.company } })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.customerId, usersTable.id))
      .where(eq(licensesTable.id, id))
      .limit(1);

    if (!rows[0]) { res.status(404).json({ error: "Not Found", message: "License not found" }); return; }

    const { lic, owner } = rows[0];
    const licensePayload = buildLicensePayload(lic, owner);
    const signature      = signPayload(licensePayload);
    const licenseFile    = { ...licensePayload, signature };

    res.setHeader("Content-Disposition", `attachment; filename="zenipost-license-${lic.domain}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(licenseFile);
  } catch (err) {
    console.error("GET /licenses/:id/download error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/licenses/:id/revoke ────────────────────────────────────────────
router.patch("/:id/revoke", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const [updated] = await db
      .update(licensesTable)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(licensesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ license: formatLicense(updated) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/licenses/:id/unrevoke ─────────────────────────────────────────
router.patch("/:id/unrevoke", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const [updated] = await db
      .update(licensesTable)
      .set({ revokedAt: null, updatedAt: new Date() })
      .where(eq(licensesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ license: formatLicense(updated) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/licenses/:id/delivery — assign or remove delivery plan ─────────
//
// Body:
//   action: "assign" | "remove"
//   planId?: string  — required for assign, must match a DELIVERY_PLANS id
//
// When assigning a delivery plan:
//   - sets deliveryPlanId + related fields
//   - appends managed_delivery feature flag (+ dedicated_ip / ip_warmup if applicable)
//   - re-signs the license so the email app gets updated file on next download
//
// When removing:
//   - clears all delivery fields
//   - removes managed_delivery / dedicated_ip / ip_warmup flags
//   - re-signs
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/delivery", requireAdmin, async (req, res) => {
  try {
    const id     = parseIdParam(req.params.id);
    const { action, planId } = req.body;

    if (!action || !["assign", "remove"].includes(action)) {
      res.status(400).json({ error: "Bad Request", message: "action must be 'assign' or 'remove'" }); return;
    }

    // Import delivery plan definitions
    const { DELIVERY_PLANS } = await import("./plans.js");

    const rows = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }
    const lic = rows[0];

    // Delivery-related feature flags that we manage automatically
    const DELIVERY_FLAGS = ["managed_delivery", "dedicated_ip", "ip_warmup"];
    let currentFeatures: string[] = parseFeatures(lic.features);

    let patch: Record<string, any> = { updatedAt: new Date() };

    if (action === "assign") {
      if (!planId) {
        res.status(400).json({ error: "Bad Request", message: "planId is required for assign" }); return;
      }

      const plan = DELIVERY_PLANS.find((p: any) => p.id === planId);
      if (!plan) {
        res.status(400).json({ error: "Bad Request", message: `Unknown delivery plan: ${planId}` }); return;
      }

      patch.deliveryPlanId      = plan.id;
      patch.deliveryPlanName    = plan.name;
      patch.deliveryEmailsLimit = plan.emailsPerMonth || null;
      patch.deliveryInfra       = plan.infrastructure;
      patch.deliveryRouting     = plan.routing;
      patch.deliveryActiveSince = lic.deliveryActiveSince ?? new Date();

      // Always add managed_delivery flag when any delivery plan is assigned
      const newFlags = new Set(currentFeatures.filter(f => !DELIVERY_FLAGS.includes(f)));
      newFlags.add("managed_delivery");
      // Add dedicated_ip / ip_warmup for top-tier plans
      if (plan.id === "delivery_dedicated") newFlags.add("dedicated_ip");
      if (["delivery_growth", "delivery_scale", "delivery_dedicated"].includes(plan.id)) newFlags.add("ip_warmup");

      patch.features = JSON.stringify([...newFlags]);

    } else {
      // Remove delivery plan
      patch.deliveryPlanId      = null;
      patch.deliveryPlanName    = null;
      patch.deliveryEmailsLimit = null;
      patch.deliveryInfra       = null;
      patch.deliveryRouting     = null;
      patch.deliveryActiveSince = null;
      // Strip delivery-only flags
      patch.features = JSON.stringify(currentFeatures.filter(f => !DELIVERY_FLAGS.includes(f)));
    }

    const [updated] = await db.update(licensesTable).set(patch).where(eq(licensesTable.id, id)).returning();

    // Re-sign with updated payload so next download gets the new delivery block
    const ownerRows = await db.select().from(usersTable).where(eq(usersTable.id, updated.customerId)).limit(1);
    const owner = ownerRows[0];
    const licensePayload = buildLicensePayload(updated, owner);
    const signature      = signPayload(licensePayload);

    const [resignedLic] = await db
      .update(licensesTable)
      .set({ signature, updatedAt: new Date() })
      .where(eq(licensesTable.id, id))
      .returning();

    const customerName = owner?.company ?? owner?.name ?? "Unknown";
    res.json({
      message:  action === "assign" ? `Delivery plan '${planId}' assigned.` : "Delivery plan removed.",
      license:  formatLicense(resignedLic, customerName),
    });
  } catch (err) {
    console.error("PATCH /licenses/:id/delivery error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/licenses/:id/managed ──────────────────────────────────────────
router.patch("/:id/managed", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const { action, note } = req.body;

    const validActions = ["opt_in", "opt_out", "enable_access", "disable_access"];
    if (!action || !validActions.includes(action)) {
      res.status(400).json({ error: "Bad Request", message: `action must be one of: ${validActions.join(", ")}` }); return;
    }

    const rows = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }

    const lic   = rows[0];
    let patch: Record<string, any> = { updatedAt: new Date() };

    if (action === "opt_in") {
      patch.isManaged          = true;
      patch.managedSince       = lic.managedSince ?? new Date();
      patch.adminAccessEnabled = true;
      if (note !== undefined) patch.managedNote = note;
    }
    if (action === "opt_out") {
      patch.isManaged          = false;
      patch.adminAccessEnabled = false;
      patch.managedSince       = null;
      if (note !== undefined) patch.managedNote = note;
    }
    if (action === "enable_access") {
      if (!lic.isManaged) {
        res.status(400).json({ error: "Bad Request", message: "Customer is not on managed services. Use opt_in first.", code: "NOT_MANAGED" }); return;
      }
      patch.adminAccessEnabled = true;
    }
    if (action === "disable_access") {
      patch.adminAccessEnabled = false;
    }

    const [updated] = await db.update(licensesTable).set(patch).where(eq(licensesTable.id, id)).returning();

    const customers = await db.select({ name: usersTable.name, company: usersTable.company })
      .from(usersTable).where(eq(usersTable.id, updated.customerId)).limit(1);
    const customerName = customers[0]?.company ?? customers[0]?.name ?? "Unknown";

    const msgs: Record<string, string> = {
      opt_in:         "Customer opted into managed services.",
      opt_out:        "Customer removed from managed services.",
      enable_access:  "Admin access enabled.",
      disable_access: "Admin access disabled.",
    };

    res.json({ message: msgs[action], license: formatLicense(updated, customerName) });
  } catch (err) {
    console.error("PATCH /licenses/:id/managed error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/:id/admin-token ───────────────────────────────────────
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

    if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }
    const { lic, customer } = rows[0];

    if (!lic.isManaged) {
      res.status(403).json({ error: "Forbidden", message: "Customer has not opted into managed services.", code: "NOT_MANAGED" }); return;
    }
    if (!lic.adminAccessEnabled) {
      res.status(403).json({ error: "Forbidden", message: "Admin access is disabled for this license.", code: "ADMIN_ACCESS_DISABLED" }); return;
    }

    const tokenPayload = {
      type:           "zenipost_admin_access",
      domain:         lic.domain,
      license_id:     lic.id,
      issued_by:      adminUser.email,
      issued_by_name: adminUser.name,
      customer_name:  customer?.company ?? customer?.name ?? "Unknown",
      purpose:        "managed_service_admin",
      iat:            Math.floor(Date.now() / 1000),
    };

    const token     = jwt.sign(tokenPayload, ADMIN_ACCESS_SECRET, { algorithm: "HS256", expiresIn: "15m" });
    const protocol  = process.env["NODE_ENV"] === "production" ? "https" : "http";
    const accessUrl = `${protocol}://${lic.domain}/auth/admin-access?token=${token}`;

    console.log(`[ADMIN ACCESS] ${adminUser.email} → ${lic.domain} (lic #${id}) at ${new Date().toISOString()}`);

    res.json({ token, accessUrl, domain: lic.domain, expiresIn: "15 minutes", issuedBy: adminUser.email, issuedAt: new Date().toISOString(), warning: "This token grants super-admin access. Do not share it." });
  } catch (err) {
    console.error("POST /licenses/:id/admin-token error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/ping ───────────────────────────────────────────────────
// Fix #5: response is snake_case throughout to match license file format
// Fix #6: root_domain added
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

    // Delivery block in ping response — email app updates its delivery config on each ping
    const delivery = lic.deliveryPlanId
      ? {
          plan_id:      lic.deliveryPlanId,
          plan_name:    lic.deliveryPlanName   ?? null,
          emails_limit: lic.deliveryEmailsLimit ?? null,
          infra:        lic.deliveryInfra       ?? null,
          routing:      lic.deliveryRouting     ?? null,
          dedicated_ip: parseFeatures(lic.features).includes("dedicated_ip"),
          ip_warmup:    parseFeatures(lic.features).includes("ip_warmup"),
        }
      : null;

    res.json({
      valid:                true,
      status,
      domain:               lic.domain,
      root_domain:          lic.rootDomain ?? "",      // Fix #6
      plan:                 lic.plan,
      emails_per_month:     lic.emailsPerMonth,        // Fix #5: snake_case
      subscribers_limit:    lic.subscribersLimit,      // Fix #5: snake_case
      features:             parseFeatures(lic.features),
      expires_at:           toISO(lic.expiresAt),      // Fix #5: snake_case
      admin_access_allowed: (lic.isManaged ?? false) && (lic.adminAccessEnabled ?? false),
      delivery,                                        // New: delivery config
      message:              status === "expiring" ? "License expiring soon — please renew." : "License valid.",
    });
  } catch (err) {
    console.error("POST /licenses/ping error:", err);
    res.status(500).json({ valid: false, message: "Internal server error" });
  }
});

export default router;