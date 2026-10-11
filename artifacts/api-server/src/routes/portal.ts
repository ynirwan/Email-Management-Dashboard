// artifacts/api-server/src/routes/portal.ts
//
// Customer-facing portal: dashboard snapshot + license file download.
//
// License file generation delegates to the shared buildLicensePayload() in
// lib/license-builder.ts — the single source of truth for the v2 JWT schema.
// Admin downloads go through /api/licenses/:id/download (licenses.ts).

import { Router } from "express";
import { db, licensesTable, usersTable, domainsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import jwt from "jsonwebtoken";
import { buildLicensePayload } from "../lib/license-builder.js";
import { LICENSE_SECRET } from "../lib/signing-secrets.js";
import { PLAN_DEFINITIONS } from "./plans.js";

const router = Router();

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

// buildLicensePayload is imported from ../lib/license-builder.ts — single source of truth.

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
      isActivated:         l.isActivated ?? true,
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

    const planInfo = {
      // These account-level quotas may be customized by an administrator.
      // They are not implied by the one-time software license tier.
      emailsLimit: fullUser.emailsLimit,
      subscribersLimit: fullUser.subscribersLimit,
      price: PLAN_DEFINITIONS.find((plan) => plan.id === fullUser.plan)?.price ?? 0,
    };

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

    // Block download if not yet activated (payment not confirmed by admin).
    if (!lic.isActivated) {
      res.status(403).json({
        error:   "Forbidden",
        message: "Your license is pending activation. Please complete payment and wait for admin confirmation.",
        code:    "LICENSE_NOT_ACTIVATED",
      });
      return;
    }

    // Block download of a revoked license — revokedAt is set by admin via PATCH /licenses/:id/revoke.
    // The running email-app detects revocation via ping, but a re-download of the JWT file would
    // bypass that mechanism and produce a self-contained valid credential.
    if (lic.revokedAt) {
      res.status(403).json({
        error:   "Forbidden",
        message: "This license has been revoked and cannot be downloaded. Contact support if you believe this is an error.",
        code:    "LICENSE_REVOKED",
      });
      return;
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