// lib/db/src/schema/feature-flags.ts
// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL FEATURE FLAG DEFINITIONS
// Single source of truth — used by:
//   - plans.ts        (plan featureFlags arrays)
//   - licenses.ts     (admin generate modal ALL_FEATURES)
//   - portal.ts       (license file features array)
//   - email app       (reads features[] from license file to gate functionality)
//
// Rule: if the email app checks for a flag, it MUST appear here exactly.
// Never add flags in one place without adding them here first.
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

  // ── Pro+ ─────────────────────────────────────────────────────────────────
  "automation",                // Multi-step workflow builder
  "ab_testing",                // Subject / sender A/B split tests
  "segmentation_advanced",     // 8-filter audience segmentation
  "api_access",                // REST API for external integrations
  "analytics_advanced",        // Cross-campaign dashboard + CSV export
  "gdpr_tools",                // Consent tracking, data export/delete

  // ── Agency only ──────────────────────────────────────────────────────────
  "white_label",               // Remove ZeniPost branding
  "client_usage",              // Allow end-clients to use the install
  "audit_logs",                // Full admin audit trail
  "team_roles",                // Role-based access control

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
  ],
  pro: [
    "campaign_management",
    "template_editors",
    "subscriber_management",
    "analytics_basic",
    "suppression_list",
    "custom_domains",
    "webhooks",
    "automation",
    "ab_testing",
    "segmentation_advanced",
    "api_access",
    "analytics_advanced",
    "gdpr_tools",
  ],
  agency: [
    "campaign_management",
    "template_editors",
    "subscriber_management",
    "analytics_basic",
    "suppression_list",
    "custom_domains",
    "webhooks",
    "automation",
    "ab_testing",
    "segmentation_advanced",
    "api_access",
    "analytics_advanced",
    "gdpr_tools",
    "white_label",
    "client_usage",
    "audit_logs",
    "team_roles",
  ],
};

// ── Human-readable labels (used in admin UI + plans page) ────────────────────

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  campaign_management:   "Campaign Management",
  template_editors:      "Template Editors",
  subscriber_management: "Subscriber Management",
  analytics_basic:       "Basic Analytics",
  suppression_list:      "Suppression List",
  custom_domains:        "Custom Sending Domains",
  webhooks:              "Webhooks",
  automation:            "Automation Workflows",
  ab_testing:            "A/B Testing",
  segmentation_advanced: "Advanced Segmentation",
  api_access:            "API Access",
  analytics_advanced:    "Advanced Reporting",
  gdpr_tools:            "GDPR Tools",
  white_label:           "White Label",
  client_usage:          "Client Usage Allowed",
  audit_logs:            "Audit Logs",
  team_roles:            "Team Roles & Permissions",
  managed_delivery:      "Managed Delivery (ZeniPost Infra)",
  dedicated_ip:          "Dedicated IP",
  ip_warmup:             "IP Warmup",
};