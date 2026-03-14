import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const licenseStatusEnum = pgEnum("license_status", ["active", "expiring", "revoked", "expired"]);
export const licensePlanEnum   = pgEnum("license_plan",   ["free", "starter", "pro"]);

export const licensesTable = pgTable("licenses", {
  id:               serial("id").primaryKey(),
  customerId:       integer("customer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  domain:           text("domain").notNull().unique(),
  rootDomain:       text("root_domain").notNull().default(""),
  plan:             licensePlanEnum("plan").notNull().default("free"),
  emailsPerMonth:   integer("emails_per_month").notNull().default(2500),
  subscribersLimit: integer("subscribers_limit").notNull().default(500),
  features:         text("features").notNull().default("[]"),
  status:           licenseStatusEnum("status").notNull().default("active"),
  signature:        text("signature"),

  // ── Managed service fields ────────────────────────────────────────────────
  // isManaged     : customer opted into ZeniPost Managed Services
  //   true  → admin access tokens available, SMTP add-ons unlocked
  //   false → customer is fully self-managed, no dashboard access to their app
  isManaged:          boolean("is_managed").notNull().default(false),
  managedSince:       timestamp("managed_since"),
  managedNote:        text("managed_note"),        // internal note e.g. "SMTP Basic, SES us-east-1"

  // adminAccessEnabled: secondary toggle — managed customers can still have
  // admin login disabled (e.g. customer requested privacy window)
  adminAccessEnabled: boolean("admin_access_enabled").notNull().default(false),

  // ── Ping tracking ─────────────────────────────────────────────────────────
  issuedAt:   timestamp("issued_at").notNull().defaultNow(),
  expiresAt:  timestamp("expires_at").notNull(),
  revokedAt:  timestamp("revoked_at"),
  lastPingAt: timestamp("last_ping_at"),
  pingCount:  integer("ping_count").notNull().default(0),
  createdAt:  timestamp("created_at").notNull().defaultNow(),
  updatedAt:  timestamp("updated_at").notNull().defaultNow(),
});

export const insertLicenseSchema = createInsertSchema(licensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type License       = typeof licensesTable.$inferSelect;