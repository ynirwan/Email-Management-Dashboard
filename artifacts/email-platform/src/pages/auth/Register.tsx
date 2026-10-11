import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/core";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { fetchApi } from "@/lib/api";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  company: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function Register() {
  const { register: registerUser, isRegistering } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resent, setResent] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      setError(null);
      await registerUser(data);
      setRegisteredEmail(data.email);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    }
  };

  if (registeredEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative py-12">
        <div className="absolute top-8 left-8 hidden sm:block">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
              <Mail className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">ZeniPost</span>
          </Link>
        </div>
        <div className="w-full max-w-md">
          <Card className="border-border/50 shadow-2xl">
            <CardHeader className="space-y-2 text-center pt-8">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-600" />
              <CardTitle className="text-3xl font-display">Verify your email</CardTitle>
              <CardDescription className="text-base">
                We sent a verification link to <strong>{registeredEmail}</strong>. You need to verify it before signing in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-center">
              <p className="text-sm text-muted-foreground">The link expires in 24 hours. Check your spam folder if it doesn't arrive.</p>
              {resent ? (
                <p role="status" className="text-sm text-emerald-700">A fresh verification link has been requested.</p>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  isLoading={isResending}
                  onClick={async () => {
                    setIsResending(true);
                    try {
                      await fetchApi("/api/auth/resend-verification", {
                        method: "POST",
                        body: JSON.stringify({ email: registeredEmail }),
                      });
                      setResent(true);
                    } catch (err: any) {
                      setError(err.message || "Could not resend the verification email.");
                    } finally {
                      setIsResending(false);
                    }
                  }}
                >
                  Resend verification email
                </Button>
              )}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <p className="text-sm text-muted-foreground">
                <Link href="/login" className="font-semibold text-primary hover:underline">Back to sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative py-12">
      <div className="absolute top-8 left-8 hidden sm:block">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
            <Mail className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-xl text-foreground">ZeniPost</span>
        </Link>
      </div>

      <div className="w-full max-w-md">
        <Card className="border-border/50 shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-8 pt-8">
            <CardTitle className="text-3xl font-display">Create an account</CardTitle>
            <CardDescription className="text-base">Start your 14-day free trial today.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work Email</Label>
                <Input id="email" type="email" placeholder="name@company.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company (Optional)</Label>
                <Input id="company" placeholder="Acme Inc." {...register("company")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-12 text-base mt-2" isLoading={isRegistering}>
                Create Account
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
