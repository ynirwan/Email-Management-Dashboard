import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const adminEmail    = process.env["ADMIN_EMAIL"]    || "admin@zenipost.com";
  const adminPassword = process.env["ADMIN_PASSWORD"];
  const adminName     = process.env["ADMIN_NAME"]     || "Admin";

  if (!adminPassword) {
    console.error("❌ ADMIN_PASSWORD env var is required. Aborting.");
    console.error("   Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=<secret> pnpm seed:admin");
    process.exit(1);
  }

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, adminEmail))
    .limit(1);

  if (existing[0]) {
    console.log("Admin user already exists:", adminEmail);
    process.exit(0);
  }

  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  await db.insert(usersTable).values({
    name:             adminName,
    email:            adminEmail,
    hashedPassword,
    company:          "ZeniPost",
    role:             "admin",
    plan:             "agency",
    isActive:         true,
    emailsUsed:       0,
    emailsLimit:      0,        // no email quota for the dashboard admin account
    subscribersUsed:  0,
    subscribersLimit: 0,
  });

  console.log("✅ Admin user created:", adminEmail);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
