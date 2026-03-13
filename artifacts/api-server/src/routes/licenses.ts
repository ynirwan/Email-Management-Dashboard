import { Router } from "express";
import { db, licensesTable, usersTable } from "@workspace/db";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import jwt from "jsonwebtoken";

const router = Router();

const LICENSE_SECRET = process.env["LICENSE_SECRET"] || "zenipost-license-secret-2026";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    issuedAt:      lic.issuedAt instanceof Date  ? lic.issuedAt.toISOString().slice(0, 10)  : lic.issuedAt,
    expiresAt:     lic.expiresAt instanceof Date ? lic.expiresAt.toISOString().slice(0, 10) : lic.expiresAt,
    revokedAt:     lic.revokedAt ? (lic.revokedAt instanceof Date ? lic.revokedAt.toISOString() : lic.revokedAt) : null,
    lastPingAt:    lic.lastPingAt ? (lic.lastPingAt instanceof Date ? lic.lastPingAt.toISOString() : lic.lastPingAt) : null,
  };
}

// ── GET /api/licenses — list all (admin only) ─────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin only" });
      return;
    }

    const { page = "1", limit = "50", search = "", status = "" } = req.query as Record<string, string>;
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const offset   = (pageNum - 1) * limitNum;

    // Join with users to get customerName
    const rows = await db
      .select({
        license: licensesTable,
        customerName: usersTable.name,
        customerCompany: usersTable.company,
      })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.customerId, usersTable.id))
      .orderBy(sql`${licensesTable.createdAt} DESC`)
      .limit(limitNum)
      .offset(offset);

    let licenses = rows.map((r) =>
      formatLicense(r.license, r.customerCompany ?? r.customerName ?? undefined)
    );

    // Client-side filter (search + status) — simple for now
    if (search) {
      const q = search.toLowerCase();
      licenses = licenses.filter(
        (l) =>
          (l.customerName ?? "").toLowerCase().includes(q) ||
          l.domain.toLowerCase().includes(q),
      );
    }
    if (status) {
      licenses = licenses.filter((l) => l.status === status);
    }

    const totalRows = await db.select({ count: sql<number>`count(*)` }).from(licensesTable);
    const total = Number(totalRows[0]?.count ?? 0);

    res.json({ licenses, total, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("GET /licenses error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch licenses" });
  }
});

// ── GET /api/licenses/:id ─────────────────────────────────────────────────────
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin only" });
      return;
    }
    const id = parseInt(req.params.id);
    const rows = await db
      .select({ license: licensesTable, customerName: usersTable.name, customerCompany: usersTable.company })
      .from(licensesTable)
      .leftJoin(usersTable, eq(licensesTable.customerId, usersTable.id))
      .where(eq(licensesTable.id, id))
      .limit(1);

    if (!rows[0]) {
      res.status(404).json({ error: "Not Found", message: "License not found" });
      return;
    }
    const r = rows[0];
    res.json({ license: formatLicense(r.license, r.customerCompany ?? r.customerName ?? undefined) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch license" });
  }
});

// ── POST /api/licenses/generate — create & sign a new license ────────────────
router.post("/generate", requireAuth, async (req, res) => {
  try {
    const admin = (req as any).user;
    if (admin.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin only" });
      return;
    }

    const { customerId, domain, plan, emailsPerMonth, subscribersLimit, features, expiresAt } = req.body;

    if (!customerId || !domain || !plan || !expiresAt) {
      res.status(400).json({ error: "Bad Request", message: "customerId, domain, plan, expiresAt are required" });
      return;
    }

    // Clean and validate domain
    const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();
    if (!cleanDomain || !/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(cleanDomain)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid domain. Example: app.customer.com" });
      return;
    }

    // Verify customer exists
    const customers = await db.select().from(usersTable).where(eq(usersTable.id, customerId)).limit(1);
    if (!customers[0]) {
      res.status(404).json({ error: "Not Found", message: "Customer not found" });
      return;
    }
    const customer = customers[0];

    // Check domain not already licensed
    const existing = await db.select().from(licensesTable).where(eq(licensesTable.domain, cleanDomain)).limit(1);
    if (existing[0]) {
      res.status(409).json({ error: "Conflict", message: `Domain ${cleanDomain} already has a license (id: ${existing[0].id})` });
      return;
    }

    const featuresJson = JSON.stringify(Array.isArray(features) ? features : []);
    const expiresDate  = new Date(expiresAt);

    // Build the license payload that will be signed
    const licensePayload = {
      domain:           cleanDomain,
      customerId:       customer.id,
      customerName:     customer.company ?? customer.name,
      customerEmail:    customer.email,
      plan,
      emailsPerMonth:   emailsPerMonth ?? 500,
      subscribersLimit: subscribersLimit ?? 500,
      features:         Array.isArray(features) ? features : [],
      issuedAt:         new Date().toISOString(),
      expiresAt:        expiresDate.toISOString(),
      product:          "ZeniPost Email Platform",
      version:          "2.0",
    };

    const signature = signLicense(licensePayload);

    const [newLicense] = await db.insert(licensesTable).values({
      customerId:       customer.id,
      domain:           cleanDomain,
      plan,
      emailsPerMonth:   emailsPerMonth ?? 500,
      subscribersLimit: subscribersLimit ?? 500,
      features:         featuresJson,
      status:           "active",
      signature,
      expiresAt:        expiresDate,
    }).returning();

    res.status(201).json({
      license:   formatLicense(newLicense, customer.company ?? customer.name),
      payload:   licensePayload,
      signature,
    });
  } catch (err) {
    console.error("POST /licenses/generate error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to generate license" });
  }
});

// ── POST /api/licenses/revoke/:id ─────────────────────────────────────────────
router.post("/revoke/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin only" });
      return;
    }

    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(licensesTable)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(eq(licensesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found", message: "License not found" });
      return;
    }

    res.json({ message: "License revoked", license: formatLicense(updated) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to revoke license" });
  }
});

// ── POST /api/licenses/renew/:id ──────────────────────────────────────────────
router.post("/renew/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin only" });
      return;
    }

    const id          = parseInt(req.params.id);
    const { expiresAt } = req.body;
    if (!expiresAt) {
      res.status(400).json({ error: "Bad Request", message: "expiresAt is required" });
      return;
    }

    const existing = await db.select().from(licensesTable).where(eq(licensesTable.id, id)).limit(1);
    if (!existing[0]) {
      res.status(404).json({ error: "Not Found", message: "License not found" });
      return;
    }

    const newExpiresAt = new Date(expiresAt);
    const [updated] = await db
      .update(licensesTable)
      .set({ expiresAt: newExpiresAt, status: "active", revokedAt: null, updatedAt: new Date() })
      .where(eq(licensesTable.id, id))
      .returning();

    res.json({ message: "License renewed", license: formatLicense(updated) });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to renew license" });
  }
});

// ── POST /api/licenses/ping — called by the customer's ZeniPost instance ──────
//
// The customer's ZeniPost email platform calls this endpoint on startup and
// periodically (e.g. every 24h) to confirm their license is still valid.
// No auth header needed — they authenticate via their domain + signature.
//
// Request body: { domain: string, signature: string }
// Response:     { valid: bool, status: string, plan, features, expiresAt, message? }
//
router.post("/ping", async (req, res) => {
  try {
    const { domain, signature } = req.body;

    if (!domain || !signature) {
      res.status(400).json({ valid: false, message: "domain and signature are required" });
      return;
    }

    const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();

    const rows = await db.select().from(licensesTable).where(eq(licensesTable.domain, cleanDomain)).limit(1);
    const lic  = rows[0];

    if (!lic) {
      res.status(404).json({ valid: false, status: "not_found", message: "No license found for this domain" });
      return;
    }

    // Verify the signature matches our signed record
    try {
      jwt.verify(signature, LICENSE_SECRET);
    } catch {
      res.status(401).json({ valid: false, status: "invalid_signature", message: "License signature is invalid or tampered" });
      return;
    }

    const status = computeStatus(lic);

    if (status === "revoked") {
      res.json({ valid: false, status: "revoked", message: "This license has been revoked. Contact support." });
      return;
    }

    if (status === "expired") {
      res.json({ valid: false, status: "expired", message: "License expired. Please renew to continue." });
      return;
    }

    // Update ping stats
    await db
      .update(licensesTable)
      .set({ lastPingAt: new Date(), pingCount: sql`${licensesTable.pingCount} + 1`, updatedAt: new Date() })
      .where(eq(licensesTable.id, lic.id));

    res.json({
      valid:            true,
      status,
      domain:           lic.domain,
      plan:             lic.plan,
      emailsPerMonth:   lic.emailsPerMonth,
      subscribersLimit: lic.subscribersLimit,
      features:         parseFeatures(lic.features),
      expiresAt:        lic.expiresAt instanceof Date ? lic.expiresAt.toISOString() : lic.expiresAt,
      message:          status === "expiring" ? "License expiring soon — please renew." : "License valid.",
    });
  } catch (err) {
    console.error("POST /licenses/ping error:", err);
    res.status(500).json({ valid: false, message: "Internal server error" });
  }
});

export default router;