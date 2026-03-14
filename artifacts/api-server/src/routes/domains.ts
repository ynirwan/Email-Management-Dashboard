import { Router } from "express";
import { db, domainsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = Router();

const LICENSE_SECRET = process.env["LICENSE_SECRET"] || "zenipost-license-secret-key";

function generateLicenseKey(): string {
  return "ZP-" + crypto.randomBytes(12).toString("hex").toUpperCase().match(/.{4}/g)!.join("-");
}

function generateLicensePayload(domain: any, user: any) {
  const expiresAt = domain.expiresAt ? new Date(domain.expiresAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  return {
    licenseKey: domain.licenseKey,
    domain: domain.domain,
    licensee: {
      id: user.id,
      name: user.name,
      email: user.email,
      company: user.company || null,
    },
    plan: user.plan,
    issuedAt: domain.createdAt,
    expiresAt: expiresAt.toISOString(),
    product: "ZeniPost Email Platform",
    version: "2.0",
    features: getLicenseFeatures(user.plan),
  };
}

function getLicenseFeatures(plan: string): string[] {
  const features: Record<string, string[]> = {
    free: ["basic-campaigns", "subscriber-management"],
    starter: ["basic-campaigns", "subscriber-management", "analytics", "ab-testing", "automation-basic"],
    pro: ["basic-campaigns", "subscriber-management", "analytics", "ab-testing", "automation-advanced", "custom-domains", "api-access"],
    enterprise: ["basic-campaigns", "subscriber-management", "analytics", "ab-testing", "automation-advanced", "custom-domains", "api-access", "dedicated-ip", "white-label", "sla", "priority-support"],
  };
  return features[plan] || features.free;
}

// GET all domains for current user
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const condition = user.role === "admin"
      ? undefined
      : eq(domainsTable.userId, user.id);

    const domains = condition
      ? await db.select().from(domainsTable).where(condition).orderBy(domainsTable.createdAt)
      : await db.select().from(domainsTable).orderBy(domainsTable.createdAt);

    res.json({ domains });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to fetch domains" });
  }
});

// POST add a domain
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const { domain } = req.body;

    if (!domain || typeof domain !== "string") {
      res.status(400).json({ error: "Bad Request", message: "Domain name is required" });
      return;
    }

    // Clean domain (strip protocol/path)
    const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase().trim();
    if (!cleanDomain || !/^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(cleanDomain)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid domain name. Example: yourdomain.com" });
      return;
    }

    // Check if domain already registered for this user
    const existing = await db.select().from(domainsTable)
      .where(and(eq(domainsTable.userId, user.id), eq(domainsTable.domain, cleanDomain)))
      .limit(1);

    if (existing[0]) {
      res.status(400).json({ error: "Conflict", message: "Domain already registered to your account" });
      return;
    }

    const licenseKey = generateLicenseKey();
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

    const [newDomain] = await db.insert(domainsTable).values({
      userId: user.id,
      domain: cleanDomain,
      licenseKey,
      isVerified: false,
      expiresAt,
    }).returning();

    res.status(201).json({ domain: newDomain });
  } catch (err) {
    console.error("Add domain error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to add domain" });
  }
});

// DELETE a domain
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);

    const domains = await db.select().from(domainsTable).where(eq(domainsTable.id, id)).limit(1);
    const domain = domains[0];

    if (!domain) {
      res.status(404).json({ error: "Not Found", message: "Domain not found" });
      return;
    }

    if (domain.userId !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "You don't own this domain" });
      return;
    }

    await db.delete(domainsTable).where(eq(domainsTable.id, id));
    res.json({ message: "Domain removed successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete domain" });
  }
});

// POST /api/domains/:id/license — generate a signed license file
router.post("/:id/license", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);

    const domains = await db.select().from(domainsTable).where(eq(domainsTable.id, id)).limit(1);
    const domain = domains[0];

    if (!domain) {
      res.status(404).json({ error: "Not Found", message: "Domain not found" });
      return;
    }

    if (domain.userId !== user.id && user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "You don't own this domain" });
      return;
    }

    // Fetch full user record
    const users = await db.select().from(usersTable).where(eq(usersTable.id, domain.userId)).limit(1);
    const licenseUser = users[0] || user;

    const payload = generateLicensePayload(domain, licenseUser);

    // Sign the entire payload with JWT for tamper detection
    const signature = jwt.sign(payload, LICENSE_SECRET, { algorithm: "HS256" });

    const licenseFile = {
      ...payload,
      signature,
      format: "zenipost-license-v1",
    };

    // Return as downloadable JSON file
    const filename = `zenipost-license-${domain.domain}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.json(licenseFile);
  } catch (err) {
    console.error("License generation error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to generate license" });
  }
});

// PATCH /:id/verify — admin can mark domain as verified
router.patch("/:id/verify", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin only" });
      return;
    }
    const id = parseInt(req.params.id);
    const [updated] = await db.update(domainsTable).set({ isVerified: true }).where(eq(domainsTable.id, id)).returning();
    if (!updated) {
      res.status(404).json({ error: "Not Found", message: "Domain not found" });
      return;
    }
    res.json({ domain: updated });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to verify domain" });
  }
});

export default router;