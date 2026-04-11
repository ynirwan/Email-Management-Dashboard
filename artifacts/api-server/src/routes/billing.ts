import { Router } from "express";
import { db, usersTable, invoicesTable, licensesTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { PLAN_DEFINITIONS } from "./plans.js";

const router = Router();

const PLAN_PRICES   = Object.fromEntries(PLAN_DEFINITIONS.map((p) => [p.id, p.price]));
const PLAN_LIMITS   = Object.fromEntries(PLAN_DEFINITIONS.map((p) => [p.id, { emailsLimit: p.emailsPerMonth, subscribersLimit: p.subscribersLimit }]));
const PLAN_FEATURES = Object.fromEntries(PLAN_DEFINITIONS.map((p) => [p.id, p.featureFlags]));

function parseIdParam(value: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  return parseInt(raw, 10);
}

function nextInvoiceNo() {
  return `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
}

function serialize(inv: any) {
  const out: any = { ...inv, amount: parseFloat(inv.amount) };
  for (const k of ["dueAt","paidAt","createdAt","updatedAt","billingPeriodStart","billingPeriodEnd"]) {
    if (out[k] instanceof Date) out[k] = out[k].toISOString();
  }
  return out;
}

// GET /api/billing/invoices
router.get("/invoices", requireAuth, async (req, res) => {
  try {
    const user   = (req as any).user;
    const page   = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit  = Math.min(50, parseInt((req.query.limit as string) || "20"));
    const offset = (page - 1) * limit;
    const where  = user.role === "admin" ? undefined : eq(invoicesTable.customerId, user.id);

    const [rows, countRes] = await Promise.all([
      db.select().from(invoicesTable).where(where).orderBy(desc(invoicesTable.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(invoicesTable).where(where),
    ]);

    let invoices = rows.map(serialize);
    if (user.role === "admin" && rows.length > 0) {
      const ids   = [...new Set(rows.map((r) => r.customerId))];
      const custs = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, company: usersTable.company })
        .from(usersTable).where(sql`${usersTable.id} = ANY(${ids})`);
      const cMap  = Object.fromEntries(custs.map((c) => [c.id, c]));
      invoices    = invoices.map((inv) => ({ ...inv, customer: cMap[inv.customerId] ?? null }));
    }
    res.json({ invoices, total: Number(countRes[0]?.count ?? 0), page, limit });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// GET /api/billing/invoices/:id
router.get("/invoices/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const rows = await db.select().from(invoicesTable).where(eq(invoicesTable.id, parseIdParam(req.params.id))).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }
    if (user.role !== "admin" && rows[0].customerId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }
    const custs = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, company: usersTable.company })
      .from(usersTable).where(eq(usersTable.id, rows[0].customerId)).limit(1);
    res.json({ invoice: { ...serialize(rows[0]), customer: custs[0] ?? null } });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// POST /api/billing/invoices — admin creates invoice manually
router.post("/invoices", requireAdmin, async (req, res) => {
  try {
    const { customerId, plan, amount, description, dueAt, billingPeriodStart, billingPeriodEnd } = req.body;
    if (!customerId || !plan || !dueAt) { res.status(400).json({ error: "customerId, plan, dueAt required" }); return; }
    if (!PLAN_PRICES.hasOwnProperty(plan)) { res.status(400).json({ error: "Invalid plan" }); return; }
    const cust = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(customerId))).limit(1);
    if (!cust[0]) { res.status(404).json({ error: "Customer not found" }); return; }
    const [inv] = await db.insert(invoicesTable).values({
      customerId: parseInt(customerId), invoiceNo: nextInvoiceNo(), plan,
      amount: (amount ?? PLAN_PRICES[plan]).toString(), status: "pending",
      description: description ?? `${plan} plan subscription`, dueAt: new Date(dueAt),
      billingPeriodStart: billingPeriodStart ? new Date(billingPeriodStart) : null,
      billingPeriodEnd:   billingPeriodEnd   ? new Date(billingPeriodEnd)   : null,
    }).returning();
    res.status(201).json({ invoice: serialize(inv) });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// PATCH /api/billing/invoices/:id/mark-paid
router.patch("/invoices/:id/mark-paid", requireAdmin, async (req, res) => {
  try {
    const [upd] = await db.update(invoicesTable)
      .set({ status: "paid", paidAt: new Date(), updatedAt: new Date() })
      .where(eq(invoicesTable.id, parseIdParam(req.params.id))).returning();
    if (!upd) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ invoice: serialize(upd) });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// PATCH /api/billing/invoices/:id/cancel
router.patch("/invoices/:id/cancel", requireAdmin, async (req, res) => {
  try {
    const [upd] = await db.update(invoicesTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(invoicesTable.id, parseIdParam(req.params.id))).returning();
    if (!upd) { res.status(404).json({ error: "Not Found" }); return; }
    res.json({ invoice: serialize(upd) });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

// POST /api/billing/upgrade — admin changes a customer's plan
router.post("/upgrade", requireAdmin, async (req, res) => {
  try {
    const { customerId, plan } = req.body;
    if (!customerId || !plan || !PLAN_PRICES.hasOwnProperty(plan)) {
      res.status(400).json({ error: "customerId and valid plan (free|starter|pro|enterprise) required" }); return;
    }
    const cust = await db.select().from(usersTable).where(eq(usersTable.id, parseInt(customerId))).limit(1);
    if (!cust[0]) { res.status(404).json({ error: "Customer not found" }); return; }

    const limits   = PLAN_LIMITS[plan];
    const features = PLAN_FEATURES[plan];

    const [upd] = await db.update(usersTable)
      .set({ plan, emailsLimit: limits.emailsLimit, subscribersLimit: limits.subscribersLimit })
      .where(eq(usersTable.id, parseInt(customerId))).returning();

    await db.update(licensesTable)
      .set({ plan: plan as any, emailsPerMonth: limits.emailsLimit, subscribersLimit: limits.subscribersLimit, features: JSON.stringify(features), updatedAt: new Date() })
      .where(and(eq(licensesTable.customerId, parseInt(customerId)), eq(licensesTable.status, "active")));

    const now     = new Date();
    const dueDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const [invoice] = await db.insert(invoicesTable).values({
      customerId: parseInt(customerId), invoiceNo: nextInvoiceNo(), plan,
      amount: PLAN_PRICES[plan].toString(), status: "pending",
      description: `Plan change to ${plan}`, dueAt: dueDate,
      billingPeriodStart: now,
      billingPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
    }).returning();

    const { hashedPassword: _, ...safeUser } = upd as any;
    res.json({ message: `Upgraded to ${plan}`, user: safeUser, invoice: serialize(invoice) });
  } catch (err) {
    console.error("Upgrade error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/billing/summary
router.get("/summary", requireAdmin, async (req, res) => {
  try {
    const [paid, pending, overdue, planRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)`, total: sql<number>`sum(amount)` }).from(invoicesTable).where(eq(invoicesTable.status, "paid")),
      db.select({ count: sql<number>`count(*)`, total: sql<number>`sum(amount)` }).from(invoicesTable).where(eq(invoicesTable.status, "pending")),
      db.select({ count: sql<number>`count(*)`, total: sql<number>`sum(amount)` }).from(invoicesTable).where(eq(invoicesTable.status, "overdue")),
      db.select({ plan: usersTable.plan, count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.isActive, true)).groupBy(usersTable.plan),
    ]);
    const mrr = planRows.reduce((s, r) => s + (PLAN_PRICES[r.plan] ?? 0) * Number(r.count), 0);
    res.json({
      mrr,
      paid:    { count: Number(paid[0]?.count    ?? 0), total: parseFloat(String(paid[0]?.total    ?? 0)) },
      pending: { count: Number(pending[0]?.count ?? 0), total: parseFloat(String(pending[0]?.total ?? 0)) },
      overdue: { count: Number(overdue[0]?.count ?? 0), total: parseFloat(String(overdue[0]?.total ?? 0)) },
      planBreakdown: planRows.map((r) => ({ plan: r.plan, count: Number(r.count), revenue: (PLAN_PRICES[r.plan] ?? 0) * Number(r.count) })),
    });
  } catch (err) { res.status(500).json({ error: "Internal Server Error" }); }
});

export default router;
