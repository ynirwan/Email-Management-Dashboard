# User Dashboard Plan (Execution-Ready)

## Context
The current app has strong admin-focused coverage (users, licenses, billing, settings) while the **end-user dashboard** and self-service experience are still minimal. This plan defines a practical path to ship a high-value customer dashboard quickly while reusing existing backend capabilities.

## Product Goal
Build a customer dashboard that answers 4 daily questions in under 30 seconds:
1. **How is my account doing?** (usage + limits + account health)
2. **What can I do right now?** (manage domains, download licenses, pay invoices, upgrade)
3. **What is at risk?** (expiring/revoked licenses, overdue invoices, near-limit usage)
4. **What should I do next?** (recommended actions and CTAs)

## Success Criteria (v1)
- A logged-in non-admin user can:
  - View account usage and plan limits.
  - View and manage their domains.
  - View licenses and download license files.
  - View invoices and payment state.
  - Request/perform plan upgrade.
- 90%+ of dashboard pages load from real API data (no mock fallback).
- Core user journeys complete in <3 clicks.

---

## Phase 1 — Foundation & Information Architecture (3-4 days)

### 1) Define user dashboard routes and nav
- Add dashboard IA for users:
  - `/dashboard` (Home)
  - `/dashboard/usage`
  - `/dashboard/domains`
  - `/dashboard/licenses`
  - `/dashboard/billing`
  - `/dashboard/account`
- Ensure non-admin users only see these routes and related sidebar entries.

### 2) Create dashboard data contracts
- Use `/api/portal` as primary snapshot endpoint for home/overview.
- Keep feature pages on dedicated endpoints:
  - Domains: `/api/domains`
  - License download: `/api/portal/license/:id/download`
  - Billing: `/api/billing/invoices`
- Add missing response typing in frontend hooks if needed.

### 3) UX baseline states
For each user page, design and implement:
- Loading state
- Empty state
- Error/retry state
- Success state

**Deliverable:** navigable user dashboard shell with real data plumbing.

---

## Phase 2 — Build Core User Pages (1-2 weeks)

### 1) User Home (`/dashboard`)
Widgets:
- Plan card (plan name, price, included limits)
- Usage meters (emails used/limit, subscribers used/limit)
- License health summary (active/expiring/revoked)
- Billing status summary (paid/pending/overdue counts)
- Action center with CTAs:
  - Add domain
  - Download license
  - Upgrade plan
  - Contact support

### 2) Domains (`/dashboard/domains`)
Capabilities:
- List own domains
- Add domain
- Delete domain
- Verify domain status display
- Generate/download domain-linked license (if product flow still requires)

### 3) Licenses (`/dashboard/licenses`)
Capabilities:
- List current user licenses (status + expiration)
- Filter by status
- Download license JSON
- Surface warnings for expiring/revoked licenses

### 4) Billing (`/dashboard/billing`)
Capabilities:
- List invoices for current user only
- Status chips (paid/pending/overdue/cancelled)
- Display due date and paid date
- Primary CTA when overdue/pending (Pay now / Contact billing)

### 5) Account (`/dashboard/account`)
Capabilities:
- Profile info (name, company, email)
- Plan details and upgrade CTA
- Security section (future-ready for password reset/session management)

**Deliverable:** fully functional self-service v1 dashboard for non-admin users.

---

## Phase 3 — Monetization & Retention UX (1 week)

### 1) Upgrade funnel
- In-context upsell when usage > 80%.
- Comparison modal for plans (feature and quota deltas).
- Upgrade request flow tied to existing billing upgrade endpoint/process.

### 2) Proactive alerts
- Banner alerts for:
  - License expiring in <=30 days
  - Overdue invoices
  - Maintenance mode / service warnings

### 3) Guided onboarding
For new users (no domains/licenses/invoices):
- Step-by-step checklist:
  1. Add first domain
  2. Generate/download first license
  3. Send first campaign (or connect app)

**Deliverable:** growth-oriented dashboard that drives activation and upgrades.

---

## Phase 4 — Quality, Analytics, and Hardening (ongoing)

### Quality
- E2E tests for top user journeys:
  - login -> overview -> domains -> licenses -> billing
- Contract tests for user-scoped API authorization.

### Analytics
Track user dashboard events:
- Page views per module
- Upgrade CTA clicks
- Domain add success/fail
- License download counts
- Billing overdue resolution time

### Reliability
- Add request caching strategy for snapshot endpoints.
- Add optimistic UI for domain actions where safe.
- Improve retry handling and toast semantics.

---

## Prioritized Implementation Backlog (ordered)
1. User dashboard route/nav split from admin nav.
2. `usePortal` hook + normalized types.
3. User home page widgets wired to `/api/portal`.
4. Domains page (list/add/delete).
5. Licenses page for user scope + download action.
6. Billing page for user scope.
7. Upgrade modal + CTA wiring.
8. Alert banners and onboarding checklist.
9. E2E + analytics instrumentation.

---

## Definition of Done (for v1 release)
- Non-admin user can independently manage domains/licenses and understand billing state.
- No admin-only data leaks into user views.
- No mock data in user dashboard pages.
- Key pages pass typecheck and integration tests.
- Product team can measure activation and upgrade funnel.

---

## Build Sequence Recommendation (start now)
Week 1:
- Route/nav split + `usePortal` + Home page widgets.

Week 2:
- Domains + Licenses pages + download flow.

Week 3:
- Billing + upgrades + alerts.

Week 4:
- QA hardening + analytics + polish.
