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

app.use(cors({
  origin: (origin, callback) => {
    // No Origin header → non-browser request (CLI, server-to-server) → allow.
    if (!origin) return callback(null, true);
    // Listed origin → allow.
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    // Everything else → block.
    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  credentials: true,   // required for httpOnly cookie delivery
}));
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
