import { pgTable, text, serial, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const invoiceStatusEnum = pgEnum("invoice_status", ["draft", "pending", "paid", "overdue", "cancelled"]);

export const invoicesTable = pgTable("invoices", {
  id:          serial("id").primaryKey(),
  customerId:  integer("customer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  invoiceNo:   text("invoice_no").notNull().unique(),          // INV-2026-0001
  plan:        text("plan").notNull(),
  amount:      numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency:    text("currency").notNull().default("USD"),
  status:      invoiceStatusEnum("status").notNull().default("pending"),
  description: text("description"),
  billingPeriodStart: timestamp("billing_period_start"),
  billingPeriodEnd:   timestamp("billing_period_end"),
  paidAt:      timestamp("paid_at"),
  dueAt:       timestamp("due_at").notNull(),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice       = typeof invoicesTable.$inferSelect;