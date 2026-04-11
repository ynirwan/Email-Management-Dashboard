import { Router } from "express";
import { db, usersTable, licensesTable, domainsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import jwt from "jsonwebtoken";
import { PLAN_DEFINITIONS } from "./plans.js";

const router = Router();
const LICENSE_SECRET = process.env["LICENSE_SECRET"] || "zenipost-license-secret-2026";

function parseIdParam(value: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseInt(raw, 10);
}

function parseFeatures(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function computeStatus(expiresAt: Date | string, revokedAt: Date | string | null) {
  if (revokedAt) return "revoked";
  const now      = Date.now();
  const expires  = new Date(expiresAt).getTime();
  if (expires < now) return "expired";
  const daysLeft = (expires - now) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 30) return "expiring";
  return "active";
}

// ── GET /api/portal — full customer snapshot ──────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    // License tied to this customer
    const licenseRows = await db
      .select()
      .from(licensesTable)
      .where(eq(licensesTable.customerId, user.id))
      .orderBy(licensesTable.createdAt)
      .limit(5);

    const licenses = licenseRows.map((l) => ({
      ...l,
      features: parseFeatures(l.features),
      status:   computeStatus(l.expiresAt, l.revokedAt),
      expiresAt: l.expiresAt instanceof Date ? l.expiresAt.toISOString() : l.expiresAt,
      issuedAt:  l.issuedAt  instanceof Date ? l.issuedAt.toISOString()  : l.issuedAt,
      revokedAt: l.revokedAt ? (l.revokedAt instanceof Date ? l.revokedAt.toISOString() : l.revokedAt) : null,
      lastPingAt: l.lastPingAt ? (l.lastPingAt instanceof Date ? l.lastPingAt.toISOString() : l.lastPingAt) : null,
    }));

    // Domains registered by this user
    const domainRows = await db
      .select()
      .from(domainsTable)
      .where(eq(domainsTable.userId, user.id));

    const domains = domainRows.map((d) => ({
      ...d,
      expiresAt:  d.expiresAt  ? (d.expiresAt  instanceof Date ? d.expiresAt.toISOString()  : d.expiresAt)  : null,
      createdAt:  d.createdAt  instanceof Date  ? d.createdAt.toISOString()  : d.createdAt,
    }));

    // Plan limits
    const PLAN_LIMITS: Record<string, { emailsLimit: number; subscribersLimit: number; price: number }> = Object.fromEntries(
      PLAN_DEFINITIONS.map((plan) => [
        plan.id,
        { emailsLimit: plan.emailsPerMonth, subscribersLimit: plan.subscribersLimit, price: plan.price },
      ])
    );

    const planInfo = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.starter;

    res.json({
      user: {
        id:              user.id,
        name:            user.name,
        email:           user.email,
        company:         user.company,
        plan:            user.plan,
        isActive:        user.isActive,
        emailsUsed:      user.emailsUsed,
        emailsLimit:     user.emailsLimit,
        subscribersUsed: user.subscribersUsed,
        subscribersLimit: user.subscribersLimit,
        createdAt:       user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
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

// ── GET /api/portal/license/:id/download — download signed license file ───────
router.get("/license/:id/download", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const id   = parseIdParam(req.params.id);

    const rows = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
    const lic  = rows[0];

    if (!lic) {
      res.status(404).json({ error: "Not Found", message: "License not found" });
      return;
    }

    // Only allow the owner or admin to download
    if (lic.customerId !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Not your license" });
      return;
    }

    const userRows = await db.select().from(usersTable).where(eq(usersTable.id, lic.customerId)).limit(1);
    const owner    = userRows[0];

    const payload = {
      license_id:        `lic_${lic.id}`,
      domain:            lic.domain,
      customer_id:       lic.customerId,
      customer_name:     owner?.company ?? owner?.name ?? "Unknown",
      customer_email:    owner?.email ?? "",
      plan:              lic.plan,
      emails_per_month:  lic.emailsPerMonth,
      subscribers_limit: lic.subscribersLimit,
      features:          parseFeatures(lic.features),
      issued_at:         lic.issuedAt  instanceof Date ? lic.issuedAt.toISOString()  : lic.issuedAt,
      expires_at:        lic.expiresAt instanceof Date ? lic.expiresAt.toISOString() : lic.expiresAt,
      product:           "ZeniPost Email Platform",
      version:           "2.0",
      ping_url:          `${process.env["APP_URL"] ?? "https://your-dashboard.com"}/api/licenses/ping`,
    };

    const signature = jwt.sign(payload, LICENSE_SECRET, { algorithm: "HS256" });

    const licenseFile = {
      ...payload,
      signature,
      format: "zenipost-license-v2",
    };

    res.setHeader("Content-Disposition", `attachment; filename="zenipost-license-${lic.domain}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(licenseFile);
  } catch (err) {
    console.error("License download error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to generate license file" });
  }
});

export default router;
