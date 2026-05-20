// artifacts/api-server/src/routes/domains.ts  (FULL REPLACEMENT)
//
// Change: POST /api/domains/:id/license (v1 format) is REMOVED.
//   - v1 had different field names (licenseKey, licensee{}, camelCase dates)
//   - All license downloads now go through GET /api/portal/license/:id/download
//     which uses the canonical v2 format via buildLicensePayload()
//   - Domains table still exists for the domain registration + verification flow
//   - licenseKey column kept in DB for backwards compat but no longer exposed in new downloads

import { Router } from "express";
import { db, domainsTable, usersTable, licensesTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { PLAN_DEFINITIONS } from "./plans.js";
import { PLAN_FEATURE_FLAGS } from "@workspace/db/schema/feature-flags.js";

const router = Router();

function parseIdParam(value: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseInt(raw, 10);
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function toISO(v: any): string {
  if (!v) return new Date().toISOString();
  return v instanceof Date ? v.toISOString() : String(v);
}

function computeLicenseStatus(lic: any): "active" | "expiring" | "revoked" | "expired" {
  if (lic.revokedAt) return "revoked";
  const now     = Date.now();
  const expires = new Date(lic.expiresAt).getTime();
  if (expires < now) return "expired";
  if ((expires - now) / (1000 * 60 * 60 * 24) <= 30) return "expiring";
  return "active";
}

function computeRootDomain(domain: string): string {
  const labels = domain.split(".");
  return labels.length >= 2 ? labels.slice(-2).join(".") : domain;
}

// GET /api/domains — list domains for current user (admin sees all),
// merged with license data from licensesTable keyed by domain name.
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const condition = user.role === "admin" ? undefined : eq(domainsTable.userId, user.id);

    const domainRows = condition
      ? await db.select().from(domainsTable).where(condition).orderBy(domainsTable.createdAt)
      : await db.select().from(domainsTable).orderBy(domainsTable.createdAt);

    // Fetch matching licenses in one query, keyed by domain name
    let licMap: Record<string, any> = {};
    if (domainRows.length > 0) {
      const names = domainRows.map((d) => d.domain);
      const licRows = await db
        .select()
        .from(licensesTable)
        .where(inArray(licensesTable.domain, names));
      for (const l of licRows) licMap[l.domain] = l;
    }

    const domains = domainRows.map((d) => {
      const lic = licMap[d.domain] ?? null;
      return {
        id:               d.id,
        domain:           d.domain,
        rootDomain:       lic?.rootDomain ?? "",
        isVerified:       d.isVerified,
        // License data — null when no license has been issued for this domain yet
        licenseId:        lic?.id         ?? null,
        plan:             lic?.plan        ?? null,
        emailsPerMonth:   lic?.emailsPerMonth   ?? null,
        subscribersLimit: lic?.subscribersLimit ?? null,
        status:           lic ? computeLicenseStatus(lic) : "pending",
        isActivated:      lic?.isActivated ?? false,
        isManaged:        lic?.isManaged ?? false,
        expiresAt:        lic?.expiresAt
          ? toISO(lic.expiresAt)
          : d.expiresAt
            ? toISO(d.expiresAt)
            : null,
        lastPingAt:       lic?.lastPingAt ? toISO(lic.lastPingAt) : null,
        createdAt:        toISO(d.createdAt),
      };
    });

    res.json({ domains });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch domains" });
  }
});

// POST /api/domains — register a new domain
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { domain } = req.body;

    if (!domain || typeof domain !== "string") {
      res.status(400).json({ error: "Bad Request", message: "Domain name is required" }); return;
    }

    const cleanDomain = domain
      .replace(/^https?:\/\//i, "")
      .replace(/\/.*$/, "")
      .toLowerCase()
      .trim();

    if (!cleanDomain || !/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(cleanDomain)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid domain name. Example: mail.yourcompany.com" }); return;
    }

    const existing = await db
      .select()
      .from(domainsTable)
      .where(and(eq(domainsTable.userId, user.id), eq(domainsTable.domain, cleanDomain)))
      .limit(1);

    if (existing[0]) {
      res.status(400).json({ error: "Conflict", message: "Domain already registered to your account" }); return;
    }

    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const [newDomain] = await db.insert(domainsTable).values({
      userId:     user.id,
      domain:     cleanDomain,
      licenseKey: "",        // deprecated field, kept for schema compat
      isVerified: false,
      expiresAt,
    }).returning();

    // Auto-create a license in licensesTable so the user can download immediately.
    // Use the plan limits from the user's current subscription tier.
    const userRows = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    const fullUser = userRows[0];
    const userPlan = (fullUser?.plan ?? "starter") as "starter" | "pro" | "agency";
    const planDef  = PLAN_DEFINITIONS.find((p) => p.id === userPlan)
                  ?? PLAN_DEFINITIONS.find((p) => p.id === "starter");

    const rootDomain = computeRootDomain(cleanDomain);

    // Only create a license if one doesn't already exist for this domain
    const existingLic = await db
      .select({ id: licensesTable.id })
      .from(licensesTable)
      .where(eq(licensesTable.domain, cleanDomain))
      .limit(1);

    let licenseId: number | null = null;
    if (!existingLic[0]) {
      const [newLic] = await db.insert(licensesTable).values({
        customerId:       user.id,
        domain:           cleanDomain,
        rootDomain,
        plan:             userPlan,
        emailsPerMonth:   planDef?.emailsPerMonth   ?? 100000,
        subscribersLimit: planDef?.subscribersLimit ?? 25000,
        features:         JSON.stringify(PLAN_FEATURE_FLAGS[userPlan] ?? PLAN_FEATURE_FLAGS["starter"]),
        signature:        "",
        expiresAt,
        // Locked until admin confirms payment and activates via PATCH /licenses/:id/activate
        isActivated:      false,
      }).returning();
      licenseId = newLic?.id ?? null;
    } else {
      licenseId = existingLic[0].id;
    }

    res.status(201).json({ domain: newDomain, licenseId });
  } catch (err) {
    console.error("Add domain error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to add domain" });
  }
});

// DELETE /api/domains/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const id   = parseIdParam(req.params.id);

    const domains = await db.select().from(domainsTable).where(eq(domainsTable.id, id)).limit(1);
    const domain  = domains[0];

    if (!domain) {
      res.status(404).json({ error: "Not Found", message: "Domain not found" }); return;
    }
    if (domain.userId !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "You don't own this domain" }); return;
    }

    await db.delete(domainsTable).where(eq(domainsTable.id, id));
    res.json({ message: "Domain removed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete domain" });
  }
});

// PATCH /api/domains/:id/verify — admin marks domain as verified
router.patch("/:id/verify", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin only" }); return;
    }
    const id = parseIdParam(req.params.id);
    const [updated] = await db
      .update(domainsTable)
      .set({ isVerified: true })
      .where(eq(domainsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ domain: updated });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── REMOVED: POST /api/domains/:id/license ────────────────────────────────────
// This route generated license files in the old v1 format (different field names,
// licenseKey, camelCase dates, licensee{} wrapper).
// It has been replaced by GET /api/portal/license/:id/download which uses the
// canonical v2 format consistent with the email app's expectations.
// ─────────────────────────────────────────────────────────────────────────────

export default router;