import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, or, count, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth.js";
import { PLAN_DEFINITIONS } from "./plans.js";

const router = Router();

function parseIdParam(value: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseInt(raw, 10);
}

const PLAN_LIMITS: Record<string, { emailsLimit: number; subscribersLimit: number }> = Object.fromEntries(
  PLAN_DEFINITIONS.map((plan) => [
    plan.id,
    { emailsLimit: plan.emailsPerMonth, subscribersLimit: plan.subscribersLimit },
  ])
);

function serializeUser(user: any) {
  const { hashedPassword, ...rest } = user;
  return rest;
}

router.get("/", requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    let query = db.select().from(usersTable);
    let countQuery = db.select({ count: count() }).from(usersTable);

    if (search) {
      const condition = or(
        ilike(usersTable.name, `%${search}%`),
        ilike(usersTable.email, `%${search}%`),
        ilike(usersTable.company, `%${search}%`)
      );
      query = query.where(condition) as any;
      countQuery = countQuery.where(condition) as any;
    }

    const [users, [{ count: total }]] = await Promise.all([
      query.limit(limit).offset(offset).orderBy(sql`${usersTable.createdAt} DESC`),
      countQuery,
    ]);

    res.json({
      users: users.map(serializeUser),
      total: Number(total),
      page,
      limit,
    });
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to list users" });
  }
});

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!users[0]) {
      res.status(404).json({ error: "Not Found", message: "User not found" });
      return;
    }
    res.json(serializeUser(users[0]));
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to get user" });
  }
});

router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const { name, email, company, isActive } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (company !== undefined) updateData.company = company;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
    if (!user) {
      res.status(404).json({ error: "Not Found", message: "User not found" });
      return;
    }
    res.json(serializeUser(user));
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update user" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const currentUser = (req as any).user;
    if (currentUser.id === id) {
      res.status(400).json({ error: "Bad Request", message: "Cannot delete your own account" });
      return;
    }
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to delete user" });
  }
});

router.patch("/:id/plan", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);
    const { plan } = req.body;
    if (!["starter", "pro", "agency"].includes(plan)) {
      res.status(400).json({ error: "Bad Request", message: "Invalid plan" });
      return;
    }

    const limits = PLAN_LIMITS[plan];
    const [user] = await db.update(usersTable)
      .set({ plan, ...limits })
      .where(eq(usersTable.id, id))
      .returning();

    if (!user) {
      res.status(404).json({ error: "Not Found", message: "User not found" });
      return;
    }
    res.json(serializeUser(user));
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to update plan" });
  }
});

export default router;
