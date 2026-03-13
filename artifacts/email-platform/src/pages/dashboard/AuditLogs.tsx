import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Shield, AlertCircle } from "lucide-react";
import { Button, Input, Label } from "@/components/ui/core";
import { useAuth } from "@/hooks/use-auth";

const adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginForm = z.infer<typeof adminLoginSchema>;

export function AdminLogin() {
  const { login, isLoggingIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<AdminLoginForm>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginForm) => {
    try {
      setError(null);
      const result: any = await login(data);
      // useAuth redirects on success; if role is not admin, kick them out
      if (result?.user?.role !== "admin") {
        setError("Access denied. This portal is for administrators only.");
        localStorage.removeItem("token");
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex bg-sidebar">
      {/* Left branding panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 mb-16 relative">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl text-white">ZeniPost</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl text-white leading-tight mb-4">
          Control every<br />customer.<br />
          <span className="text-primary">From one place.</span>
        </h1>
        <p className="text-sidebar-foreground/40 text-sm leading-relaxed max-w-xs mb-12">
          The ZeniPost admin console gives you complete visibility and control
          over every customer instance, license, and plan.
        </p>

        <div className="flex flex-col gap-4">
          {[
            "Issue & revoke licenses instantly",
            "Monitor platform-wide email activity",
            "Manage customer plans and quotas",
            "Full audit trail of every admin action",
          ].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_theme(colors.primary.DEFAULT)]" />
              <span className="text-sidebar-foreground/50 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-[440px] bg-background flex items-center justify-center px-8 lg:px-12">
        <div className="w-full max-w-sm">
          <div className="inline-flex items-center gap-2 bg-destructive/8 text-destructive border border-destructive/15 px-3 py-1.5 rounded-lg text-xs font-semibold mb-6">
            <Shield className="w-3.5 h-3.5" />
            Admin Access Only — /admin
          </div>

          <h2 className="font-display font-extrabold text-2xl text-foreground mb-1">
            Welcome back
          </h2>
          <p className="text-muted-foreground text-sm mb-8">
            Sign in to your admin dashboard
          </p>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@zenipost.com"
                className="h-11 rounded-lg text-sm"
                {...register("email")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••"
                className="h-11 rounded-lg text-sm"
                {...register("password")}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full h-11 text-sm font-semibold mt-2" isLoading={isLoggingIn}>
              Sign In to Admin Panel
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground/60 leading-relaxed">
            Restricted to authorized administrators only.<br />
            Unauthorized access is prohibited and logged.
          </p>
        </div>
      </div>
    </div>
  );
}