import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Plan {
  id: string;
  name: string;
  price: number;
  emailsPerMonth: number;
  subscribers: number;
  features: string[];
  isPopular: boolean;
}

export interface PlansListResponse {
  plans: Plan[];
}

export function usePlans() {
  return useQuery<PlansListResponse>({
    queryKey: ["/api/plans"],
    queryFn: () => fetchApi("/api/plans"),
  });
}
