import { useState, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner, Button } from "@/components/ui/core";
import { useInvoices } from "@/hooks/use-billing";
import { useMyPaymentRequests, useSubmitPaymentRequest, type PaymentRequestType } from "@/hooks/use-payments";
import { useLicenses, DELIVERY_PLAN_OPTIONS } from "@/hooks/use-licenses";
import { format, parseISO } from "date-fns";
import {
  Upload, CheckCircle2, XCircle, Clock, FileDown, Plus, X,
  CreditCard, Banknote, Bitcoin, ChevronDown, ChevronUp, Image as ImageIcon,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function statusVariant(s: string) {
  if (s === "paid" || s === "approved") return "success";
  if (s === "rejected" || s === "cancelled" || s === "overdue") return "destructive";
  return "outline";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "approved" || status === "paid")   return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "rejected" || status === "cancelled") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  return <Clock className="h-3.5 w-3.5 text-amber-500" />;
}

function fmtDate(d: string) {
  try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
}

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer",   icon: Banknote },
  { value: "crypto",        label: "Cryptocurrency",  icon: Bitcoin },
  { value: "paypal",        label: "PayPal",           icon: CreditCard },
  { value: "other",         label: "Other",            icon: CreditCard },
];

const REQUEST_TYPES: { value: PaymentRequestType; label: string; description: string }[] = [
  { value: "license",  label: "License Payment",       description: "Payment for a new or existing license" },
  { value: "delivery", label: "Delivery Plan Payment", description: "Add a managed delivery plan to your license" },
  { value: "renewal",  label: "License Renewal",       description: "Renew an expiring or expired license" },
];

// ── Submit Payment Form ────────────────────────────────────────────────────────

function SubmitPaymentForm({ onSuccess }: { onSuccess: () => void }) {
  const { data: licensesData } = useLicenses(1, 100);
  const licenses = licensesData?.licenses ?? [];

  const [type, setType]               = useState<PaymentRequestType>("license");
  const [licenseId, setLicenseId]     = useState<string>("");
  const [deliveryPlanId, setDeliveryPlanId] = useState<string>("");
  const [amount, setAmount]           = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes]             = useState("");
  const [proofImageUrl, setProofImageUrl] = useState<string>("");
  const [proofName, setProofName]     = useState("");
  const [error, setError]             = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useSubmitPaymentRequest();

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Image must be under 5 MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofImageUrl(ev.target?.result as string);
      setProofName(file.name);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount."); return;
    }
    if (!paymentMethod) { setError("Please select a payment method."); return; }
    if (!transactionRef.trim() && !proofImageUrl) {
      setError("Please provide a transaction reference ID or upload a payment screenshot — at least one is required."); return;
    }

    mutation.mutate(
      {
        type,
        licenseId:      licenseId ? parseInt(licenseId) : null,
        deliveryPlanId: type === "delivery" ? deliveryPlanId || null : null,
        amount:         parseFloat(amount),
        paymentMethod,
        transactionRef: transactionRef || undefined,
        proofImageUrl:  proofImageUrl  || undefined,
        notes:          notes          || undefined,
      },
      {
        onSuccess: () => {
          setAmount(""); setTransactionRef(""); setNotes("");
          setProofImageUrl(""); setProofName(""); setLicenseId("");
          setDeliveryPlanId("");
          onSuccess();
        },
        onError: (err: any) => setError(err?.message ?? "Submission failed"),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector */}
      <div>
        <label className="block text-sm font-medium mb-2">Payment type</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {REQUEST_TYPES.map((rt) => (
            <button
              key={rt.value}
              type="button"
              onClick={() => setType(rt.value)}
              className={`text-left rounded-lg border p-3 transition-colors ${
                type === rt.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <p className="text-sm font-medium">{rt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{rt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* License selector (always shown for context) */}
      {licenses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Related license <span className="text-muted-foreground font-normal">(optional)</span></label>
            <select
              value={licenseId}
              onChange={(e) => setLicenseId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Select license —</option>
              {licenses.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.domain} ({l.plan})
                </option>
              ))}
            </select>
          </div>

          {type === "delivery" && (
            <div>
              <label className="block text-sm font-medium mb-1">Delivery plan</label>
              <select
                value={deliveryPlanId}
                onChange={(e) => setDeliveryPlanId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— Select delivery plan —</option>
                {DELIVERY_PLAN_OPTIONS.map((dp) => (
                  <option key={dp.id} value={dp.id}>
                    {dp.name} — {dp.price} / {dp.volume}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Amount + currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Amount paid <span className="text-destructive">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-md border border-input bg-background pl-7 pr-3 py-2 text-sm"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Payment method <span className="text-destructive">*</span></label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction reference */}
      <div>
        <label className="block text-sm font-medium mb-1">Transaction reference / ID <span className="text-muted-foreground font-normal">(optional)</span></label>
        <input
          type="text"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
          placeholder="e.g. TXN123456, hash, PayPal ID…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {/* Payment proof upload */}
      <div>
        <label className="block text-sm font-medium mb-1">Payment proof screenshot <span className="text-muted-foreground font-normal">(optional, max 5 MB)</span></label>
        <div
          onClick={() => fileRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors p-6"
        >
          {proofImageUrl ? (
            <div className="flex items-center gap-2 text-sm">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">{proofName}</span>
              <button
                type="button"
                onClick={(ev) => { ev.stopPropagation(); setProofImageUrl(""); setProofName(""); }}
                className="ml-1 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Click to upload image</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1">Additional notes <span className="text-muted-foreground font-normal">(optional)</span></label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any context or details about this payment…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={mutation.isPending} className="w-full">
        {mutation.isPending ? <><Spinner className="mr-2 h-4 w-4" /> Submitting…</> : "Submit Payment Request"}
      </Button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function UserBilling() {
  const [showForm, setShowForm]     = useState(false);
  const [requestsPage]              = useState(1);
  const [invoicesPage]              = useState(1);
  const [expandedProof, setExpandedProof] = useState<number | null>(null);

  const { data: invoiceData, isLoading: invLoading } = useInvoices(invoicesPage, 20);
  const { data: requestData, isLoading: reqLoading } = useMyPaymentRequests(requestsPage, 20);

  const invoices = invoiceData?.invoices ?? [];
  const requests = requestData?.paymentRequests ?? [];
  const pending  = requests.filter((r) => r.status === "pending").length;

  const handleDownloadInvoice = (inv: any) => {
    const data = {
      invoiceNo:    inv.invoiceNo,
      plan:         inv.plan,
      amount:       `$${Number(inv.amount).toFixed(2)} ${inv.currency ?? "USD"}`,
      status:       inv.status,
      description:  inv.description,
      dueAt:        inv.dueAt   ? fmtDate(inv.dueAt)   : "",
      paidAt:       inv.paidAt  ? fmtDate(inv.paidAt)  : "",
      issuedAt:     inv.createdAt ? fmtDate(inv.createdAt) : "",
    };
    const text = [
      `INVOICE: ${data.invoiceNo}`,
      `Status:  ${data.status.toUpperCase()}`,
      `Plan:    ${data.plan}`,
      `Amount:  ${data.amount}`,
      `Due:     ${data.dueAt}`,
      data.paidAt ? `Paid:    ${data.paidAt}` : null,
      data.description ? `\n${data.description}` : null,
    ].filter(Boolean).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${inv.invoiceNo}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Billing</h1>
          <p className="text-muted-foreground mt-1">Submit payment proofs and track your invoices.</p>
        </div>
        <Button onClick={() => setShowForm((p) => !p)} variant={showForm ? "outline" : "default"}>
          {showForm ? <><X className="mr-2 h-4 w-4" /> Cancel</> : <><Plus className="mr-2 h-4 w-4" /> Submit Payment</>}
        </Button>
      </div>

      {/* Submit payment form */}
      {showForm && (
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardHeader><CardTitle>Submit Payment Proof</CardTitle></CardHeader>
          <CardContent>
            <SubmitPaymentForm onSuccess={() => setShowForm(false)} />
          </CardContent>
        </Card>
      )}

      {/* Payment requests history */}
      <Card className="border-border/50 mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment Requests</CardTitle>
          {pending > 0 && (
            <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950">
              {pending} pending review
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {reqLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No payment requests yet. Click "Submit Payment" above to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="rounded-lg border border-border/50 overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <StatusIcon status={r.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium capitalize">{r.type.replace("_", " ")} payment</span>
                        <Badge variant={statusVariant(r.status)} className="capitalize text-xs">{r.status}</Badge>
                        {r.deliveryPlanId && (
                          <span className="text-xs text-muted-foreground">· {r.deliveryPlanId.replace(/_/g, " ")}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          ${r.amount.toFixed(2)} · {r.paymentMethod.replace("_", " ")}
                          {r.transactionRef && ` · Ref: ${r.transactionRef}`}
                        </span>
                        <span className="text-xs text-muted-foreground">{fmtDate(r.createdAt)}</span>
                      </div>
                      {r.status === "rejected" && r.adminNote && (
                        <p className="text-xs text-destructive mt-1">Reason: {r.adminNote}</p>
                      )}
                      {r.status === "approved" && r.invoiceId && (
                        <p className="text-xs text-emerald-600 mt-1">Invoice generated — see below ↓</p>
                      )}
                    </div>
                    {r.proofImageUrl && (
                      <button
                        onClick={() => setExpandedProof(expandedProof === r.id ? null : r.id)}
                        className="shrink-0 text-xs text-primary flex items-center gap-1"
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        Proof
                        {expandedProof === r.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                  {/* Expandable proof image */}
                  {expandedProof === r.id && r.proofImageUrl && (
                    <div className="border-t border-border/40 p-4 bg-muted/30">
                      <img
                        src={r.proofImageUrl}
                        alt="Payment proof"
                        className="max-h-64 rounded-md object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card className="border-border/50">
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          {invLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileDown className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No invoices yet. Invoices are generated automatically when a payment is approved.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <StatusIcon status={inv.status} />
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold">{inv.invoiceNo}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {inv.plan}
                        {inv.paidAt ? ` · Paid ${fmtDate(inv.paidAt)}` : ` · Due ${fmtDate(inv.dueAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-semibold text-sm">${Number(inv.amount).toFixed(2)}</p>
                      <Badge variant={statusVariant(inv.status)} className="capitalize text-xs">{inv.status}</Badge>
                    </div>
                    {(inv.status === "paid") && (
                      <button
                        onClick={() => handleDownloadInvoice(inv)}
                        title="Download invoice"
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        <FileDown className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
