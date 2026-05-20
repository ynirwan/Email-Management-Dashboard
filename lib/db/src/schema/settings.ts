import { pgTable, text, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port"),
  smtpUser: text("smtp_user"),
  smtpPassword: text("smtp_password"),
  smtpFromEmail: text("smtp_from_email"),
  smtpFromName: text("smtp_from_name"),
  awsRegion: text("aws_region"),
  maxEmailsPerDay: integer("max_emails_per_day").notNull().default(10000),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  allowRegistrations: boolean("allow_registrations").notNull().default(true),
  siteName: text("site_name").notNull().default("ZeniPost"),
  supportEmail: text("support_email"),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
