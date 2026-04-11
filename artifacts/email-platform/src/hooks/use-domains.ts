import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface DomainRecord {
  id: number;
  domain: string;
  isVerified: boolean;
  createdAt: string;
}

export function useDomains() {
  return useQuery<{ domains: DomainRecord[] }>({
    queryKey: ["/api/domains"],
    queryFn: () => fetchApi("/api/domains"),
  });
}

export function useAddDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (domain: string) => fetchApi("/api/domains", {
      method: "POST",
      body: JSON.stringify({ domain }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/domains"] }),
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => fetchApi(`/api/domains/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/domains"] }),
  });
}
