// artifacts/api-server/src/lib/license-builder.ts
//
// Single source of truth for the ZeniPost license file payload (v2 format).
//
// ALL license file generation — admin download, customer portal download,
// POST /licenses (create), and POST /licenses/:id/renew — calls buildLicensePayload()
// from this module.  Never duplicate this logic elsewhere.
//
// If you need to add a new field to the license JWT, make the change here only.
// The email-app reads the fields documented below.

const APP_URL = process.env["APP_URL"] || "https://app.zenipost.com";

function parseFeatures(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return []; }
}

function toISO(v: unknown): string {
  if (!v) return new Date().toISOString();
  return v instanceof Date ? v.toISOString() : String(v);
}

/**
 * buildLicensePayload(lic, owner) → plain object ready to be signed as a JWT.
 *
 * Fields consumed by the email-app:
 *   license_id          — identifies this license back to the dashboard
 *   domain              — must match APP_DOMAIN env in email-app
 *   root_domain         — used for subdomain matching
 *   customer_id / name / email — display / logging
 *   plan                — gates feature visibility in email-app UI
 *   emails_per_month    — quota limit (enforced by email-app)
 *   subscribers_limit   — quota limit (enforced by email-app)
 *   features            — string[] of FeatureFlag values — gates functionality
 *   issued_at           — ISO string
 *   expires_at          — ISO string — email-app checks daily, blocks on expiry
 *   product / version / format — sanity-check on startup
 *   ping_url            — where email-app pings to confirm license validity
 *   admin_access_allowed — if true, email-app registers /auth/admin-access route
 *   delivery            — null if self-managed; delivery-plan object if managed
 */
export function buildLicensePayload(lic: any, owner: any): object {
  const features = parseFeatures(lic.features);

  const delivery = lic.deliveryPlanId
    ? {
        plan_id:      lic.deliveryPlanId,
        plan_name:    lic.deliveryPlanName   ?? null,
        emails_limit: lic.deliveryEmailsLimit ?? null,
        infra:        lic.deliveryInfra       ?? null,
        routing:      lic.deliveryRouting     ?? null,
        active_since: lic.deliveryActiveSince ? toISO(lic.deliveryActiveSince) : null,
        dedicated_ip: features.includes("dedicated_ip"),
        ip_warmup:    features.includes("ip_warmup"),
      }
    : null;

  return {
    license_id:           `lic_${lic.id}`,
    domain:               lic.domain,
    root_domain:          lic.rootDomain ?? "",
    customer_id:          lic.customerId,
    customer_name:        owner?.company ?? owner?.name ?? "Unknown",
    customer_email:       owner?.email   ?? "",
    plan:                 lic.plan,
    emails_per_month:     lic.emailsPerMonth,
    subscribers_limit:    lic.subscribersLimit,
    features,
    issued_at:            toISO(lic.issuedAt),
    expires_at:           toISO(lic.expiresAt),
    product:              "ZeniPost Email Platform",
    version:              "2.0",
    format:               "zenipost-license-v2",
    ping_url:             `${APP_URL}/api/licenses/ping`,
    admin_access_allowed: (lic.isManaged ?? false) && (lic.adminAccessEnabled ?? false),
    delivery,
  };
}
