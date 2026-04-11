import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface PortalSnapshot {
  user: {
    id: number;
    name: string;
    email: string;
    company?: string | null;
    plan: string;
    isActive: boolean;
    emailsUsed: number;
    emailsLimit: number;
    subscribersUsed: number;
    subscribersLimit: number;
    createdAt: string;
  };
  planInfo: {
    emailsLimit: number;
    subscribersLimit: number;
    price: number;
  };
  licenses: Array<{
    id: number;
    domain: string;
    plan: string;
    status: string;
    expiresAt: string;
  }>;
  domains: Array<{
    id: number;
    domain: string;
    isVerified: boolean;
    createdAt: string;
  }>;
}

export function usePortal() {
  return useQuery<PortalSnapshot>({
    queryKey: ["/api/portal"],
    queryFn: () => fetchApi("/api/portal"),
    staleTime: 60 * 1000,
  });
}
