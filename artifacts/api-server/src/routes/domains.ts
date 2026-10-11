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
import { and, eq, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { DEFAULT_LICENSE_LIMITS } from "./plans.js";
import { buildLicensePayload } from "../lib/license-builder.js";
import jwt from "jsonwebtoken";
import { LICENSE_SECRET } from "../lib/signing-secrets.js";
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

class DomainRequestError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

async function lockDomain(tx: any, domain: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${domain}, 0))`);
}

function makeVerificationRecord(domain: string, token: string, expiresAt: Date | string) {
  return {
    type: "TXT" as const,
    host: `_zenipost-verification.${domain}`,
    value: `zenipost-verification=${token}`,
    expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : String(expiresAt),
  };
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
      const licenseCondition = user.role === "admin"
        ? inArray(licensesTable.domain, names)
        : and(inArray(licensesTable.domain, names), eq(licensesTable.customerId, user.id));
      const licRows = await db
        .select()
        .from(licensesTable)
        .where(licenseCondition);
      for (const l of licRows) licMap[l.domain] = l;
    }

    const domains = domainRows.map((d) => {
      const lic = licMap[d.domain] ?? null;
      return {
        id:               d.id,
        domain:           d.domain,
        rootDomain:       lic?.rootDomain ?? "",
        isVerified:       d.isVerified,
        verificationRecord: !d.isVerified && d.verificationToken && d.verificationExpiresAt
          ? makeVerificationRecord(d.domain, d.verificationToken, d.verificationExpiresAt)
          : null,
        // License data — null when no license has been issued for this domain yet
        licenseId:        d.isVerified ? lic?.id ?? null : null,
        plan:             d.isVerified ? lic?.plan ?? null : null,
        status:           lic ? computeLicenseStatus(lic) : "pending",
        isActivated:      d.isVerified ? lic?.isActivated ?? false : false,
        isManaged:        d.isVerified ? lic?.isManaged ?? false : false,
        expiresAt:        lic?.expiresAt
          ? toISO(lic.expiresAt)
          : d.expiresAt
            ? toISO(d.expiresAt)
            : null,
        lastPingAt:       lic?.lastPingAt ? toISO(lic.lastPingAt) : null,
        pingCount:        lic?.pingCount ?? 0,
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

    const challengeToken = randomBytes(32).toString("hex");
    const challengeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const result = await db.transaction(async (tx) => {
      await lockDomain(tx, cleanDomain);
      const claims = await tx.select().from(domainsTable).where(eq(domainsTable.domain, cleanDomain));
      if (claims.some((claim) => claim.userId !== user.id)) {
        throw new DomainRequestError(409, "This domain is already associated with another account.");
      }

      const existingLicenses = await tx.select().from(licensesTable)
        .where(eq(licensesTable.domain, cleanDomain)).limit(1);
      const existingLicense = existingLicenses[0];
      if (existingLicense && existingLicense.customerId !== user.id) {
        throw new DomainRequestError(409, "This domain is already associated with another account.");
      }

      const existingClaim = claims.find((claim) => claim.userId === user.id);
      if (existingClaim?.isVerified) {
        return { domain: existingClaim, licenseId: existingLicense?.id ?? null };
      }

      const claim = existingClaim
        ? (await tx.update(domainsTable)
            .set({
              verificationToken: challengeToken,
              verificationExpiresAt: challengeExpiresAt,
              isVerified: false,
            })
            .where(eq(domainsTable.id, existingClaim.id))
            .returning())[0]
        : (await tx.insert(domainsTable).values({
            userId: user.id,
            domain: cleanDomain,
            licenseKey: "",
            isVerified: false,
            verificationToken: challengeToken,
            verificationExpiresAt: challengeExpiresAt,
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          }).returning())[0];

      return { domain: claim, licenseId: null };
    });

    const isVerified = result.domain.isVerified;
    res.status(isVerified ? 200 : 201).json({
      domain: result.domain,
      licenseId: result.licenseId,
      verificationRecord: !isVerified && result.domain.verificationToken && result.domain.verificationExpiresAt
        ? makeVerificationRecord(cleanDomain, result.domain.verificationToken, result.domain.verificationExpiresAt)
        : null,
    });
  } catch (err) {
    if (err instanceof DomainRequestError) {
      res.status(err.statusCode).json({ error: "Conflict", message: err.message });
      return;
    }
    console.error("Add domain error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to add domain" });
  }
});

// POST /api/domains/:id/verify-ownership — verify the customer's DNS TXT challenge.
router.post("/:id/verify-ownership", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseIdParam(req.params.id);
    const rows = await db.select().from(domainsTable).where(eq(domainsTable.id, id)).limit(1);
    const domain = rows[0];

    if (!domain) {
      res.status(404).json({ error: "Not Found", message: "Domain not found" });
      return;
    }
    if (domain.userId !== user.id) {
      res.status(403).json({ error: "Forbidden", message: "You don't own this domain claim" });
      return;
    }
    if (domain.isVerified) {
      res.json({ message: "Domain ownership is already verified" });
      return;
    }
    if (
      !domain.verificationToken ||
      !domain.verificationExpiresAt ||
      new Date(domain.verificationExpiresAt).getTime() < Date.now()
    ) {
      res.status(410).json({ error: "Gone", message: "The verification code expired. Refresh the code and try again." });
      return;
    }

    const expectedValue = `zenipost-verification=${domain.verificationToken}`;
    let txtRecords: string[][];
    try {
      txtRecords = await resolveTxt(`_zenipost-verification.${domain.domain}`);
    } catch {
      res.status(400).json({ error: "Verification Pending", message: "The required DNS TXT record was not found yet." });
      return;
    }
    if (!txtRecords.some((record) => record.join("") === expectedValue)) {
      res.status(400).json({ error: "Verification Pending", message: "The required DNS TXT record was not found yet." });
      return;
    }

    const result = await db.transaction(async (tx) => {
      await lockDomain(tx, domain.domain);
      const currentRows = await tx.select().from(domainsTable).where(eq(domainsTable.id, id)).limit(1);
      const current = currentRows[0];
      if (!current || current.userId !== user.id) {
        throw new DomainRequestError(404, "Domain claim not found.");
      }
      if (current.isVerified) {
        const ownedLicenses = await tx.select({ id: licensesTable.id }).from(licensesTable)
          .where(and(eq(licensesTable.domain, current.domain), eq(licensesTable.customerId, user.id))).limit(1);
        return { licenseId: ownedLicenses[0]?.id ?? null, alreadyVerified: true };
      }
      if (
        current.verificationToken !== domain.verificationToken ||
        !current.verificationExpiresAt ||
        new Date(current.verificationExpiresAt).getTime() < Date.now()
      ) {
        throw new DomainRequestError(409, "The verification code changed or expired. Refresh the code and try again.");
      }

      const claims = await tx.select().from(domainsTable).where(eq(domainsTable.domain, current.domain));
      if (claims.some((claim) => claim.userId !== user.id)) {
        throw new DomainRequestError(409, "This domain is already associated with another account.");
      }

      const existingLicenses = await tx.select().from(licensesTable)
        .where(eq(licensesTable.domain, current.domain)).limit(1);
      let license = existingLicenses[0];
      if (license && license.customerId !== user.id) {
        throw new DomainRequestError(409, "This domain is already associated with another account.");
      }

      if (!license) {
        const userRows = await tx.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
        const owner = userRows[0];
        if (!owner) throw new DomainRequestError(404, "Account not found.");

        const userPlan = (owner.plan ?? "starter") as "starter" | "pro" | "agency";
        const [created] = await tx.insert(licensesTable).values({
          customerId: user.id,
          domain: current.domain,
          rootDomain: computeRootDomain(current.domain),
          plan: userPlan,
          emailsPerMonth: DEFAULT_LICENSE_LIMITS.emailsPerMonth,
          subscribersLimit: DEFAULT_LICENSE_LIMITS.subscribersLimit,
          features: JSON.stringify(PLAN_FEATURE_FLAGS[userPlan] ?? PLAN_FEATURE_FLAGS.starter),
          signature: "",
          expiresAt: current.expiresAt ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActivated: false,
        }).returning();

        const payload = buildLicensePayload(created, owner);
        const signature = jwt.sign(payload, LICENSE_SECRET, { algorithm: "HS256" });
        [license] = await tx.update(licensesTable)
          .set({ signature })
          .where(eq(licensesTable.id, created.id))
          .returning();
      }

      await tx.update(domainsTable).set({
        isVerified: true,
        verificationToken: null,
        verificationExpiresAt: null,
      }).where(eq(domainsTable.id, id));

      return { licenseId: license.id, alreadyVerified: false };
    });

    res.json({
      message: result.alreadyVerified ? "Domain ownership is already verified" : "Domain ownership verified.",
      licenseId: result.licenseId,
    });
  } catch (err) {
    if (err instanceof DomainRequestError) {
      res.status(err.statusCode).json({ error: "Domain Verification Failed", message: err.message });
      return;
    }
    console.error("Verify domain ownership error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to verify domain ownership" });
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

    await db.transaction(async (tx) => {
      await lockDomain(tx, domain.domain);
      const ownedLicenses = await tx.select({ id: licensesTable.id }).from(licensesTable)
        .where(and(
          eq(licensesTable.domain, domain.domain),
          eq(licensesTable.customerId, domain.userId),
        )).limit(1);
      if (ownedLicenses[0]) {
        await tx.delete(licensesTable)
          .where(and(
            eq(licensesTable.id, ownedLicenses[0].id),
            eq(licensesTable.customerId, domain.userId),
          ));
      }
      await tx.delete(domainsTable).where(eq(domainsTable.id, id));
    });
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
      .set({
        isVerified: true,
        verificationToken: null,
        verificationExpiresAt: null,
      })
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