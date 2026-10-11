// lib/db/src/schema/licenses.ts  (FULL REPLACEMENT)
import { pgTable, text, serial, integer, boolean, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const licenseStatusEnum = pgEnum("license_status", ["active", "expiring", "revoked", "expired"]);
export const licensePlanEnum   = pgEnum("license_plan",   ["starter", "pro", "agency"]);

export const licensesTable = pgTable("licenses", {
  id:               serial("id").primaryKey(),
  customerId:       integer("customer_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  domain:           text("domain").notNull().unique(),
  rootDomain:       text("root_domain").notNull().default(""),
  plan:             licensePlanEnum("plan").notNull().default("starter"),
  emailsPerMonth:   integer("emails_per_month").notNull().default(2500),
  subscribersLimit: integer("subscribers_limit").notNull().default(500),
  features:         text("features").notNull().default("[]"),          // JSON array of FeatureFlag strings
  status:           licenseStatusEnum("status").notNull().default("active"),
  signature:        text("signature"),

  // ── Managed service fields ────────────────────────────────────────────────
  isManaged:          boolean("is_managed").notNull().default(false),
  managedSince:       timestamp("managed_since"),
  managedNote:        text("managed_note"),
  adminAccessEnabled: boolean("admin_access_enabled").notNull().default(false),

  // ── Managed delivery plan ─────────────────────────────────────────────────
  // When set, the license file download injects a `delivery` block that the
  // email app reads to configure its sending infrastructure path.
  // NULL = customer is on their own SMTP — email app ignores the delivery block.
  deliveryPlanId:      text("delivery_plan_id"),              // e.g. "delivery_growth"
  deliveryPlanName:    text("delivery_plan_name"),            // e.g. "Growth Delivery"
  deliveryEmailsLimit: integer("delivery_emails_limit"),      // emails/month on this delivery tier
  deliveryInfra:       text("delivery_infra"),                // e.g. "Optimized routing"
  deliveryRouting:     text("delivery_routing"),              // e.g. "Better inbox placement"
  deliveryActiveSince: timestamp("delivery_active_since"),    // when this delivery plan was activated

  // ── Installation tracking ─────────────────────────────────────────────────
  // Set once when the email app calls POST /api/licenses/register-install after
  // a successful setup-wizard run.  Subsequent install attempts from a *different*
  // IP increment installCount and flag the license for review.
  installedAt:      timestamp("installed_at"),
  installedIp:      text("installed_ip"),              // public IP at first install
  installCount:     integer("install_count").notNull().default(0),  // >1 = potential reuse
  ipMismatch:       boolean("ip_mismatch").notNull().default(false), // true if ping IP ≠ install IP
  // JSON array of unique installation_id UUIDs — one per running instance.
  // Used to enforce per-plan seat limits via the ping endpoint.
  // e.g. ["uuid-a", "uuid-b", "uuid-c"]
  installationIds:  text("installation_ids").notNull().default("[]"),

  // ── Activation gate ───────────────────────────────────────────────────────
  // FALSE for licenses auto-created when a user registers a domain (pending
  // payment confirmation). Admin sets TRUE via PATCH /licenses/:id/activate.
  // Admin-generated licenses (POST /licenses) are always created as TRUE.
  isActivated: boolean("is_activated").notNull().default(true),

  // ── Ping tracking ─────────────────────────────────────────────────────────
  issuedAt:    timestamp("issued_at").notNull().defaultNow(),
  expiresAt:   timestamp("expires_at").notNull(),
  revokedAt:   timestamp("revoked_at"),
  lastPingAt:  timestamp("last_ping_at"),
  lastPingIp:  text("last_ping_ip"),               // IP from most recent ping
  pingCount:   integer("ping_count").notNull().default(0),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
  updatedAt:   timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  // Support efficient filtering on the two most common list-query dimensions.
  index("licenses_status_idx").on(table.status),
  index("licenses_customer_id_idx").on(table.customerId),
]);

export const insertLicenseSchema = createInsertSchema(licensesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLicense = z.infer<typeof insertLicenseSchema>;
export type License       = typeof licensesTable.$inferSelect;