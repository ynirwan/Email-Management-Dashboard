import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";

export interface Settings {
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUser?: string | null;
  smtpFromEmail?: string | null;
  smtpFromName?: string | null;
  awsRegion?: string | null;
  maxEmailsPerDay: number;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  siteName: string;
  supportEmail?: string | null;
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ["/api/settings"],
    queryFn: () => fetchApi("/api/settings"),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Settings & { smtpPassword?: string }>) => 
      fetchApi("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });
}
