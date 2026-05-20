import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, Button, Input, Spinner } from "@/components/ui/core";
import { Search, Download, ShieldAlert, User, CreditCard, Lock, Cpu } from "lucide-react";
import { useAuditLogs } from "@/hooks/use-audit";
import type { AuditCategory } from "@/hooks/use-audit";
import { format, parseISO } from "date-fns";


const CATEGORY_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  license:  { color: "text-primary",          bg: "bg-primary/10",     icon: ShieldAlert },
  user:     { color: "text-blue-500",          bg: "bg-blue-500/10",   icon: User },
  plan:     { color: "text-purple-500",        bg: "bg-purple-500/10", icon: CreditCard },
  security: { color: "text-destructive",       bg: "bg-destructive/10",icon: Lock },
  system:   { color: "text-muted-foreground",  bg: "bg-muted/60",      icon: Cpu },
};

const TABS = [
  { label: "All Events", value: "" },
  { label: "License",    value: "license" },
  { label: "User",       value: "user" },
  { label: "Plan",       value: "plan" },
  { label: "Security",   value: "security" },
];

export function AuditLogs() {
  const [activeTab, setActiveTab] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("7d");

  const { data: apiData, isLoading } = useAuditLogs(1, 50, search, activeTab as AuditCategory | "", range);
  const logs: any[] = apiData?.logs ?? [];
  const filtered = logs;

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Complete trail of all admin actions · {filtered.length} events</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-1.5" />
          Export Logs
        </Button>
      </div>

      <Card className="border-border/50">
        {/* Tabs */}
        <div className="flex border-b border-border/50 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/50">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter events..."
              className="pl-10 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-xl border-2 border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary transition-all"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All time</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} events</span>
        </div>

        {/* Log list */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">No events found</div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((log) => {
              const cfg = CATEGORY_CONFIG[log.category] ?? CATEGORY_CONFIG.system;
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{log.action}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{log.detail}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(log.createdAt), "MMM d, HH:mm")}
                    </p>
                    <p className="text-xs font-medium text-foreground/80 mt-0.5">{log.adminName}</p>
                    <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>
                      {log.category}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            Showing 1–{filtered.length} of {apiData?.total ?? filtered.length} events
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">← Prev</Button>
            <Button size="sm" variant="outline">Next →</Button>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  );
}