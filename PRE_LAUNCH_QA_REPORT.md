# Pre-Launch QA & Logical Review
**Date:** 2026-06-21  
**Scope:** `Email-app_self_hosted` (FastAPI + Celery + MongoDB + React) AND `Email-Management-Dashboard` (Express/TypeScript + PostgreSQL + React/TypeScript)  
**Legend:** ✅ Pass · ⚠️ Needs Manual Verification · 🔴 Issue Found

---

## Section 1 — Functional & Logical Correctness

### 1.1 Auth Flows

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 1.1.1 | Email-app login issues correct JWT pair | ✅ Pass | Access (24h) + Refresh (7d) tokens; `token_version` revocation on logout/password-change |
| 1.1.2 | Refresh token rejected when access token used | ✅ Pass | `expected_type=TOKEN_TYPE_REFRESH` validation present |
| 1.1.3 | Token version revocation on logout | ✅ Pass | `token_version` bumped atomically; old refresh tokens rejected |
| 1.1.4 | Dashboard registration flow | 🔴 BUG-01 | |
| 1.1.5 | Dashboard email verification required before login | ✅ Pass | `isActive: false` on creation; login rejects unverified accounts |
| 1.1.6 | Dashboard password-reset is single-use, 1h TTL | ✅ Pass | Token cleared on use; expiry enforced |
| 1.1.7 | Dashboard forgot-password doesn't reveal email existence | ✅ Pass | Generic 200 always returned |
| 1.1.8 | Email-app registration gated by config flag | ✅ Pass | `REGISTRATION_ENABLED=false` by default |
| 1.1.9 | Account enumeration prevented on login | ✅ Pass | Generic 401 for both "no user" and "wrong password" |

**BUG-01 🔴 HIGH — Dashboard frontend registration assumes token in response**  
File: `artifacts/email-platform/src/hooks/use-auth.ts`, `registerMutation.onSuccess`  
What's wrong: The backend returns `{ message: "...", userId }` on registration — no `token`, no `user`. But `onSuccess` does:
```js
localStorage.setItem("token", data.token);          // stores "undefined"
queryClient.setQueryData(["/api/auth/me"], data.user); // sets undefined
setLocation("/dashboard");                           // redirect with broken auth
```
The user is sent to `/dashboard` with a junk token, immediately bounced back to `/login`, and left with a `"undefined"` string in localStorage that prevents future auth checks from working correctly.  
Fix: Replace `onSuccess` with a "check your email to verify" message; do not attempt to store a token or navigate to the dashboard.

---

### 1.2 Campaign Lifecycle

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 1.2.1 | State machine transitions are explicit | ✅ Pass | `draft→scheduled→queued→sending→completed/paused/failed/cancelled` — validated in service layer |
| 1.2.2 | Duplicate-send prevention | ✅ Pass | Per-recipient Redis lock + delivery-state dedup in Mongo |
| 1.2.3 | Retry does not re-send already-sent emails | ✅ Pass | Step 4 checks `delivery_state` and `email_logs` for `sent/delivered` before any send |
| 1.2.4 | Suppression checked before every send | ✅ Pass | Step 4b queries suppressions; centralized in task flow |
| 1.2.5 | `queued_count` floor protection | ✅ Pass | `_decrement_queued` guards with `{"queued_count": {"$gt": 0}}` |
| 1.2.6 | Campaign abort flag respected | ✅ Pass | Checked before resource allocation; counter still decremented |
| 1.2.7 | `list_campaigns` without pagination | 🔴 BUG-02 | |
| 1.2.8 | Unsubscribe URL fallback | 🔴 BUG-03 | |

**BUG-02 🔴 HIGH — `list_campaigns` has no pagination**  
File: `backend/routes/campaigns.py`  
Loads ALL campaigns into memory with no `limit`/`skip`. Will silently degrade (OOM or timeout) at scale.  
Fix: Add `limit` (default 50, max 200) and `skip`/`page` params. Return `{ items, total, page, limit }`.

**BUG-03 🔴 HIGH — Unsubscribe URL silently falls back to "#"**  
File: `backend/tasks/campaign/email_campaign_tasks.py`  
When unsubscribe token generation fails, the email is still sent with `unsubscribe_url="#"` — a broken, non-functional link. CAN-SPAM/GDPR violation.  
Fix: Abort the send and return `{"status": "failed", "reason": "unsubscribe_url_generation_failed"}` rather than sending an email recipients cannot opt out of.

---

### 1.3 Webhook / SES Event Processing

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 1.3.1 | SNS signature verification | ✅ Pass | Full AWS spec: cert URL validation, canonical string, RSA verify |
| 1.3.2 | Cert URL restricted to `sns.*.amazonaws.com` | ✅ Pass | `_SNS_CERT_HOST` regex; S3 or attacker-controlled URLs rejected |
| 1.3.3 | Bounce → suppression created immediately | ✅ Pass | `create_suppression_from_bounce` called in `process_ses_event_immediate` |
| 1.3.4 | Complaint → suppression created immediately | ✅ Pass | Same pattern |
| 1.3.5 | Webhook admin endpoints unauthenticated | 🔴 BUG-04 | |
| 1.3.6 | SNS subscription auto-confirmed without TopicArn whitelist | 🔴 BUG-05 | |
| 1.3.7 | Webhook stats read-modify-write race | ⚠️ Verify | `update_webhook_stats` is not atomic — tolerable for approximate stats, not for exact counts |

**BUG-04 🔴 CRITICAL — Webhook admin endpoints have no authentication**  
File: `backend/routes/webhooks.py`  
- `DELETE /api/webhooks/queues/clear` — anyone can wipe all SES event queues (suppressions missed, deliverability damage)  
- `GET /api/webhooks/queues/inspect/{queue_name}` — dumps queue contents including recipient emails  
- `POST /api/webhooks/test` — triggers test event processing  
- `GET /api/webhooks/stats` — exposes internal config and queue sizes  
Fix: Add `Depends(get_current_user)` to all four. `/queues/clear` should additionally enforce admin role.

**BUG-05 🔴 MEDIUM — SNS subscription auto-confirmed without TopicArn validation**  
File: `backend/routes/webhooks.py`  
`auto_confirm_subscription: True` will confirm any SNS subscription, including from an attacker-controlled topic. Attacker can then inject crafted bounce/complaint events to mass-suppress legitimate email addresses.  
Fix: Validate `payload.TopicArn` against an allowlist of expected SES-owned ARNs from settings before confirming.

---

### 1.4 Suppression System

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 1.4.1 | Duplicate `POST /import` route — dead code | 🔴 BUG-06 | |
| 1.4.2 | `is_email_suppressed` checks global then list-specific | ✅ Pass | Correct layered check |
| 1.4.3 | Bulk suppression check uses single query | ✅ Pass | `bulk_check_suppressions_optimized` correct |

**BUG-06 🔴 CRITICAL — Duplicate `POST /import` route; second (correct) handler is dead code**  
File: `backend/routes/suppressions.py`  
`@router.post("/import")` appears twice. FastAPI silently uses the first. The second definition (more complete, with background task processing) is never reachable.  
Fix: Delete the first incomplete definition; keep only the second.

---

## Section 2 — Data Integrity

### 2.1 MongoDB

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.1.1 | Atomic counter decrements floored at 0 | ✅ Pass | `_decrement_queued` guards with `{"queued_count": {"$gt": 0}}` |
| 2.1.2 | Terminal delivery state never overwritten | ✅ Pass | `$or` filter in upsert prevents non-terminal states overwriting terminal |
| 2.1.3 | `upsert_delivery_state` is non-fatal | ✅ Pass | Logs warning, doesn't re-raise |
| 2.1.4 | `email_logs` is append-only | ✅ Pass | `insert_one` for log entries |
| 2.1.5 | Multi-tenant scoping | ✅ Pass | workspace_id scoped throughout |
| 2.1.6 | SES `update_many` on email address | ⚠️ Verify | `process_ses_event_immediate` updates all logs matching `recipient_email` across all campaigns — verify this is intentional vs. scoping to `message_id` |

### 2.2 PostgreSQL (Dashboard)

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 2.2.1 | `GET /api/licenses` in-memory filtering | 🔴 BUG-07 | |
| 2.2.2 | Email uniqueness at DB level | ⚠️ Verify | Application-level duplicate check present; verify Drizzle migration includes `UNIQUE` constraint on `users.email` |
| 2.2.3 | Password reset token cleared on first use | ✅ Pass | Token nulled in same update |

**BUG-07 🔴 HIGH — `GET /api/licenses` does application-layer filtering after full table fetch**  
File: `artifacts/api-server/src/routes/licenses.ts`  
Fetches all license rows then filters in JS memory. Does not scale.  
Fix: Push `search`, `status`, `userId` into the Drizzle `where()` clause. Add DB indexes on `licenses.status` and `licenses.userId`.

---

## Section 3 — Security Review

### 3.1 Auth & Authorization

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 3.1.1 | Rate limiting on login (email-app) | 🔴 BUG-08 | |
| 3.1.2 | Rate limiting on auth endpoints (dashboard) | 🔴 BUG-08 | |
| 3.1.3 | JWT secret validated in production | ✅ Pass | Both systems enforce strong secrets |
| 3.1.4 | HMAC tracking tokens are purpose-bound | ✅ Pass | Purpose prefix + constant-time compare + TTL |
| 3.1.5 | SMTP credentials encrypted at rest | ✅ Pass | Fernet; key required in production |
| 3.1.6 | Admin-access issues full refresh token | 🔴 BUG-09 | |
| 3.1.7 | Dashboard logout doesn't invalidate JWT | ⚠️ Verify | No token versioning; 7-day tokens can't be revoked |
| 3.1.8 | `decrypt_password` bare except | 🔴 BUG-10 | |

**BUG-08 🔴 CRITICAL — No rate limiting on login/auth endpoints**  
Files: `backend/routes/auth.py`; `artifacts/api-server/src/routes/auth.ts`  
No IP-based throttling on `/login`, `/forgot-password`, or `/resend-verification` in either system. Unlimited brute-force and credential-stuffing attacks possible.  
Fix (email-app): Add `@limiter.limit("10/minute")` via slowapi. Fix (dashboard): Add `express-rate-limit` scoped to auth routes (e.g. 10/15min per IP for login).

**BUG-09 🔴 MEDIUM — Admin-access endpoint issues full refresh token**  
File: `backend/routes/auth.py`, `/admin-access` endpoint  
Admin sessions should be short-lived. Issuing a refresh token alongside the access token lets the session extend indefinitely.  
Fix: Return only the access token for admin-access; omit the refresh token.

**BUG-10 🔴 MEDIUM — `decrypt_password` bare `except:` silently returns ""**  
File: `backend/core/security.py`  
On decryption failure (key rotation, corrupted credential), function returns `""` without logging. The SMTP connection fails with an auth error, but the root cause is completely invisible.  
Fix: `except Exception as e: logger.error(f"SMTP credential decryption failed: {e}"); raise`

---

### 3.2 Injection & XSS

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 3.2.1 | Tokens in localStorage | 🔴 BUG-11 | |
| 3.2.2 | Missing Content-Security-Policy | 🔴 BUG-12 | |
| 3.2.3 | Click redirect validates URL scheme | ✅ Pass | Only `http`/`https` allowed; `javascript:` rejected |
| 3.2.4 | Template personalization sanitized | ⚠️ Verify | Confirm contact custom fields are sanitized before HTML injection |

**BUG-11 🔴 HIGH — JWT tokens stored in localStorage**  
Files: `frontend/src/api.js`; `artifacts/email-platform/src/hooks/use-auth.ts`  
Any XSS — including via stored contact data rendered in UI — gives an attacker all session tokens.  
Fix (preferred): Switch to `httpOnly SameSite=Strict` cookies. At minimum, implement a strong CSP (BUG-12) before launch.

**BUG-12 🔴 HIGH — No Content-Security-Policy header**  
File: `backend/main.py`, `SecurityHeadersMiddleware`  
X-Content-Type-Options, X-Frame-Options, HSTS are set but CSP is absent. XSS is completely unrestricted.  
Fix: Add `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'` (tune for your CDN/scripts).

---

### 3.3 CORS & Network

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 3.3.1 | Email-app `allow_origins=["*"]` | ⚠️ Verify | `allow_credentials=False` limits risk; still, restrict to actual frontend domain in production |
| 3.3.2 | Dashboard API CORS completely open | 🔴 BUG-13 | |
| 3.3.3 | System monitoring endpoints unauthenticated | 🔴 BUG-14 | |

**BUG-13 🔴 CRITICAL — Dashboard API has completely open CORS**  
File: `artifacts/api-server/src/app.ts`  
`app.use(cors())` — no origin list. Any website can make cross-origin requests to the admin API from a victim's browser.  
Fix: `app.use(cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true }))`

**BUG-14 🔴 CRITICAL — System monitoring endpoints require no authentication**  
File: `backend/main.py`  
`GET /api/metrics`, `/api/system/info`, `/api/system/workers`, `/api/system/queues` — all public. Exposes Python version, hostname, memory usage, CPU, worker list, queue depths — a detailed attack surface fingerprint.  
Fix: Add `Depends(get_current_user)` to all four. If Prometheus scraping needs unauthenticated access, use a separate internal-only endpoint.

---

### 3.4 Secrets & Config

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 3.4.1 | `.env` committed with real/weak values | 🔴 BUG-15 | |
| 3.4.2 | `ENVIRONMENT` is a free-form string | ⚠️ Verify | Typo like `"developement"` silently enables production validation in dev |
| 3.4.3 | `DEBUG_MODE=True` blocked in production | ✅ Pass | Config validator enforces this |
| 3.4.4 | Docs (`/docs`, `/redoc`) disabled in production | ✅ Pass | Gated by `DEBUG_MODE` |
| 3.4.5 | `MOCK_EMAIL_SENDING=false` in dev `.env` | 🔴 Issue | Real emails sent from development by default |

**BUG-15 🔴 CRITICAL — `.env` committed with real/weak secrets**  
File: `backend/.env`  
- `JWT_SECRET=supersecretkey` (12 chars — trivially brute-forced)  
- `MASTER_ENCRYPTION_KEY=lUuIwsIeBDEArb4N_KpDb7Ax8IVVJ-nAvHYCZYGg4RU=` (real working Fernet key)  
- `LICENSE_SIGNING_SECRET=zenipost-license-secret-2026` (shared default)  
- `ADMIN_ACCESS_SECRET=zenipost-admin-access-secret-2026` (shared default)  
- `MONGODB_URI=mongodb://admin:password@mongodb:27017/...`  
Fix: (1) Add `.env` to `.gitignore` and remove it from the repo immediately. (2) Create `.env.example` with placeholder values only. (3) Rotate the committed Fernet key and all signing secrets in all environments. (4) Set `MOCK_EMAIL_SENDING=true` in `.env.example`.

---

## Section 4 — Performance & Reliability

### 4.1 Celery / Async

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 4.1.1 | `ses_critical` queue missing from `task_queues` | 🔴 BUG-16 | |
| 4.1.2 | `task_acks_late=False` | ⚠️ Verify | `task_reject_on_worker_lost=True` mitigates hard crashes; consider `task_acks_late=True` for email tasks given idempotency already in place |
| 4.1.3 | Idempotent task design | ✅ Pass | Redis lock → delivery-state dedup → suppression check — excellent |
| 4.1.4 | DLQ routing | ✅ Pass | Circuit-breaker sends to DLQ; periodic retry scheduled |
| 4.1.5 | Reconciliation watchdog | ✅ Pass | `reconcile_sending_campaigns` beat task every 10 min |
| 4.1.6 | Tracking fire-and-forget failures | 🔴 BUG-17 | |

**BUG-16 🔴 HIGH — `ses_critical` queue routed but not declared in `task_queues`**  
File: `backend/celery_app.py`  
`task_routes` sends `tasks.process_critical_ses_events → ses_critical`, but no `Queue("ses_critical", ...)` is in `task_queues`. Workers don't consume this queue by default. Critical bounce re-processing tasks sit unprocessed.  
Fix: Add `Queue("ses_critical", Exchange("ses_critical", type="direct"), routing_key="ses_critical")` to `task_queues`. Ensure at least one worker process consumes from `ses_critical`.

**BUG-17 🔴 MEDIUM — Open/click tracking `create_task` failures are invisible**  
File: `backend/routes/tracking.py`  
`asyncio.create_task(_record_open(...))` — fire-and-forget. Mongo failures are silently swallowed; analytics are systematically undercounted with no way to diagnose it.  
Fix: Attach a done-callback: `task.add_done_callback(lambda t: logger.error(f"Tracking failed: {t.exception()}") if t.exception() else None)` — or push to a Celery task for automatic retry.

### 4.2 Redis

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 4.2.1 | `maxmemory-policy: allkeys-lru` | 🔴 BUG-18 | |
| 4.2.2 | Namespaced keys | ✅ Pass | Consistent namespacing throughout |
| 4.2.3 | Explicit TTLs on locks | ✅ Pass | `_send_lock_ttl = TASK_TIMEOUT + 60` |

**BUG-18 🔴 CRITICAL — Redis eviction policy can silently destroy Celery task queue**  
File: `docker-compose.yml`  
`maxmemory-policy: allkeys-lru` evicts any key — including Celery broker messages — under memory pressure. A large campaign burst can fill Redis and silently evict unprocessed email tasks. No error, no retry, no alert.  
Fix: Set `maxmemory-policy: noeviction` for the Celery broker (Redis fails loudly when full, rather than silently losing tasks). If Redis serves both broker and cache, split them: one instance/DB with `noeviction` for the broker, one with `allkeys-lru` for caches.

### 4.3 Query Performance

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 4.3.1 | `get_current_user` hits DB on every request | ⚠️ Verify | No caching; at scale consider short-TTL Redis cache keyed by `user_id:token_version` |
| 4.3.2 | Campaign snapshot cached per worker | ✅ Pass | In-process dict cache |
| 4.3.3 | Campaign meta cached per worker | ✅ Pass | In-process dict with status-change eviction |
| 4.3.4 | Provider type detected by `str(email_settings).lower()` | ⚠️ Verify | Fragile string scan — field name change = wrong rate limits silently applied |

---

## Section 5 — Configuration & Environment Readiness

### 5.1 Docker / Deployment

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 5.1.1 | `./backend:/app` bind-mount | 🔴 BUG-19 | |
| 5.1.2 | MongoDB password generated by install script | ✅ Pass | Acceptable if `install.py` generates a strong random password |
| 5.1.3 | MongoDB/Redis not published externally | ✅ Pass | Internal Docker network only |
| 5.1.4 | `celery-beat-data` persistent volume | ✅ Pass | Beat schedule survives container restart |
| 5.1.5 | nginx.conf is HTTP-only placeholder | ⚠️ Verify | Verify `install.py` SSL generation works and placeholder cannot accidentally reach production |

**BUG-19 🔴 HIGH — Production bind-mount of backend code directory**  
File: `docker-compose.yml`  
`./backend:/app` in production means any filesystem change on the host immediately affects live application code without rebuild or validation. An accidental `git pull` on the server = instant production change.  
Fix: Remove the bind-mount for production. Use `COPY` in the Dockerfile and version-tagged image deploys. Keep the bind-mount in `docker-compose.dev.yml` only.

---

## Section 6 — Final Sign-Off Checklist

### MUST FIX before launch

| Bug | Summary | Severity |
|-----|---------|----------|
| BUG-15 | `.env` committed with real secrets — remove from repo, rotate all keys | 🔴 CRITICAL |
| BUG-18 | Redis `allkeys-lru` silently evicts Celery broker tasks | 🔴 CRITICAL |
| BUG-08 | No rate limiting on login/auth endpoints in either system | 🔴 CRITICAL |
| BUG-04 | Webhook admin endpoints (DELETE/inspect/test) have no auth | 🔴 CRITICAL |
| BUG-14 | System monitoring endpoints require no auth | 🔴 CRITICAL |
| BUG-13 | Dashboard API CORS completely open | 🔴 CRITICAL |
| BUG-06 | Duplicate suppression import route — correct handler is dead code | 🔴 CRITICAL |
| BUG-01 | Dashboard registration stores `undefined` token, breaks auth state | 🔴 HIGH |

### Should fix before production traffic

| Bug | Summary | Severity |
|-----|---------|----------|
| BUG-03 | Unsubscribe URL falls back to `"#"` — CAN-SPAM/GDPR risk | 🔴 HIGH |
| BUG-16 | `ses_critical` queue not declared — critical SES tasks unprocessed | 🔴 HIGH |
| BUG-19 | Production bind-mount of backend code | 🔴 HIGH |
| BUG-11 | Tokens in localStorage — XSS exposes all sessions | 🔴 HIGH |
| BUG-12 | No Content-Security-Policy header | 🔴 HIGH |
| BUG-02 | `list_campaigns` has no pagination | 🔴 HIGH |
| BUG-07 | Dashboard license listing in-memory filtering | 🔴 HIGH |

### Medium priority (post-launch sprint)

| Bug | Summary |
|-----|---------|
| BUG-05 | SNS subscription auto-confirmed without TopicArn allowlist |
| BUG-09 | Admin-access issues full refresh token (access-only is safer) |
| BUG-10 | `decrypt_password` bare except silently swallows errors |
| BUG-17 | Tracking fire-and-forget failures are invisible in analytics |

### Needs manual verification before launch

| # | Check |
|---|-------|
| V-01 | `install.py` generates strong MongoDB password and valid SSL nginx config; placeholder cannot reach production |
| V-02 | `personalize_template` sanitizes contact custom fields before HTML injection |
| V-03 | At least one Celery worker in production consumes from `ses_critical` queue |
| V-04 | Drizzle migration has `UNIQUE` constraint on `users.email` |
| V-05 | Dashboard 5-minute `staleTime` on `/api/auth/me` is acceptable (deactivated accounts accessible for up to 5 min) |
| V-06 | `MOCK_EMAIL_SENDING=true` set in `.env.example` and developer onboarding docs |
| V-07 | Dashboard 7-day non-revocable JWT is acceptable for threat model |
| V-08 | Email-app CORS `allow_origins` locked to actual frontend domain in production |

---

### Priority fix order (resource-constrained)

1. BUG-15 — Remove `.env` from repo; rotate Fernet key and all signing secrets  
2. BUG-18 — Switch Redis to `noeviction` for broker  
3. BUG-08 — Add rate limiting to login in both systems  
4. BUG-04 + BUG-14 — Add auth to webhook admin and system monitoring endpoints  
5. BUG-13 — Lock down Dashboard API CORS  
6. BUG-06 — Delete dead suppression import route  
7. BUG-01 — Fix dashboard registration `onSuccess`  
8. BUG-16 — Declare `ses_critical` queue in Celery config  
9. BUG-03 — Never send email with `unsubscribe_url="#"`  
10. BUG-12 — Add CSP header  
11. Remaining bugs in severity order  

---
*Report generated by automated full-codebase review. All findings should be verified by a human engineer before acting on them.*
