// artifacts/email-platform/src/hooks/use-payments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PaymentRequestStatus = "pending" | "approved" | "rejected";
export type PaymentRequestType   = "license" | "delivery" | "renewal";

export interface PaymentRequest {
  id:             number;
  userId:         number;
  userName:       string | null;
  userEmail:      string | null;
  userCompany:    string | null;
  type:           PaymentRequestType;
  licenseId:      number | null;
  deliveryPlanId: string | null;
  amount:         number;
  currency:       string;
  paymentMethod:  string;
  transactionRef: string | null;
  proofImageUrl:  string | null;
  notes:          string | null;
  status:         PaymentRequestStatus;
  adminNote:      string | null;
  invoiceId:      number | null;
  createdAt:      string;
  resolvedAt:     string | null;
}

export interface PaymentRequestsListResponse {
  paymentRequests: PaymentRequest[];
  total:           number;
  page:            number;
  limit:           number;
}

export interface SubmitPaymentPayload {
  type:           PaymentRequestType;
  licenseId?:     number | null;
  deliveryPlanId?: string | null;
  amount:         number;
  currency?:      string;
  paymentMethod:  string;
  transactionRef?: string;
  proofImageUrl?:  string;
  notes?:          string;
}

// ── User hooks ────────────────────────────────────────────────────────────────

export function useMyPaymentRequests(page = 1, limit = 20) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  return useQuery<PaymentRequestsListResponse>({
    queryKey: ["/api/payment-requests", page, limit],
    queryFn:  () => fetchApi(`/api/payment-requests?${params}`),
  });
}

export function useSubmitPaymentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitPaymentPayload) =>
      fetchApi<{ paymentRequest: PaymentRequest }>("/api/payment-requests", {
        method: "POST",
        body:   JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-requests"] });
    },
  });
}

// ── Admin hooks ───────────────────────────────────────────────────────────────

export function useAdminPaymentRequests(page = 1, limit = 50, status = "") {
  const params = new URLSearchParams({ page: String(page), limit: String(limit), ...(status ? { status } : {}) });
  return useQuery<PaymentRequestsListResponse>({
    queryKey: ["/api/payment-requests/admin", page, limit, status],
    queryFn:  () => fetchApi(`/api/payment-requests/admin?${params}`),
  });
}

export function useApprovePaymentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetchApi<{ message: string; paymentRequest: PaymentRequest; invoiceId: number; invoiceNo: string }>(
        `/api/payment-requests/${id}/approve`,
        { method: "PATCH" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/payment-requests/admin"] });
      qc.invalidateQueries({ queryKey: ["/api/licenses"] });
      qc.invalidateQueries({ queryKey: ["/api/billing"] });
      qc.invalidateQueries({ queryKey: ["/api/portal"] });
    },
  });
}

export function useRejectPaymentRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, adminNote }: { id: number; adminNote: string }) =>
      fetchApi<{ message: string; paymentRequest: PaymentRequest }>(
        `/api/payment-requests/${id}/reject`,
        { method: "PATCH", body: JSON.stringify({ adminNote }) }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/payment-requests"] });
      qc.invalidateQueries({ queryKey: ["/api/payment-requests/admin"] });
    },
  });
}
