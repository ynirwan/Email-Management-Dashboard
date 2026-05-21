import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  Button,
  Input,
  Spinner,
} from "@/components/ui/core";
import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Clock,
  Users,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  Filter,
  Monitor,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface CustomerUsageRow {
  userId: number;
  name: string;
  email: string;
  company: string | null;
  plan: string;
  isActive: boolean;
  licenseId: number | null;
  domain: string | null;
  licenseStatus: "active" | "expiring" | "revoked" | "expired" | null;
  isManaged: boolean;
  adminAccessEnabled: boolean;
  lastPingAt: string | null;
  pingCount: number;
  expiresAt: string | null;
  totalLicenses: number;
  activeLicenses: number;
  installationIds: string[];
  seatLimit: number;
}

interface UsageListResponse {
  customers: CustomerUsageRow[];
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pingStatus(lastPingAt: string | null): "online" | "stale" | "offline" {
  if (!lastPingAt) return "offline";
  const hours = (Date.now() - new Date(lastPingAt).getTime()) / 3_600_000;
  if (hours < 2)  return "online";
  if (hours < 48) return "stale";
  return "offline";
}

const PLAN_COLORS: Record<string, string> = {
  starter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  pro:     "bg-violet-500/10 text-violet-600 border-violet-500/20",
  agency:  "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

const LICENSE_STATUS_COLORS: Record<string, string> = {
  active:   "text-emerald-600",
  expiring: "text-amber-600",
  revoked:  "text-destructive",
  expired:  "text-muted-foreground",
};

// ── PingBadge ─────────────────────────────────────────────────────────────────

function PingBadge({ lastPingAt }: { lastPingAt: string | null }) {
  const s = pingStatus(lastPingAt);
  if (s === "online")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <Wifi className="w-3 h-3" /> Online
      </span>
    );
  if (s === "stale")
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
      <WifiOff className="w-3 h-3" /> No ping
    </span>
  );
}

// ── SeatsPill ─────────────────────────────────────────────────────────────────

function SeatsPill({ used, limit }: { used: number; limit: number }) {
  const unlimited = limit >= 9_000_000;
  const full = !unlimited && used >= limit;
  const near = !unlimited && !full && used >= limit - 1 && limit > 1;
  const cls = full
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : near
    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
    : "bg-muted/60 text-muted-foreground border-border/50";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${cls}`}>
      <Monitor className="w-3 h-3" />
      {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
    </span>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

function useUsageList() {
  return useQuery<UsageListResponse>({
    queryKey: ["/api/admin/usage"],
    queryFn: () => fetchApi("/api/admin/usage"),
    refetchInterval: 60_000,
  });
}

// ── Filter types ──────────────────────────────────────────────────────────────

type FilterType = "all" | "seat_full" | "no_ping" | "managed" | "unmanaged";

// ── Page ──────────────────────────────────────────────────────────────────────

export function UsageEnforcement() {
  const { data, isLoading, error, refetch, isFetching } = useUsageList();
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState<FilterType>("all");

  const customers = data?.customers ?? [];

  const filtered = customers.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.name.toLowerCase().includes(q) &&
        !c.email.toLowerCase().includes(q) &&
        !(c.company?.toLowerCase() ?? "").includes(q) &&
        !(c.domain?.toLowerCase() ?? "").includes(q)
      ) return false;
    }
    if (filter === "seat_full")  return c.seatLimit < 9_000_000 && c.installationIds.length >= c.seatLimit;
    if (filter === "no_ping")    return pingStatus(c.lastPingAt) === "offline";
    if (filter === "managed")    return c.isManaged;
    if (filter === "unmanaged")  return !c.isManaged;
    return true;
  });

  // Summary counts
  const total        = customers.length;
  const seatFullCnt  = customers.filter(c => c.seatLimit < 9_000_000 && c.installationIds.length >= c.seatLimit).length;
  const noPingCnt    = customers.filter(c => pingStatus(c.lastPingAt) === "offline").length;
  const managedCnt   = customers.filter(c => c.isManaged).length;

  const FILTERS: { id: FilterType; label: string; count?: number; color?: string }[] = [
    { id: "all",       label: "All Customers",   count: total },
    { id: "seat_full", label: "Seats Full",       count: seatFullCnt,  color: "text-destructive" },
    { id: "no_ping",   label: "No Ping",          count: noPingCnt,    color: "text-amber-600" },
    { id: "managed",   label: "Managed",          count: managedCnt },
    { id: "unmanaged", label: "Non-Managed" },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Usage &amp; Installations</h1>
          <p className="text-muted-foreground mt-1">
            Monitor customer installations, seat usage, and ping health across all licenses.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2 shrink-0"
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users,         label: "Total Customers", value: total,       color: "text-foreground" },
          { icon: Monitor,       label: "Seats Full",      value: seatFullCnt, color: "text-destructive" },
          { icon: WifiOff,       label: "No Ping",         value: noPingCnt,   color: "text-amber-500" },
          { icon: ShieldCheck,   label: "Managed",         value: managedCnt,  color: "text-emerald-500" },
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
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plan</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Installations</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Domain</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Ping</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((c) => {
                  const ps = pingStatus(c.lastPingAt);
                  const licColor = LICENSE_STATUS_COLORS[c.licenseStatus ?? ""] ?? "";
                  return (
                    <tr key={c.userId} className="hover:bg-muted/30 transition-colors">

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-foreground">{c.company ?? c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.email}</div>
                        {!c.isActive && (
                          <span className="text-[10px] text-destructive font-semibold">Inactive account</span>
                        )}
                      </td>

                      {/* Managed / Non-managed */}
                      <td className="px-5 py-4">
                        {c.isManaged ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" /> Managed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full">
                            <ShieldOff className="w-3 h-3" /> Self-hosted
                          </span>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${PLAN_COLORS[c.plan] ?? "bg-muted text-muted-foreground"}`}>
                          {c.plan}
                        </span>
                      </td>

                      {/* Installations */}
                      <td className="px-5 py-4">
                        <SeatsPill used={c.installationIds.length} limit={c.seatLimit} />
                        {c.totalLicenses > 1 && (
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {c.activeLicenses} / {c.totalLicenses} licenses active
                          </div>
                        )}
                      </td>

                      {/* Domain */}
                      <td className="px-5 py-4">
                        {c.domain ? (
                          <>
                            <code className="text-xs font-mono text-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                              {c.domain}
                            </code>
                            {c.licenseStatus && (
                              <div className={`text-[10px] mt-0.5 font-medium capitalize ${licColor}`}>
                                {c.licenseStatus}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">No license</span>
                        )}
                      </td>

                      {/* Last Ping */}
                      <td className="px-5 py-4">
                        <PingBadge lastPingAt={c.lastPingAt} />
                        {c.pingCount > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {c.pingCount} total pings
                          </div>
                        )}
                      </td>

                      {/* Expires */}
                      <td className="px-5 py-4">
                        {c.expiresAt ? (
                          <span className={`text-xs font-medium ${
                            c.licenseStatus === "expired"  ? "text-destructive" :
                            c.licenseStatus === "expiring" ? "text-amber-600"   : "text-muted-foreground"
                          }`}>
                            {new Date(c.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
            <span>Showing {filtered.length} of {total} customers</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Auto-refreshes every 60s
            </span>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-emerald-500" /> Pinged within 2h
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" /> Stale — last ping 2–48h ago
        </span>
        <span className="flex items-center gap-1.5">
          <WifiOff className="w-3.5 h-3.5" /> No ping — not yet installed or offline &gt;48h
        </span>
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive" /> Installations at seat limit
        </span>
      </div>
    </DashboardLayout>
  );
}
