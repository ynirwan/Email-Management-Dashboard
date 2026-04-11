import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type LicenseStatus = "active" | "expiring" | "revoked" | "expired";
export type LicensePlan   = "starter" | "pro" | "agency";

export interface License {
  id: number;
  customerId: number;
  customerName: string;
  domain: string;
  plan: LicensePlan;
  emailsPerMonth: number;
  subscribersLimit: number;
  features: string[];
  issuedAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastPingAt: string | null;
  pingCount: number;
  status: LicenseStatus;
  signature?: string;
}

export interface LicensesListResponse {
  licenses: License[];
  total: number;
  page: number;
  limit: number;
}

export interface GenerateLicensePayload {
  customerId: number;
  domain: string;
  plan: LicensePlan;
  emailsPerMonth: number;
  subscribersLimit: number;
  features: string[];
  expiresAt: string;
}

export function useLicenses(page = 1, limit = 50, search = "", status = "") {
  const params = new URLSearchParams({
    page:  page.toString(),
    limit: limit.toString(),
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

export function useGenerateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateLicensePayload) =>
      fetchApi<{ license: License; payload: object; signature: string }>("/api/licenses/generate", {
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
      fetchApi(`/api/licenses/revoke/${id}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/licenses"] }),
  });
}

export function useRenewLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expiresAt }: { id: number; expiresAt: string }) =>
      fetchApi(`/api/licenses/renew/${id}`, {
        method: "POST",
        body:   JSON.stringify({ expiresAt }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/licenses"] }),
  });
}

export const FEATURE_LABELS: Record<string, string> = {
  ab_testing:             "A/B Testing",
  automation:             "Automation",
  segmentation:           "Segmentation",
  analytics_advanced:     "Analytics Pro",
  custom_domains:         "Custom Domains",
  suppression_management: "Suppression Mgmt",
  api_access:             "API Access",
  gdpr_tools:             "GDPR Tools",
  audit_trail:            "Audit Trail",
  white_label:            "White Label",
};

export const ALL_FEATURES = Object.keys(FEATURE_LABELS);

export const PLAN_DEFAULT_FEATURES: Record<LicensePlan, string[]> = {
  starter:    ["analytics_advanced", "suppression_management"],
  pro:        ["ab_testing", "automation", "segmentation", "analytics_advanced", "custom_domains", "suppression_management", "api_access", "gdpr_tools", "audit_trail"],
  agency: [...ALL_FEATURES],
};

export const PLAN_QUOTAS: Record<LicensePlan, { emails: number; subs: number }> = {
  starter:    { emails: 100000,  subs: 25000 },
  pro:        { emails: 500000,  subs: 100000 },
  agency: { emails: 1000000, subs: 250000 },
};

// ── useAdminToken — generate short-lived admin access token for a license ─────
export function useAdminToken() {
  return useMutation({
    mutationFn: (licenseId: number) =>
      fetchApi<{
        token:      string;
        accessUrl:  string;
        domain:     string;
        expiresIn:  string;
        issuedBy:   string;
        issuedAt:   string;
        warning:    string;
      }>(`/api/licenses/${licenseId}/admin-token`, { method: "POST" }),
  });
}

// ── useToggleManaged — opt customer in/out of managed services ────────────────
export type ManagedAction = "opt_in" | "opt_out" | "enable_access" | "disable_access";

export function useToggleManaged() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: number; action: ManagedAction; note?: string }) =>
      fetchApi<{ message: string; license: any }>(`/api/licenses/${id}/managed`, {
        method: "PATCH",
        body:   JSON.stringify({ action, note }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/licenses"] });
    },
  });
}
