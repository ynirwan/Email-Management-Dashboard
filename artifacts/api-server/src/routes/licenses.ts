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
import { PLAN_DEFINITIONS } from "./plans.js";
import { buildLicensePayload } from "../lib/license-builder.js";
import { encryptLicense } from "../lib/license-crypto.js";

const router = Router();

const LICENSE_SECRET      = process.env["LICENSE_SECRET"]      || "zenipost-license-secret-2026";
const ADMIN_ACCESS_SECRET = process.env["ADMIN_ACCESS_SECRET"] || "zenipost-admin-access-secret-2026";
// APP_URL is consumed inside lib/license-builder.ts — not needed here.

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

// buildLicensePayload is imported from ../lib/license-builder.ts — single source of truth.

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
    isActivated:   lic.isActivated ?? true,
    issuedAt:      lic.issuedAt    ? toISO(lic.issuedAt).slice(0, 10)  : null,
    expiresAt:     lic.expiresAt   ? toISO(lic.expiresAt).slice(0, 10) : null,
    revokedAt:     lic.revokedAt   ? toISO(lic.revokedAt)   : null,
    lastPingAt:    lic.lastPingAt  ? toISO(lic.lastPingAt)  : null,
    lastPingIp:    lic.lastPingIp  ?? null,
    pingCount:     lic.pingCount   ?? 0,
    // Installation tracking
    installedAt:      lic.installedAt  ? toISO(lic.installedAt) : null,
    installedIp:      lic.installedIp  ?? null,
    installCount:     lic.installCount ?? 0,
    ipMismatch:       lic.ipMismatch   ?? false,
    installationIds:  (() => { try { return JSON.parse(lic.installationIds ?? "[]"); } catch { return []; } })(),
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
    const rootDomain  = computeRootDomain(cleanDomain);

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

    // Default numeric limits to the plan definition values when caller omits them.
    // This prevents under-provisioned licenses being issued silently.
    const planLimits = PLAN_DEFINITIONS.find((p) => p.id === plan);
    const resolvedEmailsPerMonth   = emailsPerMonth !== undefined && emailsPerMonth !== ""
      ? parseInt(emailsPerMonth)
      : (planLimits?.emailsPerMonth   ?? 100000);
    const resolvedSubscribersLimit = subscribersLimit !== undefined && subscribersLimit !== ""
      ? parseInt(subscribersLimit)
      : (planLimits?.subscribersLimit ?? 25000);

    const payload = {
      customerId:       parseInt(customerId),
      domain:           cleanDomain,
      rootDomain,
      plan,
      emailsPerMonth:   resolvedEmailsPerMonth,
      subscribersLimit: resolvedSubscribersLimit,
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
    const fullPayload    = { ...licensePayload, signature };

    // Encrypt the full payload with AES-256-GCM so the .lic file is not
    // human-readable. The email-app decrypts with the same LICENSE_SECRET.
    const encryptedBlob  = encryptLicense(fullPayload, LICENSE_SECRET);

    res.setHeader("Content-Disposition", `attachment; filename="zenipost-license-${lic.domain}.lic"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(encryptedBlob);
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

// ── PATCH /api/licenses/:id/activate — admin confirms payment + unlocks license ─
// Sets is_activated = true so the user can download their license file.
// Only admins can call this. Safe to call multiple times (idempotent).
router.patch("/:id/activate", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const rows = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not Found", message: "License not found" }); return; }

    const [updated] = await db
      .update(licensesTable)
      .set({ isActivated: true, updatedAt: new Date() })
      .where(eq(licensesTable.id, id))
      .returning();

    const customers = await db
      .select({ name: usersTable.name, company: usersTable.company })
      .from(usersTable)
      .where(eq(usersTable.id, updated.customerId))
      .limit(1);
    const customerName = customers[0]?.company ?? customers[0]?.name ?? "Unknown";

    res.json({ message: "License activated. Customer can now download.", license: formatLicense(updated, customerName) });
  } catch (err) {
    console.error("PATCH /licenses/:id/activate error:", err);
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

// ── POST /api/licenses/register-install ──────────────────────────────────────
// Called by the email app on startup (lifespan handler) and after a successful
// setup-wizard run.  Registers the installation UUID so the dashboard can:
//   • Track unique running instances per license (seat enforcement)
//   • Show "X / Y installations used" in the admin UI
//   • Detect IP changes (potential license reuse)
//
// Body: { domain, signature, server_ip, installation_id }
// No auth required — the license signature proves the caller owns the install.
router.post("/register-install", async (req, res) => {
  try {
    const { domain, signature, server_ip, installation_id } = req.body;
    if (!domain || !signature) {
      res.status(400).json({ ok: false, message: "domain and signature required" }); return;
    }

    const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();
    const clientIp    = server_ip?.trim()
      || (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      || req.socket.remoteAddress
      || "";

    // Verify JWT signature — same logic as ping
    let decoded: any;
    try { decoded = jwt.verify(signature, LICENSE_SECRET); }
    catch {
      res.status(401).json({ ok: false, message: "Invalid license signature" }); return;
    }

    // Domain cross-check
    const jwtDomain     = (decoded.domain     ?? "").toLowerCase();
    const jwtRootDomain = (decoded.root_domain ?? "").toLowerCase();
    if (!domainMatchesLicense(cleanDomain, jwtDomain, jwtRootDomain)) {
      res.status(401).json({ ok: false, message: `License was issued for '${jwtDomain}', not '${cleanDomain}'` }); return;
    }

    // Look up license row (exact + root-domain fallback)
    const rows = await db.select().from(licensesTable).where(eq(licensesTable.domain, cleanDomain)).limit(1);
    let lic = rows[0];
    if (!lic && cleanDomain.split(".").length > 2) {
      const root = computeRootDomain(cleanDomain);
      const rootRows = await db.select().from(licensesTable).where(eq(licensesTable.rootDomain, root)).limit(1);
      lic = rootRows[0];
    }
    if (!lic) {
      res.status(404).json({ ok: false, message: "No license found for this domain" }); return;
    }

    // Reject installs for revoked licenses — even if the JWT signature is valid, a revoked
    // license must not be permitted to register new installations.
    if (lic.revokedAt) {
      res.status(403).json({
        ok:      false,
        message: "This license has been revoked and cannot be used to register an installation. Contact support.",
        code:    "LICENSE_REVOKED",
      });
      return;
    }

    // ── UUID-based seat enforcement ───────────────────────────────────────────
    // Parse the known installation IDs from the DB.
    const planDef  = PLAN_DEFINITIONS.find((p) => p.id === lic.plan);
    const seatLimit = planDef?.installations ?? 1;
    let knownIds: string[] = [];
    try { knownIds = JSON.parse(lic.installationIds ?? "[]"); } catch { knownIds = []; }

    let isNewInstallation = false;
    if (installation_id && typeof installation_id === "string") {
      if (!knownIds.includes(installation_id)) {
        // New UUID — check seat limit before adding.
        // Agency (seatLimit = 9_999_999) is treated as unlimited.
        if (seatLimit < 9_000_000 && knownIds.length >= seatLimit) {
          res.status(403).json({
            ok:        false,
            message:   `Installation limit reached: your '${lic.plan}' plan allows ${seatLimit} installation${seatLimit === 1 ? "" : "s"} and all seats are in use. Please upgrade your license via the ZeniPost Dashboard.`,
            code:      "INSTALL_LIMIT_REACHED",
            used:      knownIds.length,
            limit:     seatLimit,
            plan:      lic.plan,
          });
          return;
        }
        knownIds.push(installation_id);
        isNewInstallation = true;
      }
      // Known UUID — re-registration (server restart / setup wizard re-run). No seat consumed.
    }

    // ── IP tracking (informational, never blocks) ─────────────────────────────
    const isFirstInstall = !lic.installedAt;
    const ipChanged      = !!lic.installedIp && !!clientIp && clientIp !== lic.installedIp;

    if (!isFirstInstall && ipChanged) {
      console.warn(
        `[LICENSE] Re-install on different IP for lic #${lic.id} domain=${lic.domain}: ` +
        `original=${lic.installedIp} new=${clientIp}`
      );
    }

    await db.update(licensesTable)
      .set({
        installedAt:      lic.installedAt ?? new Date(),   // keep original first-install timestamp
        installedIp:      isFirstInstall ? clientIp : lic.installedIp,  // never overwrite original IP
        installCount:     sql`${licensesTable.installCount} + 1`,
        ipMismatch:       ipChanged ? true : lic.ipMismatch,
        installationIds:  JSON.stringify(knownIds),
        updatedAt:        new Date(),
      })
      .where(eq(licensesTable.id, lic.id));

    res.json({
      ok:                true,
      is_first_install:  isFirstInstall,
      is_new_uuid:       isNewInstallation,
      ip_changed:        ipChanged,
      seats_used:        knownIds.length,
      seats_limit:       seatLimit,
      message:           isFirstInstall
        ? "Installation registered."
        : isNewInstallation
          ? "New installation registered."
          : ipChanged
            ? "Re-installation detected from a different IP. This has been flagged."
            : "Installation re-registered.",
    });
  } catch (err) {
    console.error("POST /licenses/register-install error:", err);
    res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

// ── Helpers — domain parsing ──────────────────────────────────────────────────

/**
 * computeRootDomain(domain) — public-suffix-aware root domain extraction.
 *
 * Handles the three problem cases the naive slice(-2) approach breaks on:
 *   1. IPs           — returned verbatim     (e.g. "203.0.113.5")
 *   2. localhost      — returned as-is
 *   3. ccTLDs         — three-part root       (e.g. "user.co.uk" → "user.co.uk",
 *                                               "app.user.co.uk" → "user.co.uk")
 *
 * For ordinary domains two-label extraction is used ("example.com").
 *
 * This covers the overwhelming majority of real-world cases without pulling in
 * an external public-suffix-list library. If you need exotic ccTLDs, install
 * "tldts" and replace this function body with tldts.getDomain().
 */
function computeRootDomain(rawDomain: string): string {
  const domain = rawDomain.toLowerCase().trim();

  // IPv4
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return domain;
  // IPv6 (bracket form or bare)
  if (domain.startsWith("[") || domain.includes(":")) return domain;
  // localhost or single-label
  if (!domain.includes(".")) return domain;

  const labels = domain.split(".");
  const tld    = labels[labels.length - 1];   // e.g. "uk", "com", "io"
  const sld    = labels[labels.length - 2];   // e.g. "co", "com", "example"

  // Known second-level registries under a ccTLD — these require 3 labels to
  // identify the registrant, e.g. "example.co.uk" not "co.uk".
  // Sourced from the most common public entries in the Mozilla Public Suffix List.
  const KNOWN_SLD_UNDER_CCTLD = new Set([
    // United Kingdom
    "co.uk","org.uk","me.uk","net.uk","ltd.uk","plc.uk","gov.uk","sch.uk","ac.uk","police.uk",
    // Australia
    "com.au","org.au","net.au","edu.au","gov.au","asn.au","id.au",
    // New Zealand
    "co.nz","org.nz","net.nz","school.nz","govt.nz","ac.nz","geek.nz",
    // South Africa
    "co.za","org.za","net.za","gov.za","edu.za","ac.za",
    // India
    "co.in","org.in","net.in","gen.in","ind.in","gov.in","nic.in","ac.in","edu.in",
    // Japan
    "co.jp","or.jp","ne.jp","gr.jp","ac.jp","ad.jp","ed.jp","go.jp","lg.jp",
    // Brazil
    "com.br","org.br","net.br","gov.br","edu.br","mil.br","adv.br","arq.br","eng.br",
    // China
    "com.cn","org.cn","net.cn","gov.cn","edu.cn","ac.cn",
    // Hong Kong
    "com.hk","org.hk","net.hk","gov.hk","edu.hk","idv.hk",
    // Singapore
    "com.sg","org.sg","net.sg","gov.sg","edu.sg","per.sg",
    // Malaysia
    "com.my","org.my","net.my","gov.my","edu.my","mil.my",
    // Spain
    "com.es","org.es","nom.es","gob.es","edu.es",
    // Argentina
    "com.ar","org.ar","net.ar","gov.ar","edu.ar","int.ar",
    // Mexico
    "com.mx","org.mx","net.mx","gob.mx","edu.mx",
    // Colombia
    "com.co","org.co","net.co","gov.co","edu.co","mil.co",
    // Ukraine
    "com.ua","org.ua","net.ua","gov.ua","edu.ua",
    // Russia (rare but exists)
    "com.ru","org.ru","net.ru",
    // Turkey
    "com.tr","org.tr","net.tr","gov.tr","edu.tr","bel.tr","k12.tr",
    // Thailand
    "co.th","or.th","net.th","go.th","ac.th","in.th",
    // Kenya
    "co.ke","or.ke","net.ke","go.ke","ac.ke","me.ke",
  ]);

  // Is the last two labels a known second-level ccTLD registry?
  const twoLabel = `${sld}.${tld}`;
  if (KNOWN_SLD_UNDER_CCTLD.has(twoLabel)) {
    // Need a third label to get the registrant root — take last 3 labels
    if (labels.length >= 3) return labels.slice(-3).join(".");
    // Caller passed just "co.uk" itself — return as-is
    return domain;
  }

  // Standard: take last 2 labels
  return labels.slice(-2).join(".");
}

// ── Helpers — domain matching ─────────────────────────────────────────────────
//
// A ping from "app.example.com" is valid for a license issued for:
//   • "app.example.com"  (exact match)
//   • "example.com"      (root-domain match — customer installed on a subdomain)
//
// The JWT cross-check below prevents a valid JWT for an unrelated domain from
// passing even if a root-domain lookup accidentally finds the wrong row.

function domainMatchesLicense(pingDomain: string, licDomain: string, licRootDomain: string): boolean {
  if (pingDomain === licDomain) return true;
  if (licRootDomain) {
    if (pingDomain === licRootDomain) return true;
    if (pingDomain.endsWith("." + licRootDomain)) return true;
  }
  return false;
}

// ── POST /api/licenses/ping ───────────────────────────────────────────────────
// Fix #5: response is snake_case throughout to match license file format
// Fix #6: root_domain added
router.post("/ping", async (req, res) => {
  try {
    const { domain, signature, installation_id } = req.body;
    if (!domain || !signature) {
      res.status(400).json({ valid: false, message: "domain and signature required" }); return;
    }

    const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();

    // ── 1. Verify JWT signature ───────────────────────────────────────────────
    // Do this BEFORE the DB lookup so we reject garbage tokens cheaply.
    let decoded: any;
    try {
      decoded = jwt.verify(signature, LICENSE_SECRET);
    } catch {
      res.status(401).json({ valid: false, status: "invalid_signature", message: "License signature invalid or tampered" }); return;
    }

    // ── 2. Cross-check: JWT must have been issued for this domain ─────────────
    // This prevents a valid JWT for domain-A being replayed against domain-B.
    const jwtDomain     = (decoded.domain     ?? "").toLowerCase();
    const jwtRootDomain = (decoded.root_domain ?? "").toLowerCase();
    if (!domainMatchesLicense(cleanDomain, jwtDomain, jwtRootDomain)) {
      res.status(401).json({
        valid:   false,
        status:  "domain_mismatch",
        message: `License was issued for '${jwtDomain}', not '${cleanDomain}'`,
      }); return;
    }

    // ── 3. Look up license row ────────────────────────────────────────────────
    // Try exact domain match first; fall back to root-domain for subdomain installs.
    const rows = await db.select().from(licensesTable).where(eq(licensesTable.domain, cleanDomain)).limit(1);
    let lic = rows[0];

    if (!lic && cleanDomain.split(".").length > 2) {
      // Subdomain install (e.g. app.example.com) — find the root-domain license
      const root = computeRootDomain(cleanDomain);
      const rootRows = await db.select().from(licensesTable)
        .where(eq(licensesTable.rootDomain, root)).limit(1);
      lic = rootRows[0];
    }

    if (!lic) {
      res.status(404).json({ valid: false, status: "not_found", message: "No license found for this domain" }); return;
    }

    const status = computeStatus(lic);

    if (status === "revoked") {
      res.json({ valid: false, status: "revoked", message: "License revoked. Contact support." }); return;
    }
    if (status === "expired") {
      res.json({ valid: false, status: "expired", message: "License expired. Please renew." }); return;
    }

    // Extract the real client IP (respects X-Forwarded-For from a reverse proxy)
    const pingIp: string =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      ?? req.socket.remoteAddress
      ?? "";

    // ── Installation seat-limit enforcement ──────────────────────────────────
    // Each running instance sends a stable installation_id UUID.  We track all
    // known IDs in a JSON array on the license row and reject new IDs that would
    // push the count over the plan's installation limit.
    const planDef    = PLAN_DEFINITIONS.find((p) => p.id === lic.plan);
    const seatLimit  = planDef?.installations ?? 1;
    let   knownIds: string[] = [];
    try { knownIds = JSON.parse(lic.installationIds ?? "[]"); } catch { knownIds = []; }

    if (installation_id && typeof installation_id === "string") {
      const isKnown = knownIds.includes(installation_id);
      if (!isKnown) {
        // New installation ID — check if we're already at the limit.
        // Agency (seatLimit = 9_999_999) effectively means unlimited.
        if (seatLimit < 9_000_000 && knownIds.length >= seatLimit) {
          console.warn(
            `[LICENSE] Seat limit exceeded for lic #${lic.id} domain=${lic.domain}: ` +
            `limit=${seatLimit} known=${knownIds.length} new_id=${installation_id}`
          );
          res.json({
            valid:   false,
            status:  "installation_limit_exceeded",
            message: `Installation limit reached: your '${lic.plan}' plan allows ${seatLimit} installation${seatLimit === 1 ? "" : "s"}. ` +
                     `Remove an existing installation or upgrade your license via the ZeniPost Dashboard.`,
            limit:   seatLimit,
            used:    knownIds.length,
          });
          return;
        }
        // New ID within limit — record it.
        knownIds.push(installation_id);
      }
    }

    // Detect if this ping is coming from a different IP than the registered install.
    // We warn but never block — the customer may have moved servers legitimately.
    const mismatch =
      !!lic.installedIp &&
      !!pingIp &&
      pingIp !== lic.installedIp;

    if (mismatch) {
      console.warn(
        `[LICENSE] IP mismatch for lic #${lic.id} domain=${lic.domain}: ` +
        `installed=${lic.installedIp} ping=${pingIp}`
      );
    }

    await db.update(licensesTable)
      .set({
        lastPingAt:      new Date(),
        lastPingIp:      pingIp || null,
        pingCount:       sql`${licensesTable.pingCount} + 1`,
        ipMismatch:      mismatch ? true : lic.ipMismatch,  // sticky — stays true once flagged
        installationIds: JSON.stringify(knownIds),
        updatedAt:       new Date(),
      })
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
      root_domain:          lic.rootDomain ?? "",
      plan:                 lic.plan,
      emails_per_month:     lic.emailsPerMonth,
      subscribers_limit:    lic.subscribersLimit,
      features:             parseFeatures(lic.features),
      expires_at:           toISO(lic.expiresAt),
      admin_access_allowed: (lic.isManaged ?? false) && (lic.adminAccessEnabled ?? false),
      delivery,
      ip_mismatch:          mismatch,   // email app logs a warning when true
      message:              status === "expiring" ? "License expiring soon — please renew." : "License valid.",
    });
  } catch (err) {
    console.error("POST /licenses/ping error:", err);
    res.status(500).json({ valid: false, message: "Internal server error" });
  }
});

// ── GET /api/licenses/:id ─────────────────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const id   = parseIdParam(req.params.id);

    const rows = await db
      .select({ lic: licensesTable, customer: { id: usersTable.id, name: usersTable.name, email: usersTable.email, company: usersTable.company } })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.customerId, usersTable.id))
      .where(eq(licensesTable.id, id))
      .limit(1);

    if (!rows[0]) { res.status(404).json({ error: "Not Found", message: "License not found" }); return; }

    const { lic, customer } = rows[0];

    // Non-admin users may only see their own licenses
    if (user.role !== "admin" && lic.customerId !== user.id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const customerName = customer?.company ?? customer?.name ?? "Unknown";
    res.json({ license: formatLicense(lic, customerName) });
  } catch (err) {
    console.error("GET /licenses/:id error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── POST /api/licenses/:id/renew ──────────────────────────────────────────────
// Updates the expiry date and re-signs the license so the customer can download
// a fresh file. The email app picks up the new expiry on its next ping.
router.post("/:id/renew", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const { expiresAt } = req.body;

    if (!expiresAt) {
      res.status(400).json({ error: "Bad Request", message: "expiresAt is required" }); return;
    }

    const newExpiry = new Date(expiresAt);
    if (isNaN(newExpiry.getTime())) {
      res.status(400).json({ error: "Bad Request", message: "expiresAt is not a valid date" }); return;
    }
    if (newExpiry <= new Date()) {
      res.status(400).json({ error: "Bad Request", message: "expiresAt must be in the future" }); return;
    }

    const rows = await db
      .select({ lic: licensesTable, owner: { name: usersTable.name, email: usersTable.email, company: usersTable.company } })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.customerId, usersTable.id))
      .where(eq(licensesTable.id, id))
      .limit(1);

    if (!rows[0]) { res.status(404).json({ error: "Not Found", message: "License not found" }); return; }

    const { lic, owner } = rows[0];

    // Clear revokedAt if previously revoked so a renewal also un-revokes
    const [updated] = await db
      .update(licensesTable)
      .set({ expiresAt: newExpiry, revokedAt: null, updatedAt: new Date() })
      .where(eq(licensesTable.id, id))
      .returning();

    // Re-sign with the new expiry
    const licensePayload = buildLicensePayload(updated, owner);
    const signature      = signPayload(licensePayload);

    const [resigned] = await db
      .update(licensesTable)
      .set({ signature, updatedAt: new Date() })
      .where(eq(licensesTable.id, id))
      .returning();

    const customerName = owner?.company ?? owner?.name ?? "Unknown";
    res.json({
      message: `License renewed. New expiry: ${newExpiry.toISOString().slice(0, 10)}`,
      license: formatLicense(resigned, customerName),
    });
  } catch (err) {
    console.error("POST /licenses/:id/renew error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;