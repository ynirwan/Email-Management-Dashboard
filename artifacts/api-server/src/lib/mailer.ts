// artifacts/api-server/src/lib/mailer.ts
//
// Thin nodemailer wrapper.  Reads SMTP config from env vars:
//
//   SMTP_HOST     — required to enable real email sending
//   SMTP_PORT     — default 587
//   SMTP_SECURE   — "true" for port 465 TLS; default false (STARTTLS on 587)
//   SMTP_USER     — SMTP auth username
//   SMTP_PASS     — SMTP auth password
//   SMTP_FROM     — "From" address, default "ZeniPost <noreply@zenipost.com>"
//
// When SMTP_HOST is absent the module falls back to console logging so the
// server runs in dev/test environments without any SMTP configuration.

import nodemailer from "nodemailer";

const SMTP_HOST   = process.env["SMTP_HOST"]   ?? "";
const SMTP_PORT   = parseInt(process.env["SMTP_PORT"] ?? "587", 10);
const SMTP_SECURE = process.env["SMTP_SECURE"] === "true";
const SMTP_USER   = process.env["SMTP_USER"]   ?? "";
const SMTP_PASS   = process.env["SMTP_PASS"]   ?? "";
const SMTP_FROM   = process.env["SMTP_FROM"]   ?? "ZeniPost <noreply@zenipost.com>";
const APP_URL     = process.env["APP_URL"]      ?? "https://app.zenipost.com";

// Lazily initialised so the import never throws at module-load time even when
// SMTP is unconfigured.
let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter | null {
  if (!SMTP_HOST) return null;
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   SMTP_PORT,
    secure: SMTP_SECURE,
    ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASS } } : {}),
  });
  return _transport;
}

interface MailOptions {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
}

/**
 * sendMail — sends an email or, when SMTP is unconfigured, logs to console.
 * Never throws — callers should not fail a user request because email failed.
 */
export async function sendMail(opts: MailOptions): Promise<void> {
  const transport = getTransport();
  if (!transport) {
    // Dev / CI fallback — print the email content so it can be read in logs.
    console.log(
      `[MAILER] SMTP not configured — would have sent:\n` +
      `  To:      ${opts.to}\n` +
      `  Subject: ${opts.subject}\n` +
      `  Body:    ${opts.text ?? "(html only)"}`
    );
    return;
  }
  try {
    await transport.sendMail({ from: SMTP_FROM, ...opts });
  } catch (err) {
    // Log but don't rethrow — a failed email must never break the API response.
    console.error("[MAILER] Failed to send email:", err);
  }
}

// ── Email template helpers ────────────────────────────────────────────────────

export function buildPasswordResetEmail(name: string, token: string): MailOptions {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  return {
    to:      "", // filled in by the caller
    subject: "Reset your ZeniPost password",
    text:
      `Hi ${name},\n\n` +
      `You requested a password reset. Use the link below within 1 hour:\n\n` +
      `${resetUrl}\n\n` +
      `If you did not request this, you can safely ignore this email.\n\n` +
      `— ZeniPost`,
    html:
      `<p>Hi <strong>${escHtml(name)}</strong>,</p>` +
      `<p>You requested a password reset. Click the button below — the link expires in <strong>1 hour</strong>.</p>` +
      `<p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Reset password</a></p>` +
      `<p>Or copy this link into your browser:<br><code>${resetUrl}</code></p>` +
      `<p>If you did not request this, you can safely ignore this email.</p>` +
      `<p>— ZeniPost</p>`,
  };
}

export function buildVerificationEmail(name: string, token: string): MailOptions {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  return {
    to:      "",
    subject: "Verify your ZeniPost email address",
    text:
      `Hi ${name},\n\n` +
      `Thanks for signing up! Please verify your email address by visiting:\n\n` +
      `${verifyUrl}\n\n` +
      `This link expires in 24 hours.\n\n` +
      `— ZeniPost`,
    html:
      `<p>Hi <strong>${escHtml(name)}</strong>,</p>` +
      `<p>Thanks for signing up! Please verify your email address.</p>` +
      `<p><a href="${verifyUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Verify email</a></p>` +
      `<p>Or copy this link:<br><code>${verifyUrl}</code></p>` +
      `<p>This link expires in <strong>24 hours</strong>.</p>` +
      `<p>— ZeniPost</p>`,
  };
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
