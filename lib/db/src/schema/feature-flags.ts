// lib/db/src/schema/feature-flags.ts
// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL FEATURE FLAG DEFINITIONS
// Single source of truth — used by:
//   - plans.ts        (plan featureFlags arrays)
//   - licenses.ts     (admin generate modal ALL_FEATURES)
//   - portal.ts       (license file features array)
//   - email app       (reads features[] from license file to gate functionality)
//
// Rule: only flags that map to a working gate in the email app are listed here.
// Verified against: FeatureGate.jsx, App.jsx routes, license.py _V2_FLAG_MAP.
// ─────────────────────────────────────────────────────────────────────────────

export const FEATURE_FLAGS = [
  // ── Core (all plans) ──────────────────────────────────────────────────────
  "campaign_management",       // Create, schedule, send campaigns
  "template_editors",          // Drag-and-drop + HTML + visual editors
  "subscriber_management",     // Import, manage, export contacts
  "analytics_basic",           // Open/click/bounce rates per campaign
  "suppression_list",          // Global + list-level suppression
  "custom_domains",            // Custom sending + tracking domains
  "webhooks",                  // Outbound webhook triggers
  "segmentation_advanced",     // 8-filter audience segmentation (default=True all plans)
  "audit_logs",                // Full activity audit trail (default=True all plans)

  // ── Pro+ ─────────────────────────────────────────────────────────────────
  "automation",                // Multi-step workflow builder
  "ab_testing",                // Subject / sender A/B split tests
  "api_access",                // REST API for external integrations
  "analytics_advanced",        // Deliverability dashboard + CSV export

  // ── Managed delivery (unlocked when delivery plan is active) ─────────────
  "managed_delivery",          // Email app knows delivery is via ZeniPost infra
  "dedicated_ip",              // Email app enables dedicated IP sending path
  "ip_warmup",                 // Email app activates warmup throttling logic
] as const;

export type FeatureFlag = typeof FEATURE_FLAGS[number];

// ── Per-plan defaults ─────────────────────────────────────────────────────────

export const PLAN_FEATURE_FLAGS: Record<string, FeatureFlag[]> = {
  starter: [
    "campaign_management",
    "template_editors",
    "subscriber_management",
    "analytics_basic",
    "suppression_list",
    "custom_domains",
    "webhooks",
    "segmentation_advanced",
    "audit_logs",
  ],
  pro: [
    "campaign_management",
    "template_editors",
    "subscriber_management",
    "analytics_basic",
    "suppression_list",
    "custom_domains",
    "webhooks",
    "segmentation_advanced",
    "audit_logs",
    "automation",
    "ab_testing",
    "api_access",
    "analytics_advanced",
  ],
  agency: [
    "campaign_management",
    "template_editors",
    "subscriber_management",
    "analytics_basic",
    "suppression_list",
    "custom_domains",
    "webhooks",
    "segmentation_advanced",
    "audit_logs",
    "automation",
    "ab_testing",
    "api_access",
    "analytics_advanced",
  ],
};

// ── Human-readable labels (used in admin UI + plans page) ────────────────────

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  campaign_management:   "Campaign Management",
  template_editors:      "Email Builder",
  subscriber_management: "Subscriber Management",
  analytics_basic:       "Basic Analytics",
  suppression_list:      "Suppression Management",
  custom_domains:        "Custom Sending Domains",
  webhooks:              "Webhooks",
  segmentation_advanced: "Audience Segmentation",
  audit_logs:            "Audit Trail",
  automation:            "Automation Workflows",
  ab_testing:            "A/B Testing",
  api_access:            "API Access",
  analytics_advanced:    "Deliverability Dashboard",
  managed_delivery:      "Managed Delivery (ZeniPost Infra)",
  dedicated_ip:          "Dedicated IP",
  ip_warmup:             "IP Warmup",
};
