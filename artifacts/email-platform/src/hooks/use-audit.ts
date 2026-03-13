import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export type AuditCategory = "license" | "user" | "plan" | "security" | "system";

export interface AuditLog {
  id: number;
  action: string;
  category: AuditCategory;
  detail: string;
  adminId: number;
  adminName: string;
  ipAddress?: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export function useAuditLogs(
  page = 1,
  limit = 20,
  search = "",
  category = "",
  range = ""
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    ...(search ? { search } : {}),
    ...(category ? { category } : {}),
    ...(range ? { range } : {}),
  });
  return useQuery<AuditLogsResponse>({
    queryKey: ["/api/audit-logs", page, limit, search, category, range],
    queryFn: () => fetchApi(`/api/audit-logs?${params}`),
  });
}