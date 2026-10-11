import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AuthLayout } from "./AuthLayout";
import { Button } from "@/components/ui/core";
import { fetchApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@/hooks/use-auth";

export function VerifyEmail() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [status, setStatus] = useState<"verifying" | "verified" | "failed">("verifying");
  const [message, setMessage] = useState("Checking your verification link…");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    if (!token) {
      setStatus("failed");
      setMessage("This verification link is missing its token.");
      return () => { active = false; };
    }

    fetchApi<{ token: string; user: User; message?: string }>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    }).then((result) => {
      if (!result.token || !result.user) throw new Error("Verification could not complete. Try signing in.");
      if (!active) return;
      localStorage.setItem("token", result.token);
      queryClient.setQueryData(["/api/auth/me"], result.user);
      setStatus("verified");
      setMessage(result.message ?? "Your email is verified.");
    }).catch((err: unknown) => {
      if (!active) return;
      setStatus("failed");
      setMessage(err instanceof Error ? err.message : "Verification failed.");
    });

    return () => { active = false; };
  }, [token, queryClient]);

  return (
    <AuthLayout
      title={status === "verified" ? "Email verified" : "Verify your email"}
      description={message}
    >
      {status === "verifying" ? (
        <p className="text-center text-sm text-muted-foreground">Please wait…</p>
      ) : status === "verified" ? (
        <Button className="w-full" onClick={() => setLocation("/dashboard")}>
          Continue to ZeniPost
        </Button>
      ) : (
        <div className="space-y-4 text-center">
          <Link href="/resend-verification" className="font-semibold text-primary hover:underline">
            Request another verification link
          </Link>
          <p className="text-sm text-muted-foreground">
            <Link href="/login" className="hover:underline">Back to sign in</Link>
          </p>
        </div>
      )}
    </AuthLayout>
  );
}
