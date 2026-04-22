// artifacts/api-server/src/routes/domains.ts  (FULL REPLACEMENT)
//
// Change: POST /api/domains/:id/license (v1 format) is REMOVED.
//   - v1 had different field names (licenseKey, licensee{}, camelCase dates)
//   - All license downloads now go through GET /api/portal/license/:id/download
//     which uses the canonical v2 format via buildLicensePayload()
//   - Domains table still exists for the domain registration + verification flow
//   - licenseKey column kept in DB for backwards compat but no longer exposed in new downloads

import { Router } from "express";
import { db, domainsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

function parseIdParam(value: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseInt(raw, 10);
}

// GET /api/domains — list domains for current user (admin sees all)
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const condition = user.role === "admin" ? undefined : eq(domainsTable.userId, user.id);

    const domains = condition
      ? await db.select().from(domainsTable).where(condition).orderBy(domainsTable.createdAt)
      : await db.select().from(domainsTable).orderBy(domainsTable.createdAt);

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

    res.status(201).json({ domain: newDomain });
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