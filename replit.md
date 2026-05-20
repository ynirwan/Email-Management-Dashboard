# ZeniPost Email Platform

A full-stack email platform dashboard that lets teams manage licenses, domains, billing, users, and delivery plans for a self-hosted email infrastructure product.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (tsx, port 8080)
- `pnpm --filter @workspace/email-platform run dev` — run the frontend (Vite, port 25636)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required env: `JWT_SECRET` — at least 32 chars (auto-generated)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite 7, Tailwind CSS v4, shadcn/ui, Wouter routing
- API: Express 5, JWT auth (bcryptjs + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- Email: Nodemailer (SMTP, falls back to console in dev)
- API codegen: Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/db/src/schema/` — Drizzle schema (users, domains, licenses, invoices, settings)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/auth.ts` — JWT auth helpers
- `artifacts/api-server/src/lib/mailer.ts` — Nodemailer wrapper
- `artifacts/api-server/src/lib/license-builder.ts` — License JWT builder
- `artifacts/email-platform/src/pages/` — React pages (dashboard, auth, legal, public)
- `artifacts/email-platform/src/hooks/` — Custom hooks (use-auth, use-billing, etc.)

## Architecture decisions

- JWT-based auth (not session) — stateless, works across multiple instances
- Email verification required before login — `isActive: false` until token confirmed
- License files are JWTs signed with `LICENSE_SECRET` — email app validates them on each ping
- All license operations go through `buildLicensePayload` in `license-builder.ts` — single source of truth
- Delivery plans are stored as columns on the licenses table (no separate table)

## Product

ZeniPost is a self-hosted email infrastructure platform. Admins manage customers, licenses, billing, and delivery plans. Customers manage their own domains, licenses, and billing. License files (JWTs) are installed on customer servers and ping back for validity checks.

**Routes:**
- `/` — Public landing page
- `/login`, `/register`, `/admin` — Auth pages
- `/dashboard` — User overview (usage, quick actions)
- `/dashboard/licenses` — User license management
- `/dashboard/domains` — User domain management
- `/dashboard/billing` — User billing & invoices
- `/dashboard/account` — Account settings
- `/dashboard/users` — Admin: user management
- `/dashboard/admin/licenses` — Admin: license management
- `/dashboard/admin/billing` — Admin: billing management
- `/dashboard/admin/usage` — Admin: usage enforcement
- `/dashboard/plans` — Admin: plan configuration
- `/dashboard/audit` — Admin: audit logs
- `/dashboard/settings` — Admin: platform settings

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- JWT_SECRET must be ≥32 chars — server refuses to start otherwise
- SMTP is optional in dev — emails fall back to console.log
- Run `pnpm --filter @workspace/db run push` after any schema change
- The `lib/api-client-react` generated files use the existing openapi.yaml (basic CRUD only); many dashboard features use direct fetch calls in `src/lib/api.ts`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
