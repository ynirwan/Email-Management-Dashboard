// artifacts/api-server/src/routes/admin-usage.ts
//
// GET /api/admin/usage
// Returns all customers with their license/domain info for the Usage Enforcement panel.
// Non-managed: shows license file limits (enforced by the email app itself)
// Managed:     shows live emailsUsed/emailsLimit/subscribersUsed pulled from users table
//
import { Router } from "express";
import { db, licensesTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

function computeStatus(
  lic: any,
): "active" | "expiring" | "revoked" | "expired" {
  if (lic.revokedAt) return "revoked";
  const now = Date.now();
  const expires = new Date(lic.expiresAt).getTime();
  if (expires < now) return "expired";
  const daysLeft = (expires - now) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 30) return "expiring";
  return "active";
}

// GET /api/admin/usage
router.get("/", requireAdmin, async (req, res) => {
  try {
    // Fetch all non-admin users
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.role, "user"))
      .orderBy(usersTable.createdAt);

    if (!users.length) {
      res.json({ customers: [], total: 0 });
      return;
    }

    const userIds = users.map((u) => u.id);

    // Fetch all licenses for these users
    const licenses = await db
      .select()
      .from(licensesTable)
      .orderBy(licensesTable.createdAt);

    // Group licenses by customerId
    const licsByCustomer: Record<number, typeof licenses> = {};
    for (const lic of licenses) {
      if (!licsByCustomer[lic.customerId]) licsByCustomer[lic.customerId] = [];
      licsByCustomer[lic.customerId].push(lic);
    }

    const customers = users.map((user) => {
      const userLicenses = licsByCustomer[user.id] ?? [];

      // Primary license = most recently created active one, or just first
      const activeLics = userLicenses.filter(
        (l) => computeStatus(l) === "active" || computeStatus(l) === "expiring",
      );
      const primaryLic = activeLics[0] ?? userLicenses[0] ?? null;

      // isManaged: true if ANY license for this customer is managed
      const isManaged = userLicenses.some((l) => l.isManaged);

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        company: user.company ?? null,
        plan: user.plan,
        isActive: user.isActive,
        // Usage fields — from users table (updated by managed heartbeat or admin)
        emailsUsed: user.emailsUsed,
        emailsLimit: user.emailsLimit,
        subscribersUsed: user.subscribersUsed,
        subscribersLimit: user.subscribersLimit,
        // Primary license info
        licenseId: primaryLic?.id ?? null,
        domain: primaryLic?.domain ?? null,
        licenseStatus: primaryLic ? computeStatus(primaryLic) : null,
        isManaged,
        adminAccessEnabled: primaryLic?.adminAccessEnabled ?? false,
        lastPingAt: primaryLic?.lastPingAt
          ? primaryLic.lastPingAt instanceof Date
            ? primaryLic.lastPingAt.toISOString()
            : primaryLic.lastPingAt
          : null,
        expiresAt: primaryLic?.expiresAt
          ? primaryLic.expiresAt instanceof Date
            ? primaryLic.expiresAt.toISOString()
            : primaryLic.expiresAt
          : null,
        // Counts
        totalLicenses: userLicenses.length,
        activeLicenses: activeLics.length,
      };
    });

    res.json({ customers, total: customers.length });
  } catch (err) {
    console.error("GET /admin/usage error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
