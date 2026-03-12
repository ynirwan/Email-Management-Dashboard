import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface StatsSummary {
  totalUsers: number;
  activeUsers: number;
  totalEmailsSent: number;
  totalSubscribers: number;
  planBreakdown: {
    free: number;
    starter: number;
    pro: number;
    enterprise: number;
  };
}

export function useStatsSummary() {
  return useQuery<StatsSummary>({
    queryKey: ["/api/stats/summary"],
    queryFn: () => fetchApi("/api/stats/summary"),
  });
}
