import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  Button,
  Input,
  Badge,
  Modal,
  Label,
  Spinner,
} from "@/components/ui/core";
import {
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  RefreshCw,
  X,
  ExternalLink,
  AlertTriangle,
  Copy,
  CheckCircle2,
  Wrench,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  useLicenses,
  useGenerateLicense,
  useRevokeLicense,
  useUnrevokeLicense,
  useRenewLicense,
  useAdminToken,
  useToggleManaged,
} from "@/hooks/use-licenses";
import { useUsers } from "@/hooks/use-users";
import { format, differenceInDays, parseISO } from "date-fns";
import { formatNumber } from "@/lib/utils";

const PLAN_DEFAULTS: Record<string, { emails: number; subs: number }> = {
  starter: { emails: 100000, subs: 25000 },
  pro: { emails: 500000, subs: 100000 },
  agency: { emails: 1000000, subs: 250000 },
  
};

const ALL_FEATURES = [
  "ab_testing",
  "automation",
  "segmentation",
  "analytics_advanced",
  "custom_domains",
  "suppression_management",
  "api_access",
  "gdpr_tools",
  "audit_trail",
  "white_label",
];

const FEATURE_LABELS: Record<string, string> = {
  ab_testing: "A/B Testing",
  automation: "Automation",
  segmentation: "Segmentation",
  analytics_advanced: "Analytics Pro",
  custom_domains: "Custom Domains",
  suppression_management: "Suppression Mgmt",
  api_access: "API Access",
  gdpr_tools: "GDPR Tools",
  audit_trail: "Audit Trail",
  white_label: "White Label",
};

const PLAN_DEFAULT_FEATURES: Record<string, string[]> = {
  starter: ["analytics_advanced", "suppression_management"],
  pro: [
    "ab_testing",
    "automation",
    "segmentation",
    "analytics_advanced",
    "custom_domains",
    "suppression_management",
    "api_access",
    "gdpr_tools",
    "audit_trail",
  ],
  agency: [...ALL_FEATURES],
};

function statusBadge(status: string) {
  if (status === "active")
    return (
      <Badge variant="success" className="gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Active
      </Badge>
    );
  if (status === "expiring")
    return (
      <Badge variant="warning" className="gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Expiring
      </Badge>
    );
  if (status === "revoked")
    return (
      <Badge className="gap-1.5 bg-destructive/10 text-destructive">
        <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
        Revoked
      </Badge>
    );
  return <Badge variant="outline">Expired</Badge>;
}

function planBadge(plan: string) {
  const cls: Record<string, string> = {
    starter: "bg-blue-500/10 text-blue-600",
    pro: "bg-primary/10 text-primary",
    agency: "bg-purple-500/10 text-purple-600",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize ${cls[plan] ?? ""}`}
    >
      {plan}
    </span>
  );
}

export function Licenses() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [accessLicense, setAccessLicense] = useState<any>(null);
  const [detailLicense, setDetailLicense] = useState<any>(null);

  const { data: apiData, isLoading } = useLicenses(1, 50, search, statusFilter);
  const licenses: any[] = apiData?.licenses ?? [];

  const revokeMutation = useRevokeLicense();
  const unrevokeMutation = useUnrevokeLicense();
  const renewMutation = useRenewLicense();

  const filtered = licenses.filter((l) => {
    const matchSearch =
      !search ||
      l.customerName.toLowerCase().includes(search.toLowerCase()) ||
      l.domain.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || l.status === statusFilter;
    const matchPlan = !planFilter || l.plan === planFilter;
    return matchSearch && matchStatus && matchPlan;
  });

  const activeCnt = licenses.filter((l) => l.status === "active").length;
  const expiringCnt = licenses.filter((l) => l.status === "expiring").length;
  const revokedCnt = licenses.filter((l) => l.status === "revoked").length;

  const expiringSoon = licenses.filter((l) => l.status === "expiring");

  const handleRevoke = (id: number) => {
    if (
      !confirm(
        "Revoke this license? The customer app will stop working within 24 hours.",
      )
    )
      return;
    revokeMutation.mutate(id);
  };

  const handleUnrevoke = (id: number) => {
    if (!confirm("Unrevoke this license and reactivate it?")) return;
    unrevokeMutation.mutate(id);
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">License Manager</h1>
          <p className="text-muted-foreground mt-1">
            {activeCnt} active · {expiringCnt} expiring soon · {revokedCnt}{" "}
            revoked
          </p>
        </div>
        <Button onClick={() => setShowGenerate(true)}>
          <Plus className="w-4 h-4" />
          Generate License
        </Button>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Active",
            value: activeCnt,
            color: "text-emerald-500",
            icon: ShieldCheck,
          },
          {
            label: "Expiring",
            value: expiringCnt,
            color: "text-amber-500",
            icon: Clock,
          },
          {
            label: "Revoked",
            value: revokedCnt,
            color: "text-destructive",
            icon: ShieldAlert,
          },
          {
            label: "Total",
            value: licenses.length,
            color: "text-foreground",
            icon: ShieldCheck,
          },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {label}
              </p>
              <p className={`font-display font-extrabold text-3xl ${color}`}>
                {value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Expiring soon alert */}
      {expiringSoon.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 mb-6">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Expiring Soon
            </p>
            <div className="flex flex-col gap-2">
              {expiringSoon.map((l) => {
                const days = differenceInDays(
                  parseISO(l.expiresAt),
                  new Date(),
                );
                return (
                  <div key={l.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium">
                        {l.customerName}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2 font-mono">
                        {l.domain}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">{days} days left</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          renewMutation.mutate({
                            id: l.id,
                            expiresAt: new Date(
                              Date.now() + 365 * 24 * 60 * 60 * 1000,
                            ).toISOString(),
                          })
                        }
                        isLoading={renewMutation.isPending}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Renew
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main table */}
      <Card className="border-border/50">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border/50">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customer or domain..."
              className="pl-10 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-9 rounded-xl border-2 border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary transition-all"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring</option>
            <option value="revoked">Revoked</option>
            <option value="expired">Expired</option>
          </select>
          <select
            className="h-9 rounded-xl border-2 border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary transition-all"
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
          >
            <option value="">All Plans</option>
            
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="agency">Agency</option>
          </select>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} licenses
          </span>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="w-8 h-8" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/40 border-b border-border/50">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Domain</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Features</th>
                  <th className="px-5 py-3 font-semibold">Quota</th>
                  <th className="px-5 py-3 font-semibold">Expires</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-12 text-center text-muted-foreground"
                    >
                      No licenses found
                    </td>
                  </tr>
                ) : (
                  filtered.map((lic) => (
                    <tr
                      key={lic.id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium">
                        <div className="flex items-center gap-2">
                          {lic.customerName}
                          {lic.isManaged && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                              <Wrench className="w-2.5 h-2.5" />
                              Managed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                          {lic.domain}
                        </code>
                      </td>
                      <td className="px-5 py-3.5">{planBadge(lic.plan)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {lic.features.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              None
                            </span>
                          ) : (
                            lic.features.slice(0, 2).map((f: string) => (
                              <span
                                key={f}
                                className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded font-medium"
                              >
                                {FEATURE_LABELS[f] ?? f}
                              </span>
                            ))
                          )}
                          {lic.features.length > 2 && (
                            <span className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                              +{lic.features.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                        {formatNumber(lic.emailsPerMonth)}/mo
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">
                        {format(parseISO(lic.expiresAt), "MMM d, yyyy")}
                      </td>
                      <td className="px-5 py-3.5">{statusBadge(lic.status)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDetailLicense(lic)}
                          >
                            Detail
                          </Button>
                          {(lic.status === "active" || lic.status === "expiring") && lic.isManaged && lic.adminAccessEnabled ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-50"
                              onClick={() => setAccessLicense(lic)}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Access App
                            </Button>
                          ) : null}
                          {lic.status !== "revoked" &&
                            lic.status !== "expired" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRevoke(lic.id)}
                                isLoading={revokeMutation.isPending}
                              >
                                Revoke
                              </Button>
                            )}
                          {lic.status === "revoked" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnrevoke(lic.id)}
                              isLoading={unrevokeMutation.isPending}
                            >
                              Unrevoke
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Generate License Modal */}
      <GenerateLicenseModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
      />

      {/* License Detail Modal */}
      {detailLicense && (
        <LicenseDetailModal
          license={detailLicense}
          onClose={() => setDetailLicense(null)}
        />
      )}

      {/* Access App Modal */}
      {accessLicense && (
        <AccessAppModal
          license={accessLicense}
          onClose={() => setAccessLicense(null)}
        />
      )}
    </DashboardLayout>
  );
}

// ── Generate License Modal ────────────────────────────────────────────────────
function GenerateLicenseModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [plan, setPlan] = useState<string>("pro");
  const [features, setFeatures] = useState<string[]>(
    PLAN_DEFAULT_FEATURES["pro"],
  );
  const generateMutation = useGenerateLicense();
  const { data: usersData } = useUsers(1, 100);

  const handlePlanChange = (p: string) => {
    setPlan(p);
    setFeatures(PLAN_DEFAULT_FEATURES[p] ?? []);
  };

  const toggleFeature = (f: string) =>
    setFeatures((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f],
    );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    generateMutation.mutate(
      {
        customerId: Number(fd.get("customerId")),
        domain: fd.get("domain") as string,
        plan: plan as any,
        emailsPerMonth: Number(fd.get("emailsPerMonth")),
        subscribersLimit: Number(fd.get("subscribersLimit")),
        features,
        expiresAt: new Date(fd.get("expiresAt") as string).toISOString(),
      },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate License"
      description="Create a cryptographically signed license file for a customer"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Customer</Label>
            <select
              name="customerId"
              className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary transition-all"
            >
              {usersData?.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.company ?? u.name}
                </option>
              )) ?? <option value="1">Loading...</option>}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Plan</Label>
            <select
              name="plan"
              value={plan}
              onChange={(e) => handlePlanChange(e.target.value)}
              className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-primary transition-all"
            >
              
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="agency">Agency</option>
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Locked Domain</Label>
          <Input
            name="domain"
            placeholder="app.customer.com"
            className="h-11"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Emails / Month</Label>
            <Input
              name="emailsPerMonth"
              type="number"
              defaultValue={PLAN_DEFAULTS[plan]?.emails ?? 500}
              className="h-11"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Subscriber Limit</Label>
            <Input
              name="subscribersLimit"
              type="number"
              defaultValue={PLAN_DEFAULTS[plan]?.subs ?? 500}
              className="h-11"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Valid From</Label>
            <Input
              name="issuedAt"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Expires On</Label>
            <Input
              name="expiresAt"
              type="date"
              defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10)}
              className="h-11"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs">Feature Flags</Label>
          <div className="flex flex-wrap gap-2">
            {ALL_FEATURES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFeature(f)}
                className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-all ${
                  features.includes(f)
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted/40 text-muted-foreground border-border/50 hover:border-primary/20"
                }`}
              >
                {FEATURE_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={generateMutation.isPending}>
            <ShieldCheck className="w-4 h-4" />
            Generate & Sign
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── License Detail Modal ──────────────────────────────────────────────────────
function LicenseDetailModal({
  license: lic,
  onClose,
}: {
  license: any;
  onClose: () => void;
}) {
  const renewMutation  = useRenewLicense();
  const revokeMutation = useRevokeLicense();
  const unrevokeMutation = useUnrevokeLicense();
  const managedMutation = useToggleManaged();
  const [noteInput, setNoteInput] = useState(lic.managedNote ?? "");
  const [localManaged, setLocalManaged]       = useState<boolean>(lic.isManaged ?? false);
  const [localAccess,  setLocalAccess]        = useState<boolean>(lic.adminAccessEnabled ?? false);

  const handleManagedToggle = (newValue: boolean) => {
    const action = newValue ? "opt_in" : "opt_out";
    managedMutation.mutate(
      { id: lic.id, action, note: noteInput || undefined },
      {
        onSuccess: () => {
          setLocalManaged(newValue);
          if (!newValue) setLocalAccess(false);
          else setLocalAccess(true);
        },
      }
    );
  };

  const handleAccessToggle = (newValue: boolean) => {
    const action = newValue ? "enable_access" : "disable_access";
    managedMutation.mutate(
      { id: lic.id, action },
      { onSuccess: () => setLocalAccess(newValue) }
    );
  };

  const jsonPreview = JSON.stringify(
    {
      license_id: `lic_${lic.customerName.toLowerCase().replace(/\s+/g, "_")}_${lic.plan}`,
      customer: lic.customerName,
      domain: lic.domain,
      plan: lic.plan,
      emails_per_month: lic.emailsPerMonth,
      subscribers_limit: lic.subscribersLimit,
      features: lic.features,
      expires_at: lic.expiresAt + "T00:00:00Z",
      signature: "eyJhbGciOiJSUzI1NiJ9...",
    },
    null,
    2,
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="License Detail"
      description={`lic_${lic.customerName.toLowerCase().replace(/\s+/g, "_")}_${lic.plan} · RSA-SHA256`}
    >
      <div className="space-y-4">

        {/* ── Managed Service Panel ── */}
        <div className="rounded-2xl border border-border/60 overflow-hidden">
          <div className="bg-muted/40 px-4 py-3 border-b border-border/40">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" />
              Managed Services
            </p>
          </div>
          <div className="p-4 space-y-4">

            {/* Managed toggle */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Managed Customer</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customer has opted into ZeniPost Managed Services (SMTP, deliverability, support).
                </p>
                {localManaged && lic.managedSince && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Managed since {new Date(lic.managedSince).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleManagedToggle(!localManaged)}
                disabled={managedMutation.isPending}
                className="shrink-0 mt-0.5"
                title={localManaged ? "Remove managed status" : "Mark as managed customer"}
              >
                {localManaged
                  ? <ToggleRight className="w-8 h-8 text-blue-600" />
                  : <ToggleLeft  className="w-8 h-8 text-muted-foreground" />
                }
              </button>
            </div>

            {/* Admin access toggle — only shown when managed */}
            {localManaged && (
              <div className="flex items-start justify-between gap-4 pt-3 border-t border-border/40">
                <div>
                  <p className="text-sm font-semibold">Admin Login Access</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Allow ZeniPost admins to log into this customer's app via the dashboard.
                    Disable temporarily if customer requests a privacy window.
                  </p>
                  {!localAccess && localManaged && (
                    <p className="text-[10px] text-amber-600 font-semibold mt-1">
                      ⚠ Access disabled — "Access App" button is hidden for this license.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleAccessToggle(!localAccess)}
                  disabled={managedMutation.isPending}
                  className="shrink-0 mt-0.5"
                  title={localAccess ? "Disable admin access" : "Enable admin access"}
                >
                  {localAccess
                    ? <ToggleRight className="w-8 h-8 text-emerald-600" />
                    : <ToggleLeft  className="w-8 h-8 text-muted-foreground" />
                  }
                </button>
              </div>
            )}

            {/* Internal note */}
            <div className="pt-3 border-t border-border/40">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Internal Note
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="e.g. SMTP Basic, SES us-east-1, onboarded Mar 2026"
                  className="flex-1 text-xs h-9 rounded-xl border-2 border-input bg-background px-3 focus:outline-none focus:border-primary transition-all"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => managedMutation.mutate({ id: lic.id, action: localManaged ? "opt_in" : "opt_out", note: noteInput })}
                  isLoading={managedMutation.isPending}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        </div>

        <pre className="bg-sidebar text-xs font-mono text-sidebar-foreground/80 rounded-xl p-4 overflow-x-auto leading-relaxed">
          {jsonPreview}
        </pre>

        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ["Customer", lic.customerName],
            ["Domain", lic.domain],
            ["Plan", lic.plan],
            ["Status", lic.status],
            ["Issued", lic.issuedAt],
            ["Expires", lic.expiresAt],
          ].map(([label, value]) => (
            <div key={label} className="bg-muted/30 rounded-lg p-2.5">
              <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                {label}
              </div>
              <div className="font-medium capitalize">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigator.clipboard?.writeText(jsonPreview)}
          >
            Copy JSON
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              renewMutation.mutate(
                {
                  id: lic.id,
                  expiresAt: new Date(
                    Date.now() + 365 * 24 * 60 * 60 * 1000,
                  ).toISOString(),
                },
                { onSuccess: onClose },
              )
            }
            isLoading={renewMutation.isPending}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Renew 12 Months
          </Button>
          {lic.status !== "revoked" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("Revoke this license?"))
                  revokeMutation.mutate(lic.id, { onSuccess: onClose });
              }}
              isLoading={revokeMutation.isPending}
            >
              <X className="w-3.5 h-3.5" />
              Revoke
            </Button>
          )}
          {lic.status === "revoked" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm("Unrevoke this license and reactivate it?"))
                  unrevokeMutation.mutate(lic.id, { onSuccess: onClose });
              }}
              isLoading={unrevokeMutation.isPending}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Unrevoke
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ── Access App Modal ──────────────────────────────────────────────────────────
// Generates a short-lived admin access token and opens the customer's app
// in a new tab with automatic super-admin login. Token expires in 15 minutes.
function AccessAppModal({ license: lic, onClose }: { license: any; onClose: () => void }) {
  const adminTokenMutation = useAdminToken();
  const [tokenData, setTokenData]   = useState<any>(null);
  const [copied, setCopied]         = useState(false);
  const [countdown, setCountdown]   = useState(0);

  const handleGenerate = () => {
    adminTokenMutation.mutate(lic.id, {
      onSuccess: (data) => {
        setTokenData(data);
        setCountdown(900); // 15 min in seconds
      },
    });
  };

  // Countdown timer
  useState(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => {
      if (c <= 1) { clearInterval(t); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  });

  const handleOpenApp = () => {
    if (tokenData?.accessUrl) {
      window.open(tokenData.accessUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleCopyUrl = () => {
    if (tokenData?.accessUrl) {
      navigator.clipboard?.writeText(tokenData.accessUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const isExpired = tokenData && countdown === 0;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Access Customer App"
      description={`Generate a temporary admin login link for ${lic.domain}`}
    >
      <div className="space-y-4">

        {/* License info */}
        <div className="rounded-xl bg-muted/40 border border-border/50 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Customer</span>
            <span className="font-semibold">{lic.customerName}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Domain</span>
            <code className="font-mono text-xs bg-background border border-border/50 px-2 py-0.5 rounded-lg">{lic.domain}</code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Plan</span>
            <span className="font-semibold capitalize">{lic.plan}</span>
          </div>
        </div>

        {/* Security warning */}
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Security Notice</p>
              <p>This generates a <strong>super-admin login link</strong> valid for 15 minutes only. It will be logged in the audit trail. Do not share this link with anyone.</p>
            </div>
          </div>
        </div>

        {/* Not yet generated */}
        {!tokenData && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center py-2">
              Click below to generate a secure one-time access link. The link expires in 15 minutes.
            </p>
            <Button
              className="w-full gap-2"
              onClick={handleGenerate}
              isLoading={adminTokenMutation.isPending}
            >
              <ShieldCheck className="w-4 h-4" />
              Generate Access Link
            </Button>
          </div>
        )}

        {/* Token generated */}
        {tokenData && (
          <div className="space-y-4">

            {/* Countdown */}
            <div className={`rounded-xl border p-4 text-center ${isExpired ? "bg-destructive/10 border-destructive/30" : "bg-emerald-50 border-emerald-200"}`}>
              {isExpired ? (
                <div>
                  <p className="text-sm font-semibold text-destructive">Token Expired</p>
                  <p className="text-xs text-destructive/80 mt-0.5">Generate a new link to continue</p>
                </div>
              ) : (
                <div>
                  <p className="text-3xl font-mono font-bold text-emerald-700 tabular-nums">
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </p>
                  <p className="text-xs text-emerald-700 mt-1 font-medium">remaining before expiry</p>
                </div>
              )}
            </div>

            {/* Access URL */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Access URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] font-mono bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5 break-all text-muted-foreground">
                  {tokenData.accessUrl}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className="p-2.5 rounded-xl border border-border/50 hover:bg-accent/10 transition-colors shrink-0"
                  title="Copy URL"
                >
                  {copied
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Copy className="w-4 h-4 text-muted-foreground" />
                  }
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              {!isExpired ? (
                <Button className="flex-1 gap-2" onClick={handleOpenApp}>
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </Button>
              ) : (
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  onClick={() => { setTokenData(null); setCountdown(0); handleGenerate(); }}
                  isLoading={adminTokenMutation.isPending}
                >
                  <RefreshCw className="w-4 h-4" />
                  Generate New Link
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              Access logged as {tokenData.issuedBy} at {new Date(tokenData.issuedAt).toLocaleTimeString()}
            </p>
          </div>
        )}

      </div>
    </Modal>
  );
}
