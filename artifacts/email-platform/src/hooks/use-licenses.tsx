import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type LicenseStatus = "active" | "expiring" | "revoked" | "expired";
export type LicensePlan = "free" | "starter" | "pro" | "enterprise";

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
  isActive: boolean;
  status: LicenseStatus;
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

// ── Queries ──────────────────────────────────────────────────────────────────

export function useLicenses(page = 1, limit = 20, search = "", status = "") {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
  });
  return useQuery<LicensesListResponse>({
    queryKey: ["/api/licenses", page, limit, search, status],
    queryFn: () => fetchApi(`/api/licenses?${params}`),
  });
}

export function useLicense(id: number | null) {
  return useQuery<License>({
    queryKey: ["/api/licenses", id],
    queryFn: () => fetchApi(`/api/licenses/${id}`),
    enabled: id !== null,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useGenerateLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: GenerateLicensePayload) =>
      fetchApi<License>("/api/licenses/generate", {
        method: "POST",
        body: JSON.stringify(payload),
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/licenses"] });
    },
  });
}

export function useRenewLicense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, expiresAt }: { id: number; expiresAt: string }) =>
      fetchApi(`/api/licenses/renew/${id}`, {
        method: "POST",
        body: JSON.stringify({ expiresAt }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/licenses"] });
    },
  });
}