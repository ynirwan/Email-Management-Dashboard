import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, Button, Spinner } from "@/components/ui/core";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePortal } from "@/hooks/use-portal";
import { Users } from "lucide-react";
import {
  Globe,
  Shield,
  CreditCard,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Clock,
  DownloadCloud,
  Plus,
  TrendingUp,
  Mail,
} from "lucide-react";
import { formatDistanceToNow, parseISO, differenceInDays } from "date-fns";

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(used: number, limit: number) {
  if (!limit) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function usageColor(p: number) {
  if (p >= 100) return "text-destructive";
  if (p >= 80) return "text-amber-500";
  return "text-emerald-500";
}

function barColor(p: number) {
  if (p >= 100) return "bg-destructive";
  if (p >= 80) return "bg-amber-500";
  return "bg-primary";
}

// ── UsageMeter ────────────────────────────────────────────────────────────────

function UsageMeter({
  icon: Icon,
  label,
  used,
  limit,
}: {
  icon: any;
  label: string;
  used: number;
  limit: number;
}) {
  const p = pct(used, limit);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="w-4 h-4 text-muted-foreground" />
          {label}
        </div>
        <span className={`text-sm font-bold ${usageColor(p)}`}>
          {fmt(used)}
          <span className="text-muted-foreground font-normal text-xs">
            {" "}
            / {fmt(limit)}
          </span>
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor(p)}`}
          style={{ width: `${p}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{p}% used</span>
        {p >= 80 && p < 100 && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertTriangle className="w-3 h-3" />
            Approaching limit
          </span>
        )}
        {p >= 100 && (
          <span className="flex items-center gap-1 text-destructive">
            <XCircle className="w-3 h-3" />
            Over limit
          </span>
        )}
      </div>
    </div>
  );
}

// ── LicenseStatusChip ─────────────────────────────────────────────────────────

function LicenseStatusChip({
  status,
}: {
  status: "active" | "expiring" | "revoked" | "expired";
}) {
  const map = {
    active: {
      icon: CheckCircle2,
      label: "Active",
      cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    },
    expiring: {
      icon: Clock,
      label: "Expiring",
      cls: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    },
    revoked: {
      icon: XCircle,
      label: "Revoked",
      cls: "text-destructive bg-destructive/10 border-destructive/20",
    },
    expired: {
      icon: XCircle,
      label: "Expired",
      cls: "text-muted-foreground bg-muted border-border",
    },
  };
  const { icon: Icon, label, cls } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── AlertBanner ───────────────────────────────────────────────────────────────

function AlertBanner({ licenses }: { licenses: any[] }) {
  const expiringSoon = licenses.filter((l) => {
    if (l.status !== "active" && l.status !== "expiring") return false;
    const days = differenceInDays(parseISO(l.expiresAt), new Date());
    return days <= 30 && days >= 0;
  });

  const revoked = licenses.filter((l) => l.status === "revoked");
  const expired = licenses.filter((l) => l.status === "expired");

  const alerts: { icon: any; msg: string; color: string }[] = [];
  if (expired.length)
    alerts.push({
      icon: XCircle,
      msg: `${expired.length} license${expired.length > 1 ? "s" : ""} expired — contact support to renew.`,
      color: "border-destructive/30 bg-destructive/5 text-destructive",
    });
  if (revoked.length)
    alerts.push({
      icon: XCircle,
      msg: `${revoked.length} license${revoked.length > 1 ? "s" : ""} revoked — contact support.`,
      color: "border-destructive/30 bg-destructive/5 text-destructive",
    });
  if (expiringSoon.length)
    alerts.push({
      icon: AlertTriangle,
      msg: `${expiringSoon.length} license${expiringSoon.length > 1 ? "s" : ""} expiring within 30 days.`,
      color: "border-amber-400/40 bg-amber-500/5 text-amber-700",
    });

  if (!alerts.length) return null;

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${a.color}`}
        >
          <a.icon className="w-4 h-4 shrink-0" />
          {a.msg}
        </div>
      ))}
    </div>
  );
}

// ── Onboarding Checklist (new users) ─────────────────────────────────────────

function OnboardingChecklist({
  hasDomains,
  hasLicenses,
}: {
  hasDomains: boolean;
  hasLicenses: boolean;
}) {
  if (hasDomains && hasLicenses) return null;

  const steps = [
    {
      done: hasDomains,
      label: "Add your first domain",
      href: "/dashboard/domains",
      desc: "Connect the domain where you'll install ZeniPost",
    },
    {
      done: hasLicenses,
      label: "Download your license",
      href: "/dashboard/licenses",
      desc: "Get the license file to activate your installation",
    },
    {
      done: false,
      label: "Install & connect your app",
      href: null,
      desc: "Follow the setup guide at docs.zenipost.com",
    },
  ];

  return (
    <Card className="border-primary/20 bg-primary/5 mb-6">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-base">Get started</h3>
          <span className="ml-auto text-xs text-muted-foreground">
            {steps.filter((s) => s.done).length}/{steps.length} done
          </span>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  step.done
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-muted-foreground/30"
                }`}
              >
                {step.done && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      step.done
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                  {!step.done && step.href && (
                    <Link href={step.href}>
                      <span className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline cursor-pointer">
                        Go <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Overview() {
  const { data, isLoading, error } = usePortal();

  if (isLoading)
    return (
      <DashboardLayout>
        <div className="flex justify-center py-24">
          <Spinner className="w-12 h-12" />
        </div>
      </DashboardLayout>
    );

  if (error || !data)
    return (
      <DashboardLayout>
        <div className="text-destructive text-center py-20">
          Failed to load dashboard. Please refresh.
        </div>
      </DashboardLayout>
    );

  const { user, planInfo, licenses, domains } = data;
  const emailPct = pct(user.emailsUsed, user.emailsLimit);
  const subsPct = pct(user.subscribersUsed, user.subscribersLimit);

  const licCounts = {
    active: licenses.filter((l: any) => l.status === "active").length,
    expiring: licenses.filter((l: any) => l.status === "expiring").length,
    revoked: licenses.filter((l: any) => l.status === "revoked").length,
    expired: licenses.filter((l: any) => l.status === "expired").length,
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here's your account overview.
        </p>
      </div>

      {/* Alert banners */}
      <AlertBanner licenses={licenses} />

      {/* Onboarding for new users */}
      <OnboardingChecklist
        hasDomains={domains.length > 0}
        hasLicenses={licenses.length > 0}
      />

      {/* Top row: Plan card + Usage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* Plan Card */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-1">
                  Current Plan
                </p>
                <h2 className="text-2xl font-bold capitalize">{user.plan}</h2>
              </div>
              <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground mb-5">
              <div className="flex items-center justify-between">
                <span>Emails / month</span>
                <span className="font-medium text-foreground">
                  {fmt(planInfo.emailsLimit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subscribers</span>
                <span className="font-medium text-foreground">
                  {fmt(planInfo.subscribersLimit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Installations</span>
                <span className="font-medium text-foreground">
                  {user.plan === "agency"
                    ? "Unlimited"
                    : user.plan === "pro"
                      ? "Up to 3"
                      : "1"}
                </span>
              </div>
            </div>
            {emailPct >= 80 || subsPct >= 80 ? (
              <Button size="sm" className="w-full gap-2">
                <TrendingUp className="w-4 h-4" />
                Upgrade Plan
              </Button>
            ) : (
              <Button size="sm" variant="outline" className="w-full gap-2">
                <TrendingUp className="w-4 h-4" />
                View Plans
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Usage Meters */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-4">
              Usage This Month
            </p>
            <div className="space-y-5">
              <UsageMeter
                icon={Mail}
                label="Emails Sent"
                used={user.emailsUsed}
                limit={user.emailsLimit}
              />
              <UsageMeter
                icon={Users}
                label="Subscribers"
                used={user.subscribersUsed}
                limit={user.subscribersLimit}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row: License health + Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {/* License Health */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                License Health
              </p>
              <Link href="/dashboard/licenses">
                <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                  View all <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>

            {licenses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No licenses yet. Add a domain to get started.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    {
                      label: "Active",
                      value: licCounts.active,
                      color: "text-emerald-600",
                    },
                    {
                      label: "Expiring",
                      value: licCounts.expiring,
                      color: "text-amber-600",
                    },
                    {
                      label: "Expired",
                      value: licCounts.expired,
                      color: "text-muted-foreground",
                    },
                    {
                      label: "Revoked",
                      value: licCounts.revoked,
                      color: "text-destructive",
                    },
                  ].map(({ label, value, color }) => (
                    <div
                      key={label}
                      className="bg-muted/50 rounded-xl p-3 text-center"
                    >
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Most recent licenses */}
                <div className="space-y-2">
                  {licenses.slice(0, 2).map((l: any) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {l.domain}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Expires{" "}
                          {formatDistanceToNow(parseISO(l.expiresAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                      <LicenseStatusChip status={l.status} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Center */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-4">
              Quick Actions
            </p>
            <div className="space-y-2">
              {[
                {
                  icon: Plus,
                  label: "Add Domain",
                  desc: "Register a new installation domain",
                  href: "/dashboard/domains",
                  variant: "primary" as const,
                },
                {
                  icon: DownloadCloud,
                  label: "Download License",
                  desc: "Get the license file for your install",
                  href: "/dashboard/licenses",
                  variant: "default" as const,
                },
                {
                  icon: CreditCard,
                  label: "View Billing",
                  desc: "Invoices and payment status",
                  href: "/dashboard/billing",
                  variant: "default" as const,
                },
                {
                  icon: Globe,
                  label: "Manage Domains",
                  desc: "View and manage all domains",
                  href: "/dashboard/domains",
                  variant: "default" as const,
                },
              ].map(({ icon: Icon, label, desc, href }) => (
                <Link key={label} href={href}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                      <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">
                        {desc}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Domain overview strip */}
      {domains.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                Your Domains ({domains.length})
              </p>
              <Link href="/dashboard/domains">
                <span className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                  Manage <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {domains.map((d: any) => (
                <span
                  key={d.id}
                  className="inline-flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1 rounded-lg border border-border font-mono"
                >
                  <Globe className="w-3 h-3 text-muted-foreground" />
                  {d.domain}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}
