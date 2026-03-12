import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, createToken, requireAuth } from "../lib/auth.js";

const router = Router();

function serializeUser(user: any) {
  const { hashedPassword, ...rest } = user;
  return rest;
}

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Email and password required" });
      return;
    }

    const users = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    const user = users[0];

    if (!user || !verifyPassword(password, user.hashedPassword)) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({ error: "Unauthorized", message: "Account is deactivated" });
      return;
    }

    const token = createToken({ userId: user.id, email: user.email, role: user.role });
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Login failed" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, company } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Name, email and password required" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: "Bad Request", message: "Email already registered" });
      return;
    }

    const hashed = hashPassword(password);
    const [user] = await db.insert(usersTable).values({
      name,
      email: email.toLowerCase(),
      hashedPassword: hashed,
      company: company || null,
      role: "user",
      plan: "free",
      isActive: true,
      emailsUsed: 0,
      emailsLimit: 500,
      subscribersUsed: 0,
      subscribersLimit: 500,
    }).returning();

    const token = createToken({ userId: user.id, email: user.email, role: user.role });
    res.status(201).json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Registration failed" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json(serializeUser(user));
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
