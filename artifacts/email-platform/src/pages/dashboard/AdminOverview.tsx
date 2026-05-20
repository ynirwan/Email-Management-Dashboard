import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, Spinner } from "@/components/ui/core";
import {
  Users,
  Shield,
  CreditCard,
  BarChart2,
  ClipboardList,
  Settings,
  Mail,
  TrendingUp,
  UserCheck,
  Activity,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useStatsSummary } from "@/hooks/use-dashboard";
import { useAuth } from "@/hooks/use-auth";

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-primary",
  bg = "bg-primary/10",
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  bg?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
            {label}
          </p>
          <span className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </span>
        </div>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── PlanBar ───────────────────────────────────────────────────────────────────

function PlanBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium capitalize">{label}</span>
        <span className="text-muted-foreground">
          {count} user{count !== 1 ? "s" : ""}{" "}
          <span className="text-xs">({pct}%)</span>
        </span>
      </div>
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function AdminOverview() {
  const { user } = useAuth();
  const { data, isLoading, error } = useStatsSummary();

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
          Failed to load admin stats. Please refresh.
        </div>
      </DashboardLayout>
    );

  const totalUsers = data.totalUsers;
  const inactiveUsers = totalUsers - data.activeUsers;
  const inactivePct = totalUsers > 0 ? Math.round((inactiveUsers / totalUsers) * 100) : 0;

  const adminActions = [
    {
      icon: Users,
      label: "User Management",
      desc: "View, edit, suspend, and delete user accounts",
      href: "/dashboard/users",
    },
    {
      icon: BarChart2,
      label: "Usage Enforcement",
      desc: "Monitor and enforce plan usage limits",
      href: "/dashboard/admin/usage",
    },
    {
      icon: Shield,
      label: "License Manager",
      desc: "Review and revoke user licenses",
      href: "/dashboard/admin/licenses",
    },
    {
      icon: CreditCard,
      label: "Billing Overview",
      desc: "View invoices and payment statuses",
      href: "/dashboard/admin/billing",
    },
    {
      icon: TrendingUp,
      label: "Plans & Pricing",
      desc: "Configure available subscription plans",
      href: "/dashboard/plans",
    },
    {
      icon: ClipboardList,
      label: "Audit Logs",
      desc: "Track all admin and user actions",
      href: "/dashboard/audit",
    },
    {
      icon: Settings,
      label: "Settings",
      desc: "Platform configuration and preferences",
      href: "/dashboard/settings",
    },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Admin
          </span>
        </div>
        <p className="text-muted-foreground">
          Platform overview — welcome back, {user?.name.split(" ")[0]}.
        </p>
      </div>

      {/* Inactive users alert */}
      {inactivePct >= 20 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-400/40 bg-amber-500/5 text-amber-700 text-sm font-medium mb-6">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {inactiveUsers} account{inactiveUsers !== 1 ? "s" : ""} ({inactivePct}% of users) are currently inactive.
        </div>
      )}

      {/* Top stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Total Users"
          value={fmt(totalUsers)}
          sub="All registered accounts"
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          icon={UserCheck}
          label="Active Users"
          value={fmt(data.activeUsers)}
          sub={`${totalUsers > 0 ? Math.round((data.activeUsers / totalUsers) * 100) : 0}% of total`}
          color="text-emerald-600"
          bg="bg-emerald-500/10"
        />
        <StatCard
          icon={Mail}
          label="Emails Sent (Total)"
          value={fmt(data.totalEmailsSent)}
          sub="Across all accounts"
          color="text-blue-600"
          bg="bg-blue-500/10"
        />
        <StatCard
          icon={Activity}
          label="Total Subscribers"
          value={fmt(data.totalSubscribers)}
          sub="Platform-wide"
          color="text-violet-600"
          bg="bg-violet-500/10"
        />
      </div>

      {/* Plan breakdown + Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Plan Breakdown */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-5">
              Plan Distribution
            </p>
            <div className="space-y-4">
              <PlanBar
                label="Starter"
                count={data.planBreakdown.starter}
                total={totalUsers}
                color="bg-slate-400"
              />
              <PlanBar
                label="Pro"
                count={data.planBreakdown.pro}
                total={totalUsers}
                color="bg-primary"
              />
              <PlanBar
                label="Agency"
                count={data.planBreakdown.agency}
                total={totalUsers}
                color="bg-violet-500"
              />
            </div>
            <div className="mt-5 pt-4 border-t border-border/50 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Starter", value: data.planBreakdown.starter, color: "text-slate-500" },
                { label: "Pro", value: data.planBreakdown.pro, color: "text-primary" },
                { label: "Agency", value: data.planBreakdown.agency, color: "text-violet-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-muted/50 rounded-xl p-3">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account health */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-5">
              Account Health
            </p>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-emerald-600">Active</span>
                  <span className="text-muted-foreground">{data.activeUsers} users</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${totalUsers > 0 ? (data.activeUsers / totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-muted-foreground">Inactive</span>
                  <span className="text-muted-foreground">{inactiveUsers} users</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-400 transition-all duration-700"
                    style={{ width: `${totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between text-sm text-muted-foreground">
              <span>Total registered accounts</span>
              <span className="font-bold text-foreground">{totalUsers}</span>
            </div>
            <Link href="/dashboard/users">
              <div className="mt-3 flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                Manage users <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Admin Quick Actions */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold mb-4">
            Admin Tools
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {adminActions.map(({ icon: Icon, label, desc, href }) => (
              <Link key={label} href={href}>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/50 transition-all cursor-pointer group">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <Icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground truncate">{desc}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
