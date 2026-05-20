// artifacts/api-server/src/routes/payment-requests.ts
//
// Manual payment workflow:
//   POST   /api/payment-requests          — user submits proof
//   GET    /api/payment-requests          — user fetches own requests
//   GET    /api/payment-requests/admin    — admin fetches all requests
//   PATCH  /api/payment-requests/:id/approve — admin approves: auto-activate license + assign delivery + create invoice
//   PATCH  /api/payment-requests/:id/reject  — admin rejects with reason

import { Router } from "express";
import {
  db,
  usersTable,
  licensesTable,
  invoicesTable,
  paymentRequestsTable,
} from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { buildLicensePayload } from "../lib/license-builder.js";
import { PLAN_DEFINITIONS } from "./plans.js";
import jwt from "jsonwebtoken";

const router = Router();

const LICENSE_SECRET = process.env["LICENSE_SECRET"] || "zenipost-license-secret-2026";

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseIdParam(v: string | string[]): number {
  return parseInt(Array.isArray(v) ? v[0] : v, 10);
}

function toISO(v: any): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

function nextInvoiceNo() {
  return `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 90000) + 10000}`;
}

function parseFeatures(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function serializeRequest(r: any, user?: any) {
  return {
    id:             r.id,
    userId:         r.userId,
    userName:       user?.name  ?? null,
    userEmail:      user?.email ?? null,
    userCompany:    user?.company ?? null,
    type:           r.type,
    licenseId:      r.licenseId,
    deliveryPlanId: r.deliveryPlanId,
    amount:         parseFloat(r.amount),
    currency:       r.currency,
    paymentMethod:  r.paymentMethod,
    transactionRef: r.transactionRef,
    proofImageUrl:  r.proofImageUrl,
    notes:          r.notes,
    status:         r.status,
    adminNote:      r.adminNote,
    invoiceId:      r.invoiceId,
    createdAt:      toISO(r.createdAt),
    resolvedAt:     toISO(r.resolvedAt),
  };
}

// ── POST /api/payment-requests — user submits payment proof ───────────────────
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const {
      type = "license",
      licenseId,
      deliveryPlanId,
      amount,
      currency = "USD",
      paymentMethod,
      transactionRef,
      proofImageUrl,
      notes,
    } = req.body;

    if (!amount || !paymentMethod) {
      res.status(400).json({ error: "Bad Request", message: "amount and paymentMethod are required" });
      return;
    }

    // Validate licenseId belongs to user if provided
    if (licenseId) {
      const licRows = await db.select().from(licensesTable).where(eq(licensesTable.id, parseInt(licenseId))).limit(1);
      if (!licRows[0] || licRows[0].customerId !== user.id) {
        res.status(403).json({ error: "Forbidden", message: "License not found or not yours" });
        return;
      }
    }

    const [req_row] = await db.insert(paymentRequestsTable).values({
      userId:         user.id,
      type:           type as any,
      licenseId:      licenseId ? parseInt(licenseId) : null,
      deliveryPlanId: deliveryPlanId ?? null,
      amount:         parseFloat(amount).toFixed(2),
      currency,
      paymentMethod,
      transactionRef: transactionRef ?? null,
      proofImageUrl:  proofImageUrl  ?? null,
      notes:          notes          ?? null,
      status:         "pending",
    }).returning();

    res.status(201).json({ paymentRequest: serializeRequest(req_row) });
  } catch (err) {
    console.error("POST /payment-requests error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/payment-requests — user fetches own requests ─────────────────────
router.get("/", requireAuth, async (req, res) => {
  try {
    const user   = (req as any).user;
    const page   = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit  = Math.min(50, parseInt((req.query.limit as string) || "20"));
    const offset = (page - 1) * limit;

    const [rows, countRes] = await Promise.all([
      db.select().from(paymentRequestsTable)
        .where(eq(paymentRequestsTable.userId, user.id))
        .orderBy(desc(paymentRequestsTable.createdAt))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(paymentRequestsTable)
        .where(eq(paymentRequestsTable.userId, user.id)),
    ]);

    res.json({
      paymentRequests: rows.map((r) => serializeRequest(r)),
      total: Number(countRes[0]?.count ?? 0),
      page, limit,
    });
  } catch (err) {
    console.error("GET /payment-requests error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── GET /api/payment-requests/admin — admin fetches all requests ───────────────
router.get("/admin", requireAdmin, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt((req.query.page as string) || "1"));
    const limit  = Math.min(100, parseInt((req.query.limit as string) || "50"));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where = status ? eq(paymentRequestsTable.status, status as any) : undefined;

    const [rows, countRes] = await Promise.all([
      db.select().from(paymentRequestsTable)
        .where(where)
        .orderBy(desc(paymentRequestsTable.createdAt))
        .limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(paymentRequestsTable).where(where),
    ]);

    // Enrich with user info
    let requests = rows.map((r) => serializeRequest(r));
    if (rows.length > 0) {
      const userIds = [...new Set(rows.map((r) => r.userId))];
      const users   = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, company: usersTable.company })
        .from(usersTable)
        .where(sql`${usersTable.id} = ANY(${userIds})`);
      const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
      requests = rows.map((r) => serializeRequest(r, userMap[r.userId]));
    }

    res.json({ paymentRequests: requests, total: Number(countRes[0]?.count ?? 0), page, limit });
  } catch (err) {
    console.error("GET /payment-requests/admin error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/payment-requests/:id/approve — admin approves ──────────────────
//
// On approval the system:
//   1. Marks request as approved
//   2. Activates the linked license (if any, if not already activated)
//   3. Assigns delivery plan to the license (if deliveryPlanId is set)
//   4. Creates a paid invoice and links it to the request
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:id/approve", requireAdmin, async (req, res) => {
  try {
    const id = parseIdParam(req.params.id);

    const rows = await db.select().from(paymentRequestsTable).where(eq(paymentRequestsTable.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }
    const pr = rows[0];

    if (pr.status !== "pending") {
      res.status(400).json({ error: "Bad Request", message: `Request is already ${pr.status}` }); return;
    }

    const now = new Date();

    // ── Step 1: activate license if linked ───────────────────────────────────
    let activatedLicense: any = null;
    if (pr.licenseId) {
      const licRows = await db.select().from(licensesTable).where(eq(licensesTable.id, pr.licenseId)).limit(1);
      if (licRows[0] && !licRows[0].isActivated) {
        const [activated] = await db.update(licensesTable)
          .set({ isActivated: true, updatedAt: now })
          .where(eq(licensesTable.id, pr.licenseId))
          .returning();
        activatedLicense = activated;
      } else if (licRows[0]) {
        activatedLicense = licRows[0];
      }
    }

    // ── Step 2: assign delivery plan if requested ─────────────────────────────
    if (pr.licenseId && pr.deliveryPlanId && activatedLicense) {
      const { DELIVERY_PLANS } = await import("./plans.js");
      const plan = DELIVERY_PLANS.find((p: any) => p.id === pr.deliveryPlanId);

      if (plan) {
        const DELIVERY_FLAGS = ["managed_delivery", "dedicated_ip", "ip_warmup"];
        const currentFeatures = parseFeatures(activatedLicense.features);

        const newFlags = new Set(currentFeatures.filter((f: string) => !DELIVERY_FLAGS.includes(f)));
        newFlags.add("managed_delivery");
        if (plan.id === "delivery_dedicated") newFlags.add("dedicated_ip");
        if (["delivery_growth", "delivery_scale", "delivery_dedicated"].includes(plan.id)) newFlags.add("ip_warmup");

        const deliveryPatch: any = {
          deliveryPlanId:      plan.id,
          deliveryPlanName:    plan.name,
          deliveryEmailsLimit: plan.emailsPerMonth || null,
          deliveryInfra:       plan.infrastructure,
          deliveryRouting:     plan.routing,
          deliveryActiveSince: activatedLicense.deliveryActiveSince ?? now,
          features:            JSON.stringify([...newFlags]),
          updatedAt:           now,
        };

        const [withDelivery] = await db.update(licensesTable)
          .set(deliveryPatch)
          .where(eq(licensesTable.id, pr.licenseId))
          .returning();
        activatedLicense = withDelivery;
      }
    }

    // Re-sign the license after all changes
    if (activatedLicense) {
      const ownerRows = await db.select().from(usersTable)
        .where(eq(usersTable.id, activatedLicense.customerId)).limit(1);
      const owner = ownerRows[0];
      if (owner) {
        const payload   = buildLicensePayload(activatedLicense, owner);
        const signature = jwt.sign(payload, LICENSE_SECRET, { algorithm: "HS256" });
        await db.update(licensesTable)
          .set({ signature, updatedAt: now })
          .where(eq(licensesTable.id, activatedLicense.id));
      }
    }

    // ── Step 3: create a paid invoice ─────────────────────────────────────────
    // Determine plan label for the invoice description
    const userRows = await db.select().from(usersTable).where(eq(usersTable.id, pr.userId)).limit(1);
    const customer = userRows[0];

    const planLabel = (() => {
      if (pr.deliveryPlanId) {
        return `Delivery: ${pr.deliveryPlanId.replace(/_/g, " ")}`;
      }
      if (pr.type === "renewal") return "License Renewal";
      return customer?.plan ?? "license";
    })();

    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + 30);

    const billingPeriodStart = now;
    const billingPeriodEnd   = new Date(now);
    billingPeriodEnd.setFullYear(billingPeriodEnd.getFullYear() + 1);

    const [invoice] = await db.insert(invoicesTable).values({
      customerId:          pr.userId,
      invoiceNo:           nextInvoiceNo(),
      plan:                planLabel,
      amount:              pr.amount,
      currency:            pr.currency,
      status:              "paid",
      description:         `Payment approved — ${pr.type} (Ref: ${pr.transactionRef ?? "N/A"})`,
      paidAt:              now,
      dueAt,
      billingPeriodStart,
      billingPeriodEnd,
    }).returning();

    // ── Step 4: mark request approved ────────────────────────────────────────
    const [updated] = await db.update(paymentRequestsTable)
      .set({ status: "approved", invoiceId: invoice.id, resolvedAt: now })
      .where(eq(paymentRequestsTable.id, id))
      .returning();

    res.json({
      message:        "Payment approved. License activated and invoice generated.",
      paymentRequest: serializeRequest(updated, customer),
      invoiceId:      invoice.id,
      invoiceNo:      invoice.invoiceNo,
    });
  } catch (err) {
    console.error("PATCH /payment-requests/:id/approve error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ── PATCH /api/payment-requests/:id/reject — admin rejects ───────────────────
router.patch("/:id/reject", requireAdmin, async (req, res) => {
  try {
    const id        = parseIdParam(req.params.id);
    const adminNote = (req.body.adminNote as string) || "Rejected by admin.";

    const rows = await db.select().from(paymentRequestsTable).where(eq(paymentRequestsTable.id, id)).limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not Found" }); return; }

    if (rows[0].status !== "pending") {
      res.status(400).json({ error: "Bad Request", message: `Request is already ${rows[0].status}` }); return;
    }

    const [updated] = await db.update(paymentRequestsTable)
      .set({ status: "rejected", adminNote, resolvedAt: new Date() })
      .where(eq(paymentRequestsTable.id, id))
      .returning();

    const userRows = await db.select().from(usersTable).where(eq(usersTable.id, updated.userId)).limit(1);
    res.json({ message: "Payment request rejected.", paymentRequest: serializeRequest(updated, userRows[0]) });
  } catch (err) {
    console.error("PATCH /payment-requests/:id/reject error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
