import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi, isSessionActive } from "@/lib/api";
import { useEffect } from "react";
import { useLocation } from "wouter";

export interface User {
  id: number;
  name: string;
  email: string;
  company?: string | null;
  role: "admin" | "user";
  plan: "starter" | "pro" | "agency";
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
    // Gate on the non-httpOnly flag cookie — avoids a round-trip on logged-out pages
    // while still fetching on app load when a session is active.
    enabled: isSessionActive(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: any) => fetchApi<any>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    }),
    onSuccess: (data) => {
      // Server sets the httpOnly JWT cookie and a non-httpOnly `logged_in` flag.
      // No localStorage writes — the cookie is the source of truth.
      queryClient.setQueryData(["/api/auth/me"], data.user);
      setLocation("/dashboard");
    }
  });

  const registerMutation = useMutation({
    mutationFn: (userData: any) => fetchApi<any>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    }),
    // Backend returns { message, userId } — no token yet (email verification required).
  });

  const logoutMutation = useMutation({
    mutationFn: () => fetchApi("/api/auth/logout", { method: "POST" }).catch(() => {}),
    onSettled: () => {
      // Server clears the auth cookies; clear the flag manually too so the
      // enabled guard flips before the next render.
      document.cookie = "logged_in=; path=/; max-age=0; SameSite=Strict";
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
    registerSuccess: registerMutation.isSuccess,
    registerMessage: (registerMutation.data as any)?.message ?? null,
  };
}
