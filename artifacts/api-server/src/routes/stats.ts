import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { count, eq, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";

const router = Router();

router.get("/summary", requireAdmin, async (_req, res) => {
  try {
    const [totalResult] = await db.select({ count: count() }).from(usersTable);
    const [activeResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isActive, true));

    const [emailsSent] = await db.select({
      total: sql<number>`COALESCE(SUM(${usersTable.emailsUsed}), 0)`,
    }).from(usersTable);

    const [subscribersResult] = await db.select({
      total: sql<number>`COALESCE(SUM(${usersTable.subscribersUsed}), 0)`,
    }).from(usersTable);

    const planCounts = await db.select({
      plan: usersTable.plan,
      count: count(),
    }).from(usersTable).groupBy(usersTable.plan);

    const planBreakdown = { free: 0, starter: 0, pro: 0, enterprise: 0 };
    for (const row of planCounts) {
      planBreakdown[row.plan as keyof typeof planBreakdown] = Number(row.count);
    }

    res.json({
      totalUsers: Number(totalResult.count),
      activeUsers: Number(activeResult.count),
      totalEmailsSent: Number(emailsSent.total),
      totalSubscribers: Number(subscribersResult.total),
      planBreakdown,
    });
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get stats" });
  }
});

export default router;
