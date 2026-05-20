// artifacts/email-platform/src/hooks/use-licenses.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export type LicensePlan   = "starter" | "pro" | "agency";
export type LicenseStatus = "active" | "expiring" | "revoked" | "expired";

export interface License {
  id:                  number;
  customerId:          number;
  customerName:        string | null;
  domain:              string;
  rootDomain:          string;
  plan:                LicensePlan;
  emailsPerMonth:      number;
  subscribersLimit:    number;
  features:            string[];
  status:              LicenseStatus;
  isManaged:           boolean;
  adminAccessEnabled:  boolean;
  managedSince:        string | null;
  managedNote:         string | null;
  // Delivery plan fields
  deliveryPlanId:      string | null;
  deliveryPlanName:    string | null;
  deliveryEmailsLimit: number | null;
  deliveryInfra:       string | null;
  deliveryRouting:     string | null;
  deliveryActiveSince: string | null;
  issuedAt:            string;
  expiresAt:           string;
  revokedAt:           string | null;
  lastPingAt:          string | null;
  pingCount:           number;
}

export interface LicensesListResponse {
  licenses: License[];
  total:    number;
  page:     number;
  limit:    number;
}

export interface GenerateLicensePayload {
  customerId:       number;
  domain:           string;
  plan:             LicensePlan;
  emailsPerMonth:   number;
  subscribersLimit: number;
  features:         string[];
  expiresAt:        string;
}

// ── Canonical feature flags ───────────────────────────────────────────────────
// Mirrors lib/db/src/schema/feature-flags.ts
// Delivery flags (managed_delivery, dedicated_ip, ip_warmup) are managed
// automatically by PATCH /licenses/:id/delivery — do NOT include in the
// manual feature picker in GenerateLicenseModal.

export const ALL_FEATURES = [
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
] as const;

export const FEATURE_LABELS: Record<string, string> = {
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
  // Delivery flags — display only, never in manual picker
  managed_delivery:      "Managed Delivery",
  dedicated_ip:          "Dedicated IP",
  ip_warmup:             "IP Warmup",
};

export const PLAN_DEFAULT_FEATURES: Record<LicensePlan, string[]> = {
  starter: [
    "campaign_management", "template_editors", "subscriber_management",
    "analytics_basic", "suppression_list", "custom_domains", "webhooks",
  ],
  pro: [
    "campaign_management", "template_editors", "subscriber_management",
    "analytics_basic", "suppression_list", "custom_domains", "webhooks",
    "automation", "ab_testing", "segmentation_advanced", "api_access",
    "analytics_advanced", "gdpr_tools",
  ],
  agency: [
    "campaign_management", "template_editors", "subscriber_management",
    "analytics_basic", "suppression_list", "custom_domains", "webhooks",
    "automation", "ab_testing", "segmentation_advanced", "api_access",
    "analytics_advanced", "gdpr_tools",
    "white_label", "client_usage", "audit_logs", "team_roles",
  ],
};

export const PLAN_QUOTAS: Record<LicensePlan, { emails: number; subs: number }> = {
  starter: { emails: 100000,  subs: 25000  },
  pro:     { emails: 500000,  subs: 100000 },
  agency:  { emails: 1000000, subs: 250000 },
};

// ── Delivery plan options (mirrors plans.ts DELIVERY_PLANS) ──────────────────
export const DELIVERY_PLAN_OPTIONS = [
  { id: "delivery_starter",   name: "Starter Delivery",  price: "$35/mo",  volume: "55k emails/mo",   infra: "Shared IP pool" },
  { id: "delivery_growth",    name: "Growth Delivery",   price: "$87/mo",  volume: "150k emails/mo",  infra: "Optimized routing + IP warmup" },
  { id: "delivery_scale",     name: "Scale Delivery",    price: "$159/mo", volume: "350k emails/mo",  infra: "Priority queue + IP warmup" },
  { id: "delivery_dedicated", name: "Dedicated IP",      price: "$299+/mo",volume: "Custom volume",   infra: "Dedicated IP + warmup + reputation mgmt" },
] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useLicenses(page = 1, limit = 20, search = "", status = "") {
  const params = new URLSearchParams({
    page:  String(page),
    limit: String(limit),
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  });
  return useQuery<LicensesListResponse>({
    queryKey: ["/api/licenses", page, limit, search, status],
    queryFn:  () => fetchApi(`/api/licenses?${params}`),
  });
}

export function useLicense(id: number | null) {
  return useQuery<{ license: License }>({
    queryKey: ["/api/licenses", id],
    queryFn:  () => fetchApi(`/api/licenses/${id}`),
    enabled:  id !== null,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useGenerateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateLicensePayload) =>
      fetchApi<{ license: License }>("/api/licenses", {
        method: "POST",
        body:   JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/licenses"] });
      qc.invalidateQueries({ queryKey: ["/api/stats/summary"] });
    },
  });
}

export function useRevokeLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/licenses/${id}/revoke`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/licenses"] }),
  });
}

export function useUnrevokeLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/licenses/${id}/unrevoke`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/licenses"] }),
  });
}

export function useRenewLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expiresAt }: { id: number; expiresAt: string }) =>
      fetchApi(`/api/licenses/${id}/renew`, {
        method: "POST",
        body:   JSON.stringify({ expiresAt }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/licenses"] }),
  });
}

export function useAdminToken() {
  return useMutation({
    mutationFn: (licenseId: number) =>
      fetchApi<{
        token:     string;
        accessUrl: string;
        domain:    string;
        expiresIn: string;
        issuedBy:  string;
        issuedAt:  string;
        warning:   string;
      }>(`/api/licenses/${licenseId}/admin-token`, { method: "POST" }),
  });
}

export type ManagedAction = "opt_in" | "opt_out" | "enable_access" | "disable_access";

export function useToggleManaged() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: ManagedAction; note?: string }) =>
      fetchApi<{ message: string; license: License }>(`/api/licenses/${id}/managed`, {
        method: "PATCH",
        body:   JSON.stringify({ action, note }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/licenses"] }),
  });
}

// ── NEW: useAssignDelivery ────────────────────────────────────────────────────
// Assigns or removes a managed delivery plan on a license.
// action "assign" + planId → sets delivery block + injects delivery feature flags + re-signs
// action "remove"          → clears delivery block + strips delivery flags + re-signs
export function useAssignDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      planId,
    }: {
      id:      number;
      action:  "assign" | "remove";
      planId?: string;
    }) =>
      fetchApi<{ message: string; license: License }>(`/api/licenses/${id}/delivery`, {
        method: "PATCH",
        body:   JSON.stringify({ action, planId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/licenses"] }),
  });
}