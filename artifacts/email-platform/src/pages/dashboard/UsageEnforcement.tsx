import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  Button,
  Input,
  Spinner,
} from "@/components/ui/core";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Clock,
  Users,
  Mail,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Filter,
  Download,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface CustomerUsageRow {
  // User fields
  userId: number;
  name: string;
  email: string;
  company: string | null;
  plan: "free" | "starter" | "pro" | "agency";
  isActive: boolean;
  emailsUsed: number;
  emailsLimit: number;
  subscribersUsed: number;
  subscribersLimit: number;
  // License fields (first/primary license)
  licenseId: number | null;
  domain: string | null;
  licenseStatus: "active" | "expiring" | "revoked" | "expired" | null;
  isManaged: boolean;
  adminAccessEnabled: boolean;
  lastPingAt: string | null;
  expiresAt: string | null;
  // Derived
  totalLicenses: number;
  activeLicenses: number;
}

interface UsageListResponse {
  customers: CustomerUsageRow[];
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(used: number, limit: number) {
  if (!limit || limit < 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function usageLevel(p: number): "ok" | "warning" | "critical" {
  if (p >= 100) return "critical";
  if (p >= 80) return "warning";
  return "ok";
}

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function pingStatus(lastPingAt: string | null): "online" | "stale" | "offline" {
  if (!lastPingAt) return "offline";
  const ms = Date.now() - new Date(lastPingAt).getTime();
  const hours = ms / (1000 * 60 * 60);
  if (hours < 2) return "online";
  if (hours < 48) return "stale";
  return "offline";
}

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  starter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  pro: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  agency: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

// ── UsageBar ──────────────────────────────────────────────────────────────────

function UsageBar({
  used,
  limit,
  label,
}: {
  used: number;
  limit: number;
  label: string;
}) {
  const p = pct(used, limit);
  const level = usageLevel(p);
  const barColor =
    level === "critical"
      ? "bg-destructive"
      : level === "warning"
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={
            level === "critical"
              ? "text-destructive font-bold"
              : level === "warning"
                ? "text-amber-600 font-semibold"
                : "text-foreground font-medium"
          }
        >
          {fmt(used)}
          <span className="text-muted-foreground font-normal">
            /{fmt(limit)}
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${p}%` }}
        />
      </div>
      <div className="text-right text-[10px] text-muted-foreground">{p}%</div>
    </div>
  );
}

// ── PingBadge ─────────────────────────────────────────────────────────────────

function PingBadge({ lastPingAt }: { lastPingAt: string | null }) {
  const status = pingStatus(lastPingAt);
  if (status === "online")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <Wifi className="w-3 h-3" />
        Online
      </span>
    );
  if (status === "stale")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
        <Clock className="w-3 h-3" />
        {lastPingAt
          ? formatDistanceToNow(parseISO(lastPingAt), { addSuffix: true })
          : "—"}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <WifiOff className="w-3 h-3" />
      No ping
    </span>
  );
}

// ── AlertIcon ─────────────────────────────────────────────────────────────────

function AlertIcon({
  emailPct,
  subsPct,
}: {
  emailPct: number;
  subsPct: number;
}) {
  const max = Math.max(emailPct, subsPct);
  if (max >= 100)
    return <XCircle className="w-4 h-4 text-destructive shrink-0" />;
  if (max >= 80)
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useUsageList() {
  // Fetches users + joins with licenses to build usage rows
  return useQuery<UsageListResponse>({
    queryKey: ["/api/admin/usage"],
    queryFn: () => fetchApi("/api/admin/usage"),
    refetchInterval: 60_000,
  });
}

// ── Filter bar ────────────────────────────────────────────────────────────────

type FilterType = "all" | "critical" | "warning" | "managed" | "unmanaged";

// ── Page ──────────────────────────────────────────────────────────────────────

export function UsageEnforcement() {
  const { data, isLoading, error, refetch, isFetching } = useUsageList();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const customers = data?.customers ?? [];

  // Apply filters
  const filtered = customers.filter((c) => {
    // Search
    if (search) {
      const q = search.toLowerCase();
      const match =
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company?.toLowerCase() ?? "").includes(q) ||
        (c.domain?.toLowerCase() ?? "").includes(q);
      if (!match) return false;
    }
    // Type filter
    const ep = pct(c.emailsUsed, c.emailsLimit);
    const sp = pct(c.subscribersUsed, c.subscribersLimit);
    const max = Math.max(ep, sp);
    if (filter === "critical" && max < 100) return false;
    if (filter === "warning" && (max < 80 || max >= 100)) return false;
    if (filter === "managed" && !c.isManaged) return false;
    if (filter === "unmanaged" && c.isManaged) return false;
    return true;
  });

  // Summary stats
  const total = customers.length;
  const criticalCount = customers.filter((c) => {
    const max = Math.max(
      pct(c.emailsUsed, c.emailsLimit),
      pct(c.subscribersUsed, c.subscribersLimit),
    );
    return max >= 100;
  }).length;
  const warningCount = customers.filter((c) => {
    const max = Math.max(
      pct(c.emailsUsed, c.emailsLimit),
      pct(c.subscribersUsed, c.subscribersLimit),
    );
    return max >= 80 && max < 100;
  }).length;
  const managedCount = customers.filter((c) => c.isManaged).length;

  const FILTERS: {
    id: FilterType;
    label: string;
    count?: number;
    color?: string;
  }[] = [
    { id: "all", label: "All Customers", count: total },
    {
      id: "critical",
      label: "Over Limit",
      count: criticalCount,
      color: "text-destructive",
    },
    {
      id: "warning",
      label: "Near Limit (≥80%)",
      count: warningCount,
      color: "text-amber-600",
    },
    { id: "managed", label: "Managed", count: managedCount },
    { id: "unmanaged", label: "Non-Managed" },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Usage &amp; Quota</h1>
          <p className="text-muted-foreground mt-1">
            Monitor all customer installations. Non-managed customers
            self-enforce limits via their license file. Managed customers have
            full admin visibility.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2 shrink-0"
          disabled={isFetching}
        >
          <RefreshCw
            className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          {
            icon: Users,
            label: "Total Customers",
            value: total,
            color: "text-foreground",
          },
          {
            icon: XCircle,
            label: "Over Limit",
            value: criticalCount,
            color: "text-destructive",
          },
          {
            icon: AlertTriangle,
            label: "Near Limit",
            value: warningCount,
            color: "text-amber-500",
          },
          {
            icon: ShieldCheck,
            label: "Managed",
            value: managedCount,
            color: "text-emerald-500",
          },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, domain…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                filter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              <Filter className="w-3 h-3" />
              {f.label}
              {f.count !== undefined && (
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    filter === f.id
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : (f.color ?? "bg-muted")
                  }`}
                >
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-10 h-10" />
        </div>
      ) : error ? (
        <div className="text-destructive text-center py-20">
          Failed to load usage data. Please refresh.
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-16 text-center text-muted-foreground">
            No customers match this filter.
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border/50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-4"></th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Plan
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Emails / Month
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Subscribers
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Domains
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Instance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((c) => {
                  const ep = pct(c.emailsUsed, c.emailsLimit);
                  const sp = pct(c.subscribersUsed, c.subscribersLimit);
                  return (
                    <tr
                      key={c.userId}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Alert icon */}
                      <td className="px-5 py-4">
                        <AlertIcon emailPct={ep} subsPct={sp} />
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">
                          {c.company ?? c.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.email}
                        </div>
                      </td>

                      {/* Managed / Non-managed */}
                      <td className="px-5 py-4">
                        {c.isManaged ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            Managed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                            <ShieldOff className="w-3 h-3" />
                            Non-Managed
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                            PLAN_COLORS[c.plan] ?? PLAN_COLORS.free
                          }`}
                        >
                          {c.plan}
                        </span>
                      </td>

                      {/* Emails usage */}
                      <td className="px-5 py-4">
                        {c.isManaged ? (
                          <UsageBar
                            used={c.emailsUsed}
                            limit={c.emailsLimit}
                            label="Emails"
                          />
                        ) : (
                          /* Non-managed: quota is enforced by the license file itself */
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="font-medium text-foreground">
                              {fmt(c.emailsLimit)}/mo
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <ShieldOff className="w-3 h-3" />
                              License-enforced
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Subscribers usage */}
                      <td className="px-5 py-4">
                        {c.isManaged ? (
                          <UsageBar
                            used={c.subscribersUsed}
                            limit={c.subscribersLimit}
                            label="Subscribers"
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <div className="font-medium text-foreground">
                              {fmt(c.subscribersLimit)} limit
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <ShieldOff className="w-3 h-3" />
                              License-enforced
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Domains / Installations */}
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {c.activeLicenses}{" "}
                          <span className="text-muted-foreground font-normal">
                            / {c.totalLicenses}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          active / total
                        </div>
                        {c.domain && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[140px]">
                            {c.domain}
                          </div>
                        )}
                      </td>

                      {/* Instance ping — only meaningful for managed */}
                      <td className="px-5 py-4">
                        {c.isManaged ? (
                          <PingBadge lastPingAt={c.lastPingAt} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
            <span>
              Showing {filtered.length} of {total} customers
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Auto-refreshes every 60s
            </span>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Under 80%
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> 80–99% —
          approaching limit
        </span>
        <span className="flex items-center gap-1.5">
          <XCircle className="w-3.5 h-3.5 text-destructive" /> 100%+ — over
          limit
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldOff className="w-3.5 h-3.5" /> Non-managed: limits enforced by
          license file, not this dashboard
        </span>
      </div>
    </DashboardLayout>
  );
}
