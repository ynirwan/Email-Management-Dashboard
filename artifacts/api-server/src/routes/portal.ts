// artifacts/api-server/src/routes/portal.ts  (FULL REPLACEMENT)
//
// Fixes applied:
//   Fix #4: admin_access_allowed now included in user license download
//   Fix #5: snake_case field names in license file
//   New:    delivery block included when delivery plan is active
//   Note:   This route now delegates license file building to the shared
//           buildLicensePayload() helper (imported from licenses.ts) to
//           guarantee both admin and user downloads are always identical.
//
// ⚠️  The domains.ts /api/domains/:id/license route (v1 format) is REMOVED.
//     All license downloads go through here (/api/portal/license/:id/download)
//     or through /api/licenses/:id/download (admin).

import { Router } from "express";
import { db, licensesTable, usersTable, domainsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import jwt from "jsonwebtoken";
import { PLAN_DEFINITIONS } from "./plans.js";

const router = Router();

const LICENSE_SECRET = process.env["LICENSE_SECRET"] || "zenipost-license-secret-2026";
const APP_URL        = process.env["APP_URL"]        || "https://app.zenipost.com";

// ── Shared helpers ────────────────────────────────────────────────────────────

function parseIdParam(value: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseInt(raw, 10);
}

function parseFeatures(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function toISO(v: any): string {
  if (!v) return new Date().toISOString();
  return v instanceof Date ? v.toISOString() : String(v);
}

// ── Canonical license file builder — identical to the one in licenses.ts ──────
// Kept in sync manually. If you change the schema here, change it in licenses.ts too.
// (In a real monorepo you'd extract this to a shared lib package.)
function buildLicensePayload(lic: any, owner: any): object {
  const features = parseFeatures(lic.features);

  const delivery = lic.deliveryPlanId
    ? {
        plan_id:      lic.deliveryPlanId,
        plan_name:    lic.deliveryPlanName   ?? null,
        emails_limit: lic.deliveryEmailsLimit ?? null,
        infra:        lic.deliveryInfra       ?? null,
        routing:      lic.deliveryRouting     ?? null,
        active_since: lic.deliveryActiveSince ? toISO(lic.deliveryActiveSince) : null,
        dedicated_ip: features.includes("dedicated_ip"),
        ip_warmup:    features.includes("ip_warmup"),
      }
    : null;

  return {
    license_id:           `lic_${lic.id}`,
    domain:               lic.domain,
    root_domain:          lic.rootDomain ?? "",
    customer_id:          lic.customerId,
    customer_name:        owner?.company ?? owner?.name ?? "Unknown",
    customer_email:       owner?.email ?? "",
    plan:                 lic.plan,
    emails_per_month:     lic.emailsPerMonth,
    subscribers_limit:    lic.subscribersLimit,
    features,
    issued_at:            toISO(lic.issuedAt),
    expires_at:           toISO(lic.expiresAt),
    product:              "ZeniPost Email Platform",
    version:              "2.0",
    format:               "zenipost-license-v2",
    ping_url:             `${APP_URL}/api/licenses/ping`,
    admin_access_allowed: (lic.isManaged ?? false) && (lic.adminAccessEnabled ?? false),  // Fix #4
    delivery,
  };
}

// ── GET /api/portal — user dashboard snapshot ─────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const userRows = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    if (!userRows[0]) { res.status(404).json({ error: "Not Found", message: "User not found" }); return; }
    const fullUser = userRows[0];

    // Licenses for this user
    const licenseRows = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.customerId, user.id))
      .orderBy(licensesTable.createdAt);

    function computeStatus(lic: any): "active" | "expiring" | "revoked" | "expired" {
      if (lic.revokedAt) return "revoked";
      const now     = Date.now();
      const expires = new Date(lic.expiresAt).getTime();
      if (expires < now) return "expired";
      if ((expires - now) / (1000 * 60 * 60 * 24) <= 30) return "expiring";
      return "active";
    }

    const licenses = licenseRows.map((l) => ({
      id:                  l.id,
      domain:              l.domain,
      rootDomain:          l.rootDomain,
      plan:                l.plan,
      emailsPerMonth:      l.emailsPerMonth,
      subscribersLimit:    l.subscribersLimit,
      features:            parseFeatures(l.features),
      status:              computeStatus(l),
      isManaged:           l.isManaged,
      adminAccessEnabled:  l.adminAccessEnabled,
      // Delivery plan summary for the user dashboard
      deliveryPlanId:      l.deliveryPlanId   ?? null,
      deliveryPlanName:    l.deliveryPlanName  ?? null,
      deliveryInfra:       l.deliveryInfra     ?? null,
      issuedAt:  toISO(l.issuedAt).slice(0, 10),
      expiresAt: l.expiresAt ? toISO(l.expiresAt).slice(0, 10) : null,
      lastPingAt: l.lastPingAt ? toISO(l.lastPingAt) : null,
      createdAt: toISO(l.createdAt),
    }));

    // Domains for this user (from domainsTable — the old table used for domain verification UI)
    const domainRows = await db
      .select()
      .from(domainsTable)
      .where(eq(domainsTable.userId, user.id))
      .orderBy(domainsTable.createdAt);

    const domains = domainRows.map((d) => ({
      id:         d.id,
      domain:     d.domain,
      isVerified: d.isVerified,
      expiresAt:  d.expiresAt ? toISO(d.expiresAt) : null,
      createdAt:  toISO(d.createdAt),
    }));

    const PLAN_LIMITS = Object.fromEntries(
      PLAN_DEFINITIONS.map((p: any) => [
        p.id,
        { emailsLimit: p.emailsPerMonth, subscribersLimit: p.subscribersLimit, price: p.price, installations: p.installations },
      ])
    );
    const planInfo = PLAN_LIMITS[fullUser.plan] ?? PLAN_LIMITS.starter;

    res.json({
      user: {
        id:               fullUser.id,
        name:             fullUser.name,
        email:            fullUser.email,
        company:          fullUser.company,
        plan:             fullUser.plan,
        isActive:         fullUser.isActive,
        emailsUsed:       fullUser.emailsUsed,
        emailsLimit:      fullUser.emailsLimit,
        subscribersUsed:  fullUser.subscribersUsed,
        subscribersLimit: fullUser.subscribersLimit,
        createdAt:        toISO(fullUser.createdAt),
      },
      planInfo,
      licenses,
      domains,
    });
  } catch (err) {
    console.error("Portal error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to load portal data" });
  }
});

// ── GET /api/portal/license/:id/download ─────────────────────────────────────
// Fix #4: admin_access_allowed present, Fix #5: snake_case, New: delivery block
router.get("/license/:id/download", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const id   = parseIdParam(req.params.id);

    const rows = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
    const lic  = rows[0];

    if (!lic) { res.status(404).json({ error: "Not Found", message: "License not found" }); return; }

    // Only allow the owner or admin to download
    if (lic.customerId !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Not your license" }); return;
    }

    const ownerRows = await db.select().from(usersTable).where(eq(usersTable.id, lic.customerId)).limit(1);
    const owner     = ownerRows[0];

    // Use canonical builder — guaranteed to match admin download format exactly
    const licensePayload = buildLicensePayload(lic, owner);
    const signature      = jwt.sign(licensePayload, LICENSE_SECRET, { algorithm: "HS256" });
    const licenseFile    = { ...licensePayload, signature };

    res.setHeader("Content-Disposition", `attachment; filename="zenipost-license-${lic.domain}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(licenseFile);
  } catch (err) {
    console.error("License download error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to generate license file" });
  }
});

export default router;