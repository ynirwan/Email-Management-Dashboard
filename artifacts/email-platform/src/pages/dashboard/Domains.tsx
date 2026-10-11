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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Globe,
  Plus,
  Trash2,
  DownloadCloud,
  RefreshCw,
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  X,
  Info,
} from "lucide-react";
import { formatDistanceToNow, parseISO, differenceInDays } from "date-fns";
import { Modal } from "@/components/ui/modal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Domain {
  id: number;
  domain: string;
  rootDomain: string;
  isVerified: boolean;
  verificationRecord: {
    type: "TXT";
    host: string;
    value: string;
    expiresAt: string;
  } | null;
  // License data — null when no license has been issued yet ("pending")
  licenseId:   number | null;
  plan:        string | null;
  status: "active" | "expiring" | "revoked" | "expired" | "pending" | "verification";
  isActivated: boolean;
  isManaged:   boolean;
  expiresAt:   string | null;
  createdAt:   string;
  lastPingAt:  string | null;
  pingCount:   number;
}

interface DomainsResponse {
  domains: Domain[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  return differenceInDays(parseISO(dateStr), new Date());
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: Domain["status"] }) {
  const map: Record<string, { icon: any; label: string; cls: string }> = {
    active: {
      icon: CheckCircle2,
      label: "Active",
      cls: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
    },
    expiring: {
      icon: Clock,
      label: "Expiring Soon",
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
    pending: {
      icon: Clock,
      label: "No License",
      cls: "text-muted-foreground bg-muted border-border",
    },
    verification: {
      icon: Clock,
      label: "Verify Domain",
      cls: "text-amber-600 bg-amber-500/10 border-amber-500/20",
    },
    awaiting: {
      icon: Clock,
      label: "Awaiting Activation",
      cls: "text-blue-600 bg-blue-500/10 border-blue-500/20",
    },
  };
  // Fallback for any unexpected/undefined status value
  const entry = map[status] ?? {
    icon: AlertTriangle,
    label: status ?? "Unknown",
    cls: "text-muted-foreground bg-muted border-border",
  };
  const { icon: Icon, label, cls } = entry;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Plan badge ────────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, string> = {
  free: "bg-muted text-muted-foreground border-border",
  starter: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  pro: "bg-violet-500/10 text-violet-600 border-violet-500/20",
  agency: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

// ── Domain Card ───────────────────────────────────────────────────────────────

function DomainCard({
  domain,
  onDelete,
  onDownload,
  onVerify,
  onRefreshChallenge,
  isDownloading,
  isVerifying,
  isRefreshingChallenge,
}: {
  domain: Domain;
  onDelete: (d: Domain) => void;
  onDownload: (licenseId: number) => void;
  onVerify: (id: number) => void;
  onRefreshChallenge: (domain: string) => void;
  isDownloading: boolean;
  isVerifying: boolean;
  isRefreshingChallenge: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedRecord, setCopiedRecord] = useState(false);
  const days = domain.expiresAt ? daysUntil(domain.expiresAt) : null;

  const copyDomain = () => {
    navigator.clipboard.writeText(domain.domain);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card className="border-border/50 hover:border-border transition-colors">
      <CardContent className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-sm font-semibold truncate">
                  {domain.domain}
                </span>
                <button
                  onClick={copyDomain}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy domain"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusChip
                  status={
                    !domain.isVerified
                      ? "verification"
                      : domain.licenseId == null
                      ? "pending"
                      : !domain.isActivated
                        ? ("awaiting" as any)
                        : domain.status
                  }
                />
                <span
                  className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                    PLAN_BADGE[domain.plan ?? "free"] ?? PLAN_BADGE.free
                  }`}
                >
                  {domain.plan ?? (domain.isVerified ? "No plan" : "Pending DNS")}
                </span>
                {domain.isManaged && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" />
                    Managed
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => domain.licenseId != null && domain.isActivated && onDownload(domain.licenseId)}
              disabled={isDownloading || domain.licenseId == null || !domain.isActivated}
              className="gap-1.5 h-8 px-3 text-xs"
              title={
                domain.licenseId == null
                  ? "No license issued yet"
                  : !domain.isActivated
                    ? "Awaiting activation — complete payment and wait for admin confirmation"
                    : "Download license file"
              }
            >
              {isDownloading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <DownloadCloud className="w-3.5 h-3.5" />
              )}
              {domain.licenseId == null
                ? "No License"
                : !domain.isActivated
                  ? "Awaiting"
                  : "Download"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(domain)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              title="Delete domain"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {!domain.isVerified && (
          <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-semibold">Prove you control this domain</p>
                <p className="text-xs text-muted-foreground">
                  Add this TXT record in your DNS provider. A license is issued only after ownership is verified.
                </p>
                {domain.verificationRecord ? (
                  <div className="space-y-1.5 text-xs">
                    <p>
                      <span className="text-muted-foreground">Host: </span>
                      <code className="break-all">{domain.verificationRecord.host}</code>
                    </p>
                    <p>
                      <span className="text-muted-foreground">Value: </span>
                      <code className="break-all">{domain.verificationRecord.value}</code>
                    </p>
                    <p className="text-muted-foreground">
                      Code expires {formatDistanceToNow(parseISO(domain.verificationRecord.expiresAt), { addSuffix: true })}.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Generate a fresh DNS verification code to continue.</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {domain.verificationRecord && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${domain.verificationRecord!.host} TXT ${domain.verificationRecord!.value}`,
                      );
                      setCopiedRecord(true);
                      setTimeout(() => setCopiedRecord(false), 1500);
                    }}
                  >
                    {copiedRecord ? <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> : <Copy className="mr-1.5 h-3.5 w-3.5" />}
                    {copiedRecord ? "Copied" : "Copy record"}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={isRefreshingChallenge}
                  onClick={() => onRefreshChallenge(domain.domain)}
                >
                  Refresh code
                </Button>
                <Button
                  size="sm"
                  isLoading={isVerifying}
                  onClick={() => onVerify(domain.id)}
                  disabled={!domain.verificationRecord || isVerifying}
                >
                  Verify DNS
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-4">
          <div>
            <p className="text-xs text-muted-foreground">License expires</p>
            <p
              className={`text-sm font-semibold ${
                days == null
                  ? "text-muted-foreground"
                  : days <= 0
                    ? "text-destructive"
                    : days <= 30
                      ? "text-amber-600"
                      : "text-foreground"
              }`}
            >
              {days == null
                ? "—"
                : days <= 0
                  ? "Expired"
                  : days <= 30
                    ? `${days}d left`
                    : formatDistanceToNow(parseISO(domain.expiresAt!), {
                        addSuffix: true,
                      })}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last ping</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {domain.lastPingAt
                ? formatDistanceToNow(parseISO(domain.lastPingAt), {
                    addSuffix: true,
                  })
                : "Never"}
              {domain.pingCount > 0 && (
                <span className="text-[11px] text-muted-foreground font-normal ml-1.5">
                  ({domain.pingCount} total)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Awaiting activation notice */}
        {domain.licenseId != null && !domain.isActivated && (
          <div className="mt-3 flex items-center gap-2 text-xs text-blue-700 bg-blue-500/5 border border-blue-400/30 px-3 py-2 rounded-lg">
            <Info className="w-3.5 h-3.5 shrink-0" />
            License pending activation. Once payment is confirmed, an admin will activate it and you'll be able to download.
          </div>
        )}

        {/* Expiry warning */}
        {days != null && days >= 0 && days <= 30 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-500/5 border border-amber-400/30 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            License expires in {days} day{days !== 1 ? "s" : ""}. Download a
            renewed license from your admin if you've renewed.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Add Domain Modal ──────────────────────────────────────────────────────────

function AddDomainModal({
  isOpen,
  onClose,
  onAdd,
  isAdding,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (domain: string) => void;
  isAdding: boolean;
}) {
  const [value, setValue] = useState("");
  const clean = value
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase()
    .trim();
  const isValid = /^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/.test(
    clean,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onAdd(clean);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Domain"
      description="Add your domain, verify ownership through DNS, then receive its license."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Info box */}
        <div className="flex gap-2 text-xs bg-muted/60 border border-border rounded-xl p-3 text-muted-foreground">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Enter just the domain without <code>https://</code>, e.g.{" "}
            <code>mail.yourcompany.com</code> or <code>app.yourserver.io</code>.
            After adding, publish the verification TXT record. ZeniPost issues a
            license after it confirms that you control the domain.
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">
            Domain
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="mail.yourcompany.com"
              className="pl-9 font-mono"
              autoFocus
            />
          </div>
          {value && clean && !isValid && (
            <p className="text-xs text-destructive">
              Please enter a valid domain (e.g. app.yourdomain.com)
            </p>
          )}
          {value && clean && isValid && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Valid domain: {clean}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isAdding}
            isLoading={isAdding}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({
  domain,
  onClose,
  onConfirm,
  isDeleting,
}: {
  domain: Domain | null;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <Modal
      isOpen={!!domain}
      onClose={onClose}
      title="Delete Domain"
      description={`Are you sure you want to delete ${domain?.domain}?${domain?.licenseId != null ? " This will remove its associated license." : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-xs mb-4">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        This action cannot be undone.{domain?.licenseId != null ? " The associated installation license will stop working." : ""}
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          isLoading={isDeleting}
        >
          Delete Domain
        </Button>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Domains() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<Domain | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = useQuery<DomainsResponse>({
    queryKey: ["/api/domains"],
    queryFn: () => fetchApi("/api/domains"),
  });

  const domains = data?.domains ?? [];

  // Add domain
  const addMutation = useMutation({
    mutationFn: (domain: string) =>
      fetchApi("/api/domains", {
        method: "POST",
        body: JSON.stringify({ domain }),
      }),
    onSuccess: () => {
      toast({
        title: "Domain added",
        description:
          "Your domain has been registered. Add the DNS TXT record to prove ownership.",
      });
      qc.invalidateQueries({ queryKey: ["/api/domains"] });
      qc.invalidateQueries({ queryKey: ["/api/portal"] });
      setShowAdd(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message ?? "Failed to add domain",
        variant: "destructive",
      });
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/domains/${id}/verify-ownership`, { method: "POST" }),
    onSuccess: () => {
      toast({
        title: "Domain verified",
        description: "Ownership confirmed. The license is now linked to your domain.",
      });
      qc.invalidateQueries({ queryKey: ["/api/domains"] });
      qc.invalidateQueries({ queryKey: ["/api/portal"] });
    },
    onError: (err: any) => {
      toast({
        title: "DNS verification not complete",
        description: err.message ?? "Check the TXT record and try again.",
        variant: "destructive",
      });
    },
  });

  const refreshChallengeMutation = useMutation({
    mutationFn: (domain: string) =>
      fetchApi("/api/domains", {
        method: "POST",
        body: JSON.stringify({ domain }),
      }),
    onSuccess: () => {
      toast({
        title: "Verification code refreshed",
        description: "Update the TXT record with the new value.",
      });
      qc.invalidateQueries({ queryKey: ["/api/domains"] });
    },
    onError: (err: any) => {
      toast({
        title: "Could not refresh code",
        description: err.message ?? "Try again.",
        variant: "destructive",
      });
    },
  });

  // Delete domain
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetchApi(`/api/domains/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Domain deleted" });
      qc.invalidateQueries({ queryKey: ["/api/domains"] });
      qc.invalidateQueries({ queryKey: ["/api/portal"] });
      setDeletingDomain(null);
    },
    onError: (err: any) => {
      toast({
        title: "Error",
        description: err.message ?? "Failed to delete domain",
        variant: "destructive",
      });
    },
  });

  // Download license — receives the licenseId from licensesTable (NOT the domain.id)
  const handleDownload = async (licenseId: number) => {
    setDownloadingId(licenseId);
    try {
      const result = await fetchApi(`/api/portal/license/${licenseId}/download`);
      const blob = new Blob([JSON.stringify(result, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const domainObj = domains.find((d) => d.licenseId === licenseId);
      a.href = url;
      a.download = `zenipost-license-${domainObj?.domain ?? licenseId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "License downloaded",
        description: "Place this file in your ZeniPost installation directory.",
      });
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err.message ?? "Try again",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Domains</h1>
          <p className="text-muted-foreground mt-1">
            Verify that you control each domain before a license can be issued for its ZeniPost installation.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 h-9"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAdd(true)}
            className="gap-2 h-9"
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </Button>
        </div>
      </div>

      {/* How it works strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          {
            step: "1",
            title: "Add your domain",
            desc: "Register the server domain where you'll run ZeniPost",
          },
          {
            step: "2",
            title: "Verify ownership",
            desc: "Add a TXT record so we can confirm you control the domain",
          },
          {
            step: "3",
            title: "Get your license",
            desc: "After verification, download the signed license for your installation",
          },
        ].map(({ step, title, desc }) => (
          <div
            key={step}
            className="flex items-start gap-3 p-4 rounded-xl border border-border/50 bg-muted/30"
          >
            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
              {step}
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner className="w-10 h-10" />
        </div>
      ) : error ? (
        <div className="text-destructive text-center py-20">
          Failed to load domains. Please refresh.
        </div>
      ) : domains.length === 0 ? (
        <Card className="border-dashed border-2 border-border/50">
          <CardContent className="py-20 text-center">
            <Globe className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="font-semibold text-base mb-1">No domains yet</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
              Add your installation domain and verify it with a DNS TXT record to receive a license.
            </p>
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Your First Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Plan limits note for non-managed */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/50 rounded-xl px-4 py-3">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Features are gated by your license plan. Renew annually to keep
              your license active. The app pings this dashboard once a day to
              confirm license validity — "Last ping" shows when it last checked in.
            </span>
          </div>

          {domains.map((d) => (
            <DomainCard
              key={d.id}
              domain={d}
              onDelete={setDeletingDomain}
              onDownload={handleDownload}
              onVerify={(id) => verifyMutation.mutate(id)}
              onRefreshChallenge={(domain) => refreshChallengeMutation.mutate(domain)}
              isDownloading={downloadingId === d.licenseId}
              isVerifying={verifyMutation.isPending && verifyMutation.variables === d.id}
              isRefreshingChallenge={refreshChallengeMutation.isPending && refreshChallengeMutation.variables === d.domain}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddDomainModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onAdd={(domain) => addMutation.mutate(domain)}
        isAdding={addMutation.isPending}
      />

      <DeleteConfirmModal
        domain={deletingDomain}
        onClose={() => setDeletingDomain(null)}
        onConfirm={() =>
          deletingDomain && deleteMutation.mutate(deletingDomain.id)
        }
        isDeleting={deleteMutation.isPending}
      />
    </DashboardLayout>
  );
}
