import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { AuthLayout } from "./AuthLayout";
import { Button, Input, Label } from "@/components/ui/core";
import { fetchApi } from "@/lib/api";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSending(true);
    try {
      await fetchApi("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request a reset link.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AuthLayout
      title={sent ? "Check your inbox" : "Reset your password"}
      description={sent
        ? "If that address is registered, a password reset link will arrive shortly."
        : "Enter the email address on your account and we'll send a reset link."}
    >
      {sent ? (
        <div className="space-y-5 text-center">
          <p className="text-sm text-muted-foreground">
            Reset links expire after one hour. Check your spam folder if the email doesn't arrive.
          </p>
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <Button type="submit" className="w-full" isLoading={isSending}>
            Send reset link
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
