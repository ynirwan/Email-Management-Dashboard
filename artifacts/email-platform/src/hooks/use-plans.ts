import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Plan {
  id: string;
  name: string;
  price: number;
  billing: "one_time";
  installations: number;
  sharedWorkspace: boolean;
  emailsPerMonth: number;
  subscribersLimit: number;
  features: string[];
  isPopular: boolean;
  supportAndUpdatesYearly: number;
}

export interface PlansListResponse {
  plans: Plan[];
  deliveryPlans: Array<{
    id: string;
    name: string;
    priceMonthly: number;
    emailsPerMonth: number;
    infrastructure: string;
    routing: string;
  }>;
  copy?: {
    pricingHeader?: string;
    pricingSubtext?: string;
    deliveryHeader?: string;
    deliverySubtext?: string;
  };
}

export function usePlans() {
  return useQuery<PlansListResponse>({
    queryKey: ["/api/plans"],
    queryFn: () => fetchApi("/api/plans"),
  });
}
