import { Router, type Request, type Response } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";
import { rateLimit } from "express-rate-limit";
import { hashPassword, verifyPassword, createToken, requireAuth } from "../lib/auth.js";
import { sendMail, buildPasswordResetEmail, buildVerificationEmail } from "../lib/mailer.js";

// ── Auth cookie helpers ───────────────────────────────────────────────────────

const JWT_COOKIE      = "access_token";
const SESSION_FLAG    = "logged_in";     // non-httpOnly; JS reads this to detect a session
const JWT_MAX_AGE_MS  = 7 * 24 * 60 * 60; // 7 days in seconds (matches JWT_EXPIRES_IN)

function setAuthCookies(res: Response, token: string, req: Request): void {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.cookie(JWT_COOKIE, token, {
    httpOnly:  true,
    sameSite:  "strict",
    secure,
    maxAge:    JWT_MAX_AGE_MS * 1000,
    path:      "/",
  });
  // Readable by JS — lets the frontend detect a session without a round-trip.
  // Does NOT contain the JWT itself.
  res.cookie(SESSION_FLAG, "1", {
    httpOnly:  false,
    sameSite:  "strict",
    secure,
    maxAge:    JWT_MAX_AGE_MS * 1000,
    path:      "/",
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie(JWT_COOKIE,   { path: "/" });
  res.clearCookie(SESSION_FLAG, { path: "/" });
}

// ── Auth rate limiters ────────────────────────────────────────────────────────
// Scoped tightly to auth routes — does not affect the rest of the API.
// All limits are per-IP (default key = req.ip).

/** Login: 10 attempts per 15 minutes. Blocks credential-stuffing / brute force. */
const loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  "draft-7",
  legacyHeaders:    false,
  message: { error: "Too Many Requests", message: "Too many login attempts. Please wait 15 minutes and try again." },
});

/** Forgot-password / resend-verification: 5 per 15 minutes. Prevents email bombing. */
const emailActionLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              5,
  standardHeaders:  "draft-7",
  legacyHeaders:    false,
  message: { error: "Too Many Requests", message: "Too many requests. Please wait 15 minutes and try again." },
});

const router = Router();

function serializeUser(user: any) {
  const { hashedPassword, ...rest } = user;
  return rest;
}

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Bad Request", message: "Email and password required" }); return;
    }
    const users = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    const user  = users[0];
    if (!user || !verifyPassword(password, user.hashedPassword)) {
      res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" }); return;
    }
    if (!user.isActive) {
      const reason = !user.emailVerifiedAt
        ? "Please verify your email address before logging in. Check your inbox for the verification link."
        : "Account is deactivated. Please contact support.";
      res.status(401).json({ error: "Unauthorized", message: reason, code: "ACCOUNT_INACTIVE" }); return;
    }
    const token = createToken({ userId: user.id, email: user.email, role: user.role });
    setAuthCookies(res, token, req);
    // Body still includes token for API clients; browser sessions should rely on the cookie.
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
      res.status(400).json({ error: "Bad Request", message: "Name, email and password required" }); return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Bad Request", message: "Password must be at least 8 characters" }); return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: "Bad Request", message: "Email already registered" }); return;
    }

    // Generate email verification token.  Account starts inactive — the user
    // cannot log in until they verify their email address.
    const verificationToken = randomBytes(32).toString("hex");

    const [user] = await db.insert(usersTable).values({
      name,
      email:                  email.toLowerCase(),
      hashedPassword:         hashPassword(password),
      company:                company || null,
      role:                   "user",
      plan:                   "starter",
      isActive:               false,    // inactive until email verified
      emailsUsed:             0,
      emailsLimit:            0,
      subscribersUsed:        0,
      subscribersLimit:       0,
      emailVerificationToken: verificationToken,
    }).returning();

    // Send verification email — non-fatal if SMTP is unconfigured (logs to console).
    const mail = buildVerificationEmail(user.name, verificationToken);
    await sendMail({ ...mail, to: user.email });

    // Do not issue a JWT yet — the account is not active.
    res.status(201).json({
      message: "Account created. Please check your email to verify your address before logging in.",
      userId:  user.id,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Registration failed" });
  }
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
// Activates the account and clears the verification token.
// The frontend should POST to this when the user lands on /verify-email?token=...
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "Bad Request", message: "token is required" }); return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.emailVerificationToken, token))
      .limit(1);

    const user = users[0];

    if (!user) {
      res.status(400).json({
        error:   "Bad Request",
        message: "Verification token is invalid or has already been used.",
      }); return;
    }

    if (user.emailVerifiedAt) {
      // Already verified — still issue a token so they land in the dashboard
      const jwt = createToken({ userId: user.id, email: user.email, role: user.role });
      res.json({ message: "Email already verified.", token: jwt, user: serializeUser(user) }); return;
    }

    // Activate the account
    const [activated] = await db
      .update(usersTable)
      .set({
        isActive:               true,
        emailVerifiedAt:        new Date(),
        emailVerificationToken: null,
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    const jwt = createToken({ userId: activated.id, email: activated.email, role: activated.role });
    res.json({ message: "Email verified. Welcome to ZeniPost!", token: jwt, user: serializeUser(activated) });
  } catch (err) {
    console.error("verify-email error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Verification failed" });
  }
});

// ── POST /api/auth/resend-verification ───────────────────────────────────────
// Lets a user who never received (or lost) the verification email request
// a fresh token.  Rate-limited informally by the generic response (no count
// stored, but a separate rate-limit middleware can be added later).
router.post("/resend-verification", emailActionLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Bad Request", message: "email is required" }); return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    // Always 200 — don't reveal account existence
    const user = users[0];
    if (!user || user.emailVerifiedAt) {
      res.json({ message: "If that email is registered and unverified, a new link has been sent." }); return;
    }

    const verificationToken = randomBytes(32).toString("hex");

    await db
      .update(usersTable)
      .set({ emailVerificationToken: verificationToken })
      .where(eq(usersTable.id, user.id));

    const mail = buildVerificationEmail(user.name, verificationToken);
    await sendMail({ ...mail, to: user.email });

    res.json({ message: "If that email is registered and unverified, a new link has been sent." });
  } catch (err) {
    console.error("resend-verification error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to resend verification" });
  }
});

router.get("/me", requireAuth, (req, res) => {
  res.json(serializeUser((req as any).user));
});

router.post("/logout", requireAuth, (_req, res) => {
  clearAuthCookies(res);
  res.json({ message: "Logged out successfully" });
});

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Generates a single-use reset token (1-hour TTL) and emails a link to the
// user.  Always returns 200 regardless of whether the email exists — this
// prevents account enumeration.
router.post("/forgot-password", emailActionLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Bad Request", message: "email is required" }); return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    // Always respond with 200 — do not reveal whether the account exists.
    if (!users[0]) {
      res.json({ message: "If that email is registered you will receive a reset link shortly." }); return;
    }

    const user  = users[0];
    const token = randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await db
      .update(usersTable)
      .set({ resetToken: token, resetTokenExpiresAt: expiry })
      .where(eq(usersTable.id, user.id));

    const mail = buildPasswordResetEmail(user.name, token);
    await sendMail({ ...mail, to: user.email });

    res.json({ message: "If that email is registered you will receive a reset link shortly." });
  } catch (err) {
    console.error("forgot-password error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to process request" });
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// Validates the reset token and sets a new password.  Token is cleared
// after use so it cannot be replayed.
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: "Bad Request", message: "token and password are required" }); return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Bad Request", message: "Password must be at least 8 characters" }); return;
    }

    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.resetToken, token))
      .limit(1);

    const user = users[0];

    if (!user || !user.resetToken || !user.resetTokenExpiresAt) {
      res.status(400).json({ error: "Bad Request", message: "Reset token is invalid or has already been used" }); return;
    }

    if (new Date(user.resetTokenExpiresAt) < new Date()) {
      // Clear the expired token proactively
      await db
        .update(usersTable)
        .set({ resetToken: null, resetTokenExpiresAt: null })
        .where(eq(usersTable.id, user.id));
      res.status(400).json({ error: "Bad Request", message: "Reset token has expired. Please request a new one." }); return;
    }

    // Set new password and clear the token in a single update (single-use guarantee)
    await db
      .update(usersTable)
      .set({
        hashedPassword:      hashPassword(password),
        resetToken:          null,
        resetTokenExpiresAt: null,
      })
      .where(eq(usersTable.id, user.id));

    res.json({ message: "Password updated successfully. You can now log in with your new password." });
  } catch (err) {
    console.error("reset-password error:", err);
    res.status(500).json({ error: "Internal Server Error", message: "Failed to reset password" });
  }
});

export default router;
