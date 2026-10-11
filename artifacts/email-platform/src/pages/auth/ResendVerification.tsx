import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { AuthLayout } from "./AuthLayout";
import { Button, Input, Label } from "@/components/ui/core";
import { fetchApi } from "@/lib/api";

export function ResendVerification() {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSending(true);
    try {
      await fetchApi("/api/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not request a verification link.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <AuthLayout
      title={sent ? "Check your inbox" : "Resend verification email"}
      description={sent
        ? "If that address belongs to an unverified account, a fresh link will arrive shortly."
        : "Enter the address you used to register and we'll send a new verification link."}
    >
      {sent ? (
        <p className="text-center text-sm">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="verification-email">Email</Label>
            <Input
              id="verification-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </div>
          <Button type="submit" className="w-full" isLoading={isSending}>
            Send verification link
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
