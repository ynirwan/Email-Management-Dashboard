import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const adminEmail = "admin@zenipost.com";
  const adminPassword = "admin123";

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);

  if (existing[0]) {
    console.log("Admin user already exists:", adminEmail);
    process.exit(0);
  }

  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  await db.insert(usersTable).values({
    name: "Admin User",
    email: adminEmail,
    hashedPassword,
    company: "ZeniPost",
    role: "admin",
    plan: "enterprise",
    isActive: true,
    emailsUsed: 12543,
    emailsLimit: 9999999,
    subscribersUsed: 4821,
    subscribersLimit: 9999999,
  });

  console.log("✅ Admin user created:");
  console.log("   Email:", adminEmail);
  console.log("   Password:", adminPassword);

  // Also seed a few demo users
  const demoUsers = [
    { name: "Alice Johnson", email: "alice@acme.com", plan: "pro" as const, emailsUsed: 75000, emailsLimit: 250000, subscribersUsed: 12000, subscribersLimit: 50000 },
    { name: "Bob Smith", email: "bob@startup.io", plan: "starter" as const, emailsUsed: 8000, emailsLimit: 50000, subscribersUsed: 1200, subscribersLimit: 5000 },
    { name: "Carol Davis", email: "carol@shop.com", plan: "free" as const, emailsUsed: 320, emailsLimit: 500, subscribersUsed: 150, subscribersLimit: 500 },
    { name: "David Lee", email: "david@agency.net", plan: "enterprise" as const, emailsUsed: 500000, emailsLimit: 9999999, subscribersUsed: 80000, subscribersLimit: 9999999, company: "Lee Agency" },
  ];

  for (const user of demoUsers) {
    const hashedPw = bcrypt.hashSync("password123", 10);
    await db.insert(usersTable).values({
      name: user.name,
      email: user.email,
      hashedPassword: hashedPw,
      company: (user as any).company || null,
      role: "user",
      plan: user.plan,
      isActive: true,
      emailsUsed: user.emailsUsed,
      emailsLimit: user.emailsLimit,
      subscribersUsed: user.subscribersUsed,
      subscribersLimit: user.subscribersLimit,
    }).onConflictDoNothing();
  }

  console.log("✅ Demo users created");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
