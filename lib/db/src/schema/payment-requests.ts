import { pgTable, text, serial, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable }   from "./users";
import { licensesTable } from "./licenses";
import { invoicesTable } from "./invoices";

export const paymentRequestStatusEnum = pgEnum("payment_request_status", ["pending", "approved", "rejected"]);
export const paymentRequestTypeEnum   = pgEnum("payment_request_type",   ["license", "delivery", "renewal"]);

export const paymentRequestsTable = pgTable("payment_requests", {
  id:             serial("id").primaryKey(),
  userId:         integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type:           paymentRequestTypeEnum("type").notNull().default("license"),
  licenseId:      integer("license_id").references(() => licensesTable.id, { onDelete: "set null" }),
  deliveryPlanId: text("delivery_plan_id"),
  amount:         numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency:       text("currency").notNull().default("USD"),
  paymentMethod:  text("payment_method").notNull(),
  transactionRef: text("transaction_ref"),
  proofImageUrl:  text("proof_image_url"),
  notes:          text("notes"),
  status:         paymentRequestStatusEnum("status").notNull().default("pending"),
  adminNote:      text("admin_note"),
  invoiceId:      integer("invoice_id").references(() => invoicesTable.id, { onDelete: "set null" }),
  createdAt:      timestamp("created_at").notNull().defaultNow(),
  resolvedAt:     timestamp("resolved_at"),
});

export type PaymentRequest       = typeof paymentRequestsTable.$inferSelect;
export type InsertPaymentRequest = typeof paymentRequestsTable.$inferInsert;
