import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { AuthLayout } from "./AuthLayout";
import { Button, Input, Label } from "@/components/ui/core";
import { fetchApi } from "@/lib/api";

export function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsSaving(true);
    try {
      await fetchApi("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset your password.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AuthLayout
      title={saved ? "Password updated" : "Choose a new password"}
      description={saved
        ? "Your password has been changed. Sign in with your new password."
        : "Use at least 8 characters. This link expires one hour after it was sent."}
    >
      {saved ? (
        <Link href="/login" className="block text-center font-semibold text-primary hover:underline">
          Continue to sign in
        </Link>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" isLoading={isSaving}>
            Update password
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
              Request a new reset link
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
