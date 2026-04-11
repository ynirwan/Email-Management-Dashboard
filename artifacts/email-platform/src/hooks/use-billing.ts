import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Invoice {
  id: number;
  customerId: number;
  invoiceNo: string;
  plan: string;
  amount: number;
  currency: string;
  status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  description: string | null;
  billingPeriodStart: string | null;
  billingPeriodEnd:   string | null;
  paidAt:    string | null;
  dueAt:     string;
  createdAt: string;
  customer?: { id: number; name: string; email: string; company: string | null };
}

export interface BillingSummary {
  mrr: number;
  paid:    { count: number; total: number };
  pending: { count: number; total: number };
  overdue: { count: number; total: number };
  planBreakdown: { plan: string; count: number; revenue: number }[];
}

export const PLAN_PRICES: Record<string, number> = { starter: 49, pro: 149, agency: 299 };

export function useInvoices(page = 1, limit = 20) {
  return useQuery<{ invoices: Invoice[]; total: number; page: number; limit: number }>({
    queryKey: ["/api/billing/invoices", page, limit],
    queryFn:  () => fetchApi(`/api/billing/invoices?page=${page}&limit=${limit}`),
  });
}

export function useBillingSummary() {
  return useQuery<BillingSummary>({
    queryKey: ["/api/billing/summary"],
    queryFn:  () => fetchApi("/api/billing/summary"),
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchApi(`/api/billing/invoices/${id}/mark-paid`, { method: "PATCH" }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["/api/billing/invoices"] }); qc.invalidateQueries({ queryKey: ["/api/billing/summary"] }); },
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchApi(`/api/billing/invoices/${id}/cancel`, { method: "PATCH" }),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ["/api/billing/invoices"] }); },
  });
}

// Admin upgrades a customer's plan on their behalf
export function useUpgradeCustomerPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, plan }: { customerId: number; plan: string }) =>
      fetchApi<{ message: string; user: any; invoice: Invoice }>("/api/billing/upgrade", {
        method: "POST",
        body:   JSON.stringify({ customerId, plan }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/users"] });
      qc.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      qc.invalidateQueries({ queryKey: ["/api/billing/summary"] });
    },
  });
}
