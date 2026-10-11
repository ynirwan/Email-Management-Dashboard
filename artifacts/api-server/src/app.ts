import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import router from "./routes";
import adminUsageRouter from "./routes/admin-usage.js";


const app: Express = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Explicit origin allowlist — fail closed when ALLOWED_ORIGIN is not configured.
// Supports a comma-separated list for staging + production in the same deploy
// (e.g. ALLOWED_ORIGIN=https://dashboard.example.com,https://staging.example.com).
//
// Non-browser callers (curl, server-to-server) send no Origin header and are
// allowed through regardless — they are not subject to the browser SOP.
const _raw = (process.env["ALLOWED_ORIGIN"] ?? "").trim();
const ALLOWED_ORIGINS: string[] = _raw
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

if (ALLOWED_ORIGINS.length === 0) {
  console.warn(
    "[SECURITY] ALLOWED_ORIGIN is not set. " +
    "All cross-origin browser requests will be blocked. " +
    "Set ALLOWED_ORIGIN=https://your-dashboard-domain.com in .env to allow the frontend."
  );
}

const allowlistedCors = cors({
  origin: (origin, callback) => callback(null, !origin || ALLOWED_ORIGINS.includes(origin)),
  credentials: true, // required for httpOnly cookie delivery
});

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (!origin) return next();

  // Replit terminates TLS at its proxy, so use forwarded host/protocol when
  // present to recognize the browser's same-origin requests.
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = (forwardedHost || req.get("host") || "").toLowerCase();
  const forwardedProtocol = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestProtocol = (forwardedProtocol || req.protocol).replace(/:$/, "").toLowerCase();

  try {
    const parsedOrigin = new URL(origin);
    if (
      parsedOrigin.host.toLowerCase() === requestHost &&
      parsedOrigin.protocol.slice(0, -1).toLowerCase() === requestProtocol
    ) {
      return next();
    }
  } catch {
    return res.status(403).json({ message: "Origin is not allowed" });
  }

  if (ALLOWED_ORIGINS.includes(origin)) return allowlistedCors(req, res, next);
  return res.status(403).json({ message: "Origin is not allowed" });
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Security headers ──────────────────────────────────────────────────────────
// Applied to every response.  CSP restricts what the browser loads/executes;
// 'unsafe-inline' in style-src is required by Tailwind's inline utility approach.
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options",  "nosniff");
  res.setHeader("X-Frame-Options",         "DENY");
  res.setHeader("Referrer-Policy",         "strict-origin-when-cross-origin");
  res.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
  res.setHeader("Content-Security-Policy", [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self'",
    "font-src 'self' data:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join("; "));
  next();
});

app.use("/api", router);
app.use("/api/admin/usage", adminUsageRouter);


export default app;
