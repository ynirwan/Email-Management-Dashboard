import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const licenseStatusEnum = pgEnum("license_status", ["active", "expiring", "revoked", "expired"]);
export const licensePlanEnum   = pgEnum("license_plan",   ["free", "starter", "pro", "enterprise"]);

export const licensesTable = pgTable("licenses", {
  id:                serial("id").primaryKey(),
  customerId:        integer("customer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  domain:            text("domain").notNull().unique(),           // locked domain — one license per domain
  plan:              licensePlanEnum("plan").notNull().default("free"),
  emailsPerMonth:    integer("emails_per_month").notNull().default(500),
  subscribersLimit:  integer("subscribers_limit").notNull().default(500),
  features:          text("features").notNull().default("[]"),    // JSON array stored as text
  status:            licenseStatusEnum("status").notNull().default("active"),
  signature:         text("signature"),                           // JWT signature of the license payload
  issuedAt:          timestamp("issued_at").notNull().defaultNow(),
  expiresAt:         timestamp("expires_at").notNull(),
  revokedAt:         timestamp("revoked_at"),
  lastPingAt:        timestamp("last_ping_at"),                   // last time client app pinged us
  pingCount:         integer("ping_count").notNull().default(0),  // total pings received
  createdAt:         timestamp("created_at").notNull().defaultNow(),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

export const insertLicenseSchema = createInsertSchema(licensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type License       = typeof licensesTable.$inferSelect;