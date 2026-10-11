import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { JWT_SECRET } from "./signing-secrets.js";

const JWT_EXPIRES_IN = "7d";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createToken(payload: { userId: number; email: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: number; email: string; role: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number; email: string; role: string };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Accept token from httpOnly cookie (browser sessions) or Bearer header (API clients).
  const cookieToken = (req as any).cookies?.access_token as string | undefined;
  const authHeader  = req.headers.authorization;
  const token = cookieToken || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined);

  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "Missing token" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  const user  = users[0];

  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }

  if (!user.isActive) {
    // Distinguish between "not yet verified" and "admin-deactivated"
    const reason = (user as any).emailVerifiedAt === null || (user as any).emailVerifiedAt === undefined
      ? "Email address not verified. Please check your inbox for a verification link."
      : "Account is deactivated. Please contact support.";
    res.status(401).json({ error: "Unauthorized", message: reason, code: "ACCOUNT_INACTIVE" });
    return;
  }

  (req as any).user = user;
  next();
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as any).user;
    if (user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden", message: "Admin access required" });
      return;
    }
    next();
  });
}
