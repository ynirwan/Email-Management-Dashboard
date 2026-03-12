import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useEffect } from "react";
import { useLocation } from "wouter";

export interface User {
  id: number;
  name: string;
  email: string;
  company?: string | null;
  role: "admin" | "user";
  plan: "free" | "starter" | "pro" | "enterprise";
  isActive: boolean;
  emailsUsed: number;
  emailsLimit: number;
  subscribersUsed: number;
  subscribersLimit: number;
  createdAt: string;
}

export function useAuth() {
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleUnauthorized = () => {
      queryClient.setQueryData(["/api/auth/me"], null);
      setLocation("/login");
    };
    window.addEventListener("auth-unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth-unauthorized", handleUnauthorized);
  }, [setLocation, queryClient]);

  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    queryFn: () => fetchApi("/api/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: any) => fetchApi<any>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
      setLocation("/dashboard");
    }
  });

  const registerMutation = useMutation({
    mutationFn: (userData: any) => fetchApi<any>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    }),
    onSuccess: (data) => {
      localStorage.setItem("token", data.token);
      queryClient.setQueryData(["/api/auth/me"], data.user);
      setLocation("/dashboard");
    }
  });

  const logoutMutation = useMutation({
    mutationFn: () => fetchApi("/api/auth/logout", { method: "POST" }).catch(() => {}),
    onSettled: () => {
      localStorage.removeItem("token");
      queryClient.setQueryData(["/api/auth/me"], null);
      queryClient.clear();
      setLocation("/");
    }
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
  };
}
