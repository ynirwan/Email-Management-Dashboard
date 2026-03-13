import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { count, eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    if (user.role === "admin") {
      // Admin sees platform-wide stats
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
    } else {
      // Regular user sees their own stats
      res.json({
        totalUsers: 1,
        activeUsers: user.isActive ? 1 : 0,
        totalEmailsSent: user.emailsUsed,
        totalSubscribers: user.subscribersUsed,
        planBreakdown: {
          free: user.plan === "free" ? 1 : 0,
          starter: user.plan === "starter" ? 1 : 0,
          pro: user.plan === "pro" ? 1 : 0,
          enterprise: user.plan === "enterprise" ? 1 : 0,
        },
      });
    }
  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get stats" });
  }
});

export default router;
