// artifacts/email-platform/src/pages/dashboard/Licenses.tsx
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
  Truck,
} from "lucide-react";
import {
  useLicenses,
  useGenerateLicense,
  useRevokeLicense,
  useUnrevokeLicense,
  useRenewLicense,
  useAdminToken,
  useToggleManaged,
  useAssignDelivery,
  ALL_FEATURES,
  FEATURE_LABELS,
  PLAN_DEFAULT_FEATURES,
  PLAN_QUOTAS,
  DELIVERY_PLAN_OPTIONS,
} from "@/hooks/use-licenses";
import { useUsers } from "@/hooks/use-users";
import { format, differenceInDays, parseISO } from "date-fns";
import { formatNumber } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_DEFAULTS = PLAN_QUOTAS;

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── AssignDeliveryModal ───────────────────────────────────────────────────────

function AssignDeliveryModal({
  license: lic,
  onClose,
}: {
  license: any;
  onClose: () => void;
}) {
  const assignMutation = useAssignDelivery();
  const [selected, setSelected] = useState<string>(lic.deliveryPlanId ?? "");

  const hasDelivery = !!lic.deliveryPlanId;

  const handleAssign = () => {
    if (!selected) return;
    assignMutation.mutate(
      { id: lic.id, action: "assign", planId: selected },
      { onSuccess: onClose },
    );
  };

  const handleRemove = () => {
    assignMutation.mutate(
      { id: lic.id, action: "remove" },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Managed Delivery Plan"
      description={`Assign or change the delivery plan for ${lic.domain}`}
    >
      <div className="space-y-2 my-2">
        {DELIVERY_PLAN_OPTIONS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => setSelected(plan.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
              selected === plan.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-border/60"
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                selected === plan.id
                  ? "border-primary bg-primary"
                  : "border-muted-foreground"
              }`}
            >
              {selected === plan.id && (
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">{plan.name}</span>
                <span className="text-sm font-bold text-primary">
                  {plan.price}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {plan.volume} · {plan.infra}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-border mt-4">
        {hasDelivery && (
          <Button
            variant="outline"
            onClick={handleRemove}
            isLoading={assignMutation.isPending}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Remove Plan
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              !selected ||
              selected === lic.deliveryPlanId ||
              assignMutation.isPending
            }
            isLoading={assignMutation.isPending}
            className="gap-2"
          >
            <Truck className="w-4 h-4" />
            {hasDelivery ? "Update Plan" : "Assign Plan"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── GenerateLicenseModal ──────────────────────────────────────────────────────

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
    setFeatures(
      PLAN_DEFAULT_FEATURES[p as keyof typeof PLAN_DEFAULT_FEATURES] ?? [],
    );
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
              {usersData?.users.map((u: any) => (
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
              defaultValue={
                PLAN_DEFAULTS[plan as keyof typeof PLAN_DEFAULTS]?.emails ??
                2500
              }
              className="h-11"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Subscriber Limit</Label>
            <Input
              name="subscribersLimit"
              type="number"
              defaultValue={
                PLAN_DEFAULTS[plan as keyof typeof PLAN_DEFAULTS]?.subs ?? 500
              }
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
          <p className="text-xs text-muted-foreground">
            Delivery flags (Managed Delivery, Dedicated IP, IP Warmup) are
            assigned automatically via the delivery plan — do not add them
            manually.
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          ⚠️ Existing licenses are <strong>not affected</strong> by plan
          changes. Only newly generated licenses will use the updated limits.
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            isLoading={generateMutation.isPending}
            className="gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Generate & Sign
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── LicenseDetailModal ────────────────────────────────────────────────────────

function LicenseDetailModal({
  license: lic,
  onClose,
}: {
  license: any;
  onClose: () => void;
}) {
  const renewMutation = useRenewLicense();
  const revokeMutation = useRevokeLicense();
  const unrevokeMutation = useUnrevokeLicense();
  const managedMutation = useToggleManaged();
  const [noteInput, setNoteInput] = useState(lic.managedNote ?? "");
  const [localManaged, setLocalManaged] = useState<boolean>(
    lic.isManaged ?? false,
  );
  const [localAccess, setLocalAccess] = useState<boolean>(
    lic.adminAccessEnabled ?? false,
  );

  const daysLeft = differenceInDays(parseISO(lic.expiresAt), new Date());

  const handleManagedToggle = (newVal: boolean) => {
    setLocalManaged(newVal);
    managedMutation.mutate({
      id: lic.id,
      action: newVal ? "opt_in" : "opt_out",
      note: noteInput,
    });
  };

  const handleAccessToggle = (newVal: boolean) => {
    setLocalAccess(newVal);
    managedMutation.mutate({
      id: lic.id,
      action: newVal ? "enable_access" : "disable_access",
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`License — ${lic.domain}`}
      description={`Customer: ${lic.customerName ?? "—"} · Plan: ${lic.plan}`}
    >
      <div className="space-y-5">
        {/* Core info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ["Domain", lic.domain],
            ["Plan", lic.plan],
            ["Emails/mo", formatNumber(lic.emailsPerMonth)],
            ["Subscribers", formatNumber(lic.subscribersLimit)],
            ["Issued", lic.issuedAt],
            [
              "Expires",
              `${lic.expiresAt} (${daysLeft >= 0 ? `${daysLeft}d left` : "Expired"})`,
            ],
            ["Last Ping", lic.lastPingAt ?? "Never"],
            ["Ping Count", String(lic.pingCount ?? 0)],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Features */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Active Features</p>
          <div className="flex flex-wrap gap-1.5">
            {lic.features.map((f: string) => (
              <span
                key={f}
                className={`text-xs px-2 py-0.5 rounded-md font-medium border ${
                  ["managed_delivery", "dedicated_ip", "ip_warmup"].includes(f)
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-muted/60 text-muted-foreground border-border/50"
                }`}
              >
                {FEATURE_LABELS[f] ?? f}
              </span>
            ))}
          </div>
        </div>

        {/* Delivery plan summary */}
        {lic.deliveryPlanId && (
          <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3">
            <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" /> Managed Delivery Active
            </p>
            <div className="text-xs text-emerald-800 space-y-0.5">
              <p>{lic.deliveryPlanName ?? lic.deliveryPlanId}</p>
              {lic.deliveryInfra && (
                <p className="text-emerald-700/70">{lic.deliveryInfra}</p>
              )}
              {lic.deliveryEmailsLimit && (
                <p className="text-emerald-700/70">
                  {formatNumber(lic.deliveryEmailsLimit)} emails/month ceiling
                </p>
              )}
            </div>
          </div>
        )}

        {/* Managed service toggles */}
        <div className="space-y-3 rounded-xl border border-border/50 p-4 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Managed Services
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Managed Customer</p>
              <p className="text-xs text-muted-foreground">
                ZeniPost handles delivery + support
              </p>
            </div>
            <button
              onClick={() => handleManagedToggle(!localManaged)}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              {localManaged ? (
                <ToggleRight className="w-7 h-7 text-primary" />
              ) : (
                <ToggleLeft className="w-7 h-7" />
              )}
            </button>
          </div>

          {localManaged && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Admin Access</p>
                <p className="text-xs text-muted-foreground">
                  Allow admin login to their app
                </p>
              </div>
              <button
                onClick={() => handleAccessToggle(!localAccess)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {localAccess ? (
                  <ToggleRight className="w-7 h-7 text-primary" />
                ) : (
                  <ToggleLeft className="w-7 h-7" />
                )}
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Internal Note</Label>
            <div className="flex gap-2">
              <Input
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. SMTP Basic, SES us-east-1"
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-9 shrink-0"
                onClick={() =>
                  managedMutation.mutate({
                    id: lic.id,
                    action: localManaged ? "opt_in" : "opt_out",
                    note: noteInput,
                  })
                }
                isLoading={managedMutation.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Renew */}
        <div className="space-y-1.5">
          <Label className="text-xs">Renew — Set New Expiry</Label>
          <div className="flex gap-2">
            <Input
              type="date"
              id="renewDate"
              defaultValue={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                .toISOString()
                .slice(0, 10)}
              className="h-9 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              className="h-9 shrink-0 gap-1.5"
              onClick={() => {
                const inp = document.getElementById(
                  "renewDate",
                ) as HTMLInputElement;
                renewMutation.mutate(
                  { id: lic.id, expiresAt: new Date(inp.value).toISOString() },
                  { onSuccess: onClose },
                );
              }}
              isLoading={renewMutation.isPending}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Renew
            </Button>
          </div>
        </div>

        {/* Revoke / Unrevoke */}
        <div className="flex justify-end gap-2">
          {lic.status !== "revoked" && lic.status !== "expired" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (
                  confirm(
                    "Revoke this license? The customer app will stop working within 24 hours.",
                  )
                )
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

// ── AccessAppModal ────────────────────────────────────────────────────────────

function AccessAppModal({
  license: lic,
  onClose,
}: {
  license: any;
  onClose: () => void;
}) {
  const adminTokenMutation = useAdminToken();
  const [tokenData, setTokenData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleGenerate = () => {
    adminTokenMutation.mutate(lic.id, {
      onSuccess: (data) => {
        setTokenData(data);
        setCountdown(900);
      },
    });
  };

  // Countdown timer
  useState(() => {
    if (countdown <= 0) return;
    const t = setInterval(
      () =>
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(t);
            return 0;
          }
          return c - 1;
        }),
      1000,
    );
    return () => clearInterval(t);
  });

  const handleOpenApp = () => {
    if (tokenData?.accessUrl)
      window.open(tokenData.accessUrl, "_blank", "noopener,noreferrer");
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
        <div className="rounded-xl bg-muted/40 border border-border/50 p-4 space-y-2">
          {[
            ["Customer", lic.customerName],
            ["Domain", lic.domain],
            ["Plan", lic.plan],
          ].map(([label, val]) => (
            <div
              key={label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold capitalize">{val}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Security Notice</p>
              <p>
                This generates a <strong>super-admin login link</strong> valid
                for 15 minutes only. Do not share it.
              </p>
            </div>
          </div>
        </div>

        {!tokenData ? (
          <Button
            className="w-full gap-2"
            onClick={handleGenerate}
            isLoading={adminTokenMutation.isPending}
            disabled={!lic.isManaged || !lic.adminAccessEnabled}
          >
            <ExternalLink className="w-4 h-4" />
            Generate Access Link
          </Button>
        ) : (
          <div className="space-y-3">
            {isExpired ? (
              <div className="text-center text-sm text-destructive font-medium py-2">
                Token expired. Generate a new one.
              </div>
            ) : (
              <div className="text-center text-sm font-mono text-primary font-bold py-1">
                Expires in {minutes}:{String(seconds).padStart(2, "0")}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                onClick={handleOpenApp}
                disabled={isExpired}
              >
                <ExternalLink className="w-4 h-4" />
                Open App
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleCopyUrl}
                disabled={isExpired}
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied" : "Copy URL"}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full text-xs"
              onClick={handleGenerate}
            >
              Generate new token
            </Button>
          </div>
        )}

        {!lic.isManaged && (
          <p className="text-xs text-muted-foreground text-center">
            Admin access requires the customer to be on Managed Services.
          </p>
        )}
        {lic.isManaged && !lic.adminAccessEnabled && (
          <p className="text-xs text-amber-600 text-center">
            Admin access is currently disabled for this license. Enable it in
            the Detail modal.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ── Main Licenses Page ────────────────────────────────────────────────────────

export function Licenses() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const [accessLicense, setAccessLicense] = useState<any>(null);
  const [detailLicense, setDetailLicense] = useState<any>(null);
  const [deliveryLicense, setDeliveryLicense] = useState<any>(null);

  const { data: apiData, isLoading } = useLicenses(1, 50, search, statusFilter);
  const licenses: any[] = apiData?.licenses ?? [];

  const revokeMutation = useRevokeLicense();
  const unrevokeMutation = useUnrevokeLicense();

  const filtered = licenses.filter((l) => {
    const matchSearch =
      !search ||
      l.customerName?.toLowerCase().includes(search.toLowerCase()) ||
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
        <Button onClick={() => setShowGenerate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Generate License
        </Button>
      </div>

      {/* Summary cards */}
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
        <Card className="border-amber-300/50 bg-amber-50/30 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-amber-800">
                  {expiringSoon.length} license
                  {expiringSoon.length > 1 ? "s" : ""} expiring within 30 days
                </p>
                <div className="mt-2 space-y-1">
                  {expiringSoon.map((l: any) => (
                    <p key={l.id} className="text-xs text-amber-700">
                      <code className="font-mono">{l.domain}</code> — expires{" "}
                      {format(parseISO(l.expiresAt), "MMM d, yyyy")} (
                      {differenceInDays(parseISO(l.expiresAt), new Date())}d)
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
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
                  <th className="px-5 py-3 font-semibold">Delivery</th>
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
                  filtered.map((lic) => {
                    const daysLeft = differenceInDays(
                      parseISO(lic.expiresAt),
                      new Date(),
                    );
                    return (
                      <tr
                        key={lic.id}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        {/* Customer */}
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

                        {/* Domain */}
                        <td className="px-5 py-3.5">
                          <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                            {lic.domain}
                          </code>
                        </td>

                        {/* Plan */}
                        <td className="px-5 py-3.5">{planBadge(lic.plan)}</td>

                        {/* Delivery — NEW COLUMN */}
                        <td className="px-5 py-3.5">
                          {lic.deliveryPlanId ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                {lic.deliveryPlanName ?? lic.deliveryPlanId}
                              </span>
                              <button
                                className="text-xs text-muted-foreground hover:text-foreground underline text-left"
                                onClick={() => setDeliveryLicense(lic)}
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <button
                              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                              onClick={() => setDeliveryLicense(lic)}
                            >
                              <Plus className="w-3 h-3" />
                              Add delivery
                            </button>
                          )}
                        </td>

                        {/* Quota */}
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">
                          <div>{formatNumber(lic.emailsPerMonth)}/mo</div>
                          <div>{formatNumber(lic.subscribersLimit)} subs</div>
                        </td>

                        {/* Expires */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`text-xs font-medium ${daysLeft <= 0 ? "text-destructive" : daysLeft <= 30 ? "text-amber-600" : "text-muted-foreground"}`}
                          >
                            {lic.expiresAt}
                          </span>
                          {daysLeft >= 0 && daysLeft <= 30 && (
                            <div className="text-[10px] text-amber-500">
                              {daysLeft}d left
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {statusBadge(lic.status)}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 h-7 px-2.5 text-xs"
                              onClick={() => setDetailLicense(lic)}
                            >
                              <Wrench className="w-3 h-3" />
                              Detail
                            </Button>

                            {lic.isManaged && lic.adminAccessEnabled && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-50 h-7 px-2.5 text-xs"
                                onClick={() => setAccessLicense(lic)}
                              >
                                <ExternalLink className="w-3 h-3" />
                                Access
                              </Button>
                            )}

                            {lic.status !== "revoked" &&
                              lic.status !== "expired" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 px-2.5 text-xs"
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
                                className="h-7 px-2.5 text-xs"
                                onClick={() => handleUnrevoke(lic.id)}
                                isLoading={unrevokeMutation.isPending}
                              >
                                Unrevoke
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <GenerateLicenseModal
        isOpen={showGenerate}
        onClose={() => setShowGenerate(false)}
      />

      {detailLicense && (
        <LicenseDetailModal
          license={detailLicense}
          onClose={() => setDetailLicense(null)}
        />
      )}

      {accessLicense && (
        <AccessAppModal
          license={accessLicense}
          onClose={() => setAccessLicense(null)}
        />
      )}

      {deliveryLicense && (
        <AssignDeliveryModal
          license={deliveryLicense}
          onClose={() => setDeliveryLicense(null)}
        />
      )}
    </DashboardLayout>
  );
}
