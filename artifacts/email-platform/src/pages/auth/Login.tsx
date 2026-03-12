import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Mail, AlertCircle } from "lucide-react";
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/core";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const { login, isLoggingIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      <div className="absolute top-8 left-8">
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
            <CardTitle className="text-3xl font-display">Welcome back</CardTitle>
            <CardDescription className="text-base">Enter your details to sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="name@company.com" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-sm font-semibold text-primary hover:underline">Forgot password?</a>
                </div>
                <Input id="password" type="password" {...register("password")} />
                {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
              </div>

              <Button type="submit" className="w-full h-12 text-base" isLoading={isLoggingIn}>
                Sign In
              </Button>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="font-semibold text-primary hover:underline">
                Sign up for free
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
