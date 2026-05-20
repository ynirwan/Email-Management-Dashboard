import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  pgEnum,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const userPlanEnum = pgEnum("user_plan", ["starter", "pro", "agency"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  company: text("company"),
  hashedPassword: text("hashed_password").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  plan: userPlanEnum("plan").notNull().default("starter"),
  isActive: boolean("is_active").notNull().default(true),
  emailsUsed: integer("emails_used").notNull().default(0),
  emailsLimit: integer("emails_limit").notNull().default(2500),
  subscribersUsed: integer("subscribers_used").notNull().default(0),
  subscribersLimit: integer("subscribers_limit").notNull().default(500),
  createdAt: timestamp("created_at").notNull().defaultNow(),

  // Password reset — token is a UUID stored as plain text (not hashed; it is
  // single-use and expires quickly, so the risk of DB exposure is low).
  // Both columns are nullable: only populated while a reset is pending.
  resetToken:          text("reset_token"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),

  // Email verification — populated after registration, cleared once verified.
  emailVerifiedAt:        timestamp("email_verified_at"),
  emailVerificationToken: text("email_verification_token"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
