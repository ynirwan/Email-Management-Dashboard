// artifacts/api-server/src/routes/admin-usage.ts
//
// GET /api/admin/usage
// Returns all customers with their license/domain info for the Usage Enforcement panel.
// Platform is feature-gated — no email/subscriber quotas displayed.
// Shows: plan, installations used vs seat limit, domain, ping status.
//
import { Router } from "express";
import { db, licensesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import { PLAN_DEFINITIONS } from "./plans.js";

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

function toISO(v: any): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

// GET /api/admin/usage
router.get("/", requireAdmin, async (req, res) => {
  try {
    // Fetch all non-admin users
    const users = await db
      .select({
        id:        usersTable.id,
        name:      usersTable.name,
        email:     usersTable.email,
        company:   usersTable.company,
        plan:      usersTable.plan,
        isActive:  usersTable.isActive,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.role, "user"))
      .orderBy(usersTable.createdAt);

    if (!users.length) {
      res.json({ customers: [], total: 0 });
      return;
    }

    // Fetch licenses with explicit columns — avoids crashing when a new column
    // (e.g. installation_ids) has been added to the schema but the migration
    // hasn't been applied yet.  Add installationIds only if the column exists.
    let licenses: any[] = [];
    try {
      licenses = await db
        .select({
          id:                 licensesTable.id,
          customerId:         licensesTable.customerId,
          domain:             licensesTable.domain,
          plan:               licensesTable.plan,
          isManaged:          licensesTable.isManaged,
          adminAccessEnabled: licensesTable.adminAccessEnabled,
          lastPingAt:         licensesTable.lastPingAt,
          pingCount:          licensesTable.pingCount,
          expiresAt:          licensesTable.expiresAt,
          revokedAt:          licensesTable.revokedAt,
          installationIds:    licensesTable.installationIds,
        })
        .from(licensesTable)
        .orderBy(licensesTable.createdAt);
    } catch {
      // installationIds column not yet migrated — fall back without it
      licenses = await db
        .select({
          id:                 licensesTable.id,
          customerId:         licensesTable.customerId,
          domain:             licensesTable.domain,
          plan:               licensesTable.plan,
          isManaged:          licensesTable.isManaged,
          adminAccessEnabled: licensesTable.adminAccessEnabled,
          lastPingAt:         licensesTable.lastPingAt,
          pingCount:          licensesTable.pingCount,
          expiresAt:          licensesTable.expiresAt,
          revokedAt:          licensesTable.revokedAt,
        })
        .from(licensesTable)
        .orderBy(licensesTable.createdAt);
    }

    // Group licenses by customerId
    const licsByCustomer: Record<number, any[]> = {};
    for (const lic of licenses) {
      if (!licsByCustomer[lic.customerId]) licsByCustomer[lic.customerId] = [];
      licsByCustomer[lic.customerId].push(lic);
    }

    const customers = users.map((user) => {
      const userLicenses = licsByCustomer[user.id] ?? [];

      const activeLics = userLicenses.filter(
        (l) => computeStatus(l) === "active" || computeStatus(l) === "expiring",
      );
      const primaryLic = activeLics[0] ?? userLicenses[0] ?? null;

      const isManaged = userLicenses.some((l) => l.isManaged);

      // Installation seat tracking — aggregate across all licenses
      const installationIds: string[] = [];
      for (const l of userLicenses) {
        for (const id of parseIds(l.installationIds ?? null)) {
          if (!installationIds.includes(id)) installationIds.push(id);
        }
      }

      // Seat limit from the plan definition
      const planDef = PLAN_DEFINITIONS.find((p) => p.id === (primaryLic?.plan ?? user.plan));
      const seatLimit = planDef?.installations ?? 1;

      return {
        userId:             user.id,
        name:               user.name,
        email:              user.email,
        company:            user.company ?? null,
        plan:               primaryLic?.plan ?? user.plan,
        isActive:           user.isActive,
        // License info
        licenseId:          primaryLic?.id ?? null,
        domain:             primaryLic?.domain ?? null,
        licenseStatus:      primaryLic ? computeStatus(primaryLic) : null,
        isManaged,
        adminAccessEnabled: primaryLic?.adminAccessEnabled ?? false,
        lastPingAt:         toISO(primaryLic?.lastPingAt),
        pingCount:          primaryLic?.pingCount ?? 0,
        expiresAt:          toISO(primaryLic?.expiresAt),
        // Counts
        totalLicenses:      userLicenses.length,
        activeLicenses:     activeLics.length,
        // Installation seat tracking
        installationIds,
        seatLimit,
      };
    });

    res.json({ customers, total: customers.length });
  } catch (err) {
    console.error("GET /admin/usage error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
