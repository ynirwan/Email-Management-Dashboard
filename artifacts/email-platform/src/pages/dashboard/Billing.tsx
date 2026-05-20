import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Spinner } from "@/components/ui/core";
import { useInvoices, useBillingSummary, useMarkPaid, useCancelInvoice } from "@/hooks/use-billing";
import { useAdminPaymentRequests, useApprovePaymentRequest, useRejectPaymentRequest } from "@/hooks/use-payments";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  DollarSign, TrendingUp, Clock, AlertCircle,
  CheckCircle2, XCircle, MoreHorizontal,
  CreditCard, Image as ImageIcon, ChevronDown, ChevronUp,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  paid:      "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  pending:   "bg-amber-500/10   text-amber-700   border-amber-200",
  overdue:   "bg-destructive/10 text-destructive  border-destructive/20",
  cancelled: "bg-muted          text-muted-foreground border-border",
  draft:     "bg-muted          text-muted-foreground border-border",
};

const PLAN_COLORS: Record<string, string> = {
  starter: "text-blue-600", pro: "text-teal-600", agency: "text-purple-600",
};

function fmt(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function Billing() {
  const [page, setPage] = useState(1);
  const { data, isLoading }    = useInvoices(page, 20);
  const { data: summary }      = useBillingSummary();
  const markPaid               = useMarkPaid();
  const cancelInvoice          = useCancelInvoice();
  const { toast }              = useToast();
  const [activeMenu, setActiveMenu]       = useState<number | null>(null);
  // Payment requests
  const { data: prData, isLoading: prLoading, error: prError } = useAdminPaymentRequests(1, 50, "pending");
  const approveMutation  = useApprovePaymentRequest();
  const rejectMutation   = useRejectPaymentRequest();
  const [rejectingId, setRejectingId]     = useState<number | null>(null);
  const [rejectNote, setRejectNote]       = useState("");
  const [expandedProof, setExpandedProof] = useState<number | null>(null);

  const pendingRequests = prData?.paymentRequests ?? [];

  const handleApprove = (id: number) => {
    approveMutation.mutate(id, {
      onSuccess: (d) => toast({ title: "Payment approved", description: `Invoice ${d.invoiceNo} generated.` }),
      onError:   (e) => toast({ title: "Error", description: (e as any).message, variant: "destructive" }),
    });
  };

  const handleReject = (id: number) => {
    if (!rejectNote.trim()) { toast({ title: "Please enter a rejection reason", variant: "destructive" }); return; }
    rejectMutation.mutate({ id, adminNote: rejectNote.trim() }, {
      onSuccess: () => { toast({ title: "Request rejected" }); setRejectingId(null); setRejectNote(""); },
      onError:   (e) => toast({ title: "Error", description: (e as any).message, variant: "destructive" }),
    });
  };

  const handleMarkPaid = (id: number) => {
    markPaid.mutate(id, {
      onSuccess: () => toast({ title: "Marked as paid" }),
      onError:   (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
    setActiveMenu(null);
  };

  const handleCancel = (id: number) => {
    cancelInvoice.mutate(id, {
      onSuccess: () => toast({ title: "Invoice cancelled" }),
      onError:   (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
    setActiveMenu(null);
  };

  const invoices = data?.invoices ?? [];
  const total    = data?.total ?? 0;
  const pages    = Math.ceil(total / 20);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Billing & Invoices</h1>
        <p className="text-muted-foreground mt-1">Revenue overview and invoice management</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "MRR",
            value: fmt(summary?.mrr ?? 0),
            sub:   "Monthly recurring",
            icon:  TrendingUp,
            color: "text-primary",
            bg:    "bg-primary/8",
          },
          {
            label: "Paid",
            value: fmt(summary?.paid.total ?? 0),
            sub:   `${summary?.paid.count ?? 0} invoices`,
            icon:  CheckCircle2,
            color: "text-emerald-600",
            bg:    "bg-emerald-500/8",
          },
          {
            label: "Pending",
            value: fmt(summary?.pending.total ?? 0),
            sub:   `${summary?.pending.count ?? 0} invoices`,
            icon:  Clock,
            color: "text-amber-600",
            bg:    "bg-amber-500/8",
          },
          {
            label: "Overdue",
            value: fmt(summary?.overdue.total ?? 0),
            sub:   `${summary?.overdue.count ?? 0} invoices`,
            icon:  AlertCircle,
            color: "text-destructive",
            bg:    "bg-destructive/8",
          },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className="border-border/50">
            <CardContent className="p-5">
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-extrabold font-display">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan breakdown */}
      {summary?.planBreakdown && summary.planBreakdown.length > 0 && (
        <Card className="border-border/50 mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Revenue by Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {summary.planBreakdown.map((row) => (
                <div key={row.plan} className="text-center p-3 bg-muted/30 rounded-xl">
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${PLAN_COLORS[row.plan]}`}>{row.plan}</p>
                  <p className="text-xl font-extrabold">{row.count}</p>
                  <p className="text-xs text-muted-foreground">customers</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{fmt(row.revenue)}/mo</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Payment Requests panel */}
      <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10 mb-8">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-600" />
            Pending Payment Requests
            {pendingRequests.length > 0 && (
              <Badge variant="outline" className="ml-1 border-amber-400 text-amber-700 bg-amber-100">
                {pendingRequests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : prError ? (
            <div className="flex items-center gap-2 text-destructive text-sm py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Failed to load payment requests. Make sure the DB migration was applied (<code>cd lib/db && npm run push</code>).</span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No pending payment requests. All caught up!</p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((pr) => (
                <div key={pr.id} className="rounded-lg border border-amber-200 bg-card overflow-hidden">
                  <div className="flex items-start gap-4 p-4">
                    {/* Customer info */}
                    <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
                        <p className="text-sm font-medium">{pr.userCompany ?? pr.userName ?? `User #${pr.userId}`}</p>
                        <p className="text-xs text-muted-foreground">{pr.userEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request</p>
                        <p className="text-sm capitalize">{pr.type.replace("_", " ")} payment</p>
                        {pr.deliveryPlanId && (
                          <p className="text-xs text-muted-foreground">{pr.deliveryPlanId.replace(/_/g, " ")}</p>
                        )}
                        {pr.licenseId && (
                          <p className="text-xs text-muted-foreground">License #{pr.licenseId}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</p>
                        <p className="text-sm font-bold">${pr.amount.toFixed(2)} {pr.currency}</p>
                        <p className="text-xs text-muted-foreground">{pr.paymentMethod.replace("_", " ")}{pr.transactionRef ? ` · ${pr.transactionRef}` : ""}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="shrink-0 flex flex-col gap-2 items-end">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(pr.id)}
                        disabled={approveMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      {rejectingId === pr.id ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="destructive" onClick={() => handleReject(pr.id)} disabled={rejectMutation.isPending}>
                            Confirm Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectingId(null); setRejectNote(""); }}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setRejectingId(pr.id)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                        </Button>
                      )}
                      {pr.proofImageUrl && (
                        <button
                          onClick={() => setExpandedProof(expandedProof === pr.id ? null : pr.id)}
                          className="text-xs text-primary flex items-center gap-1 mt-1"
                        >
                          <ImageIcon className="h-3 w-3" />
                          Proof
                          {expandedProof === pr.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reject note input */}
                  {rejectingId === pr.id && (
                    <div className="px-4 pb-4 border-t border-border/40 pt-3">
                      <input
                        type="text"
                        value={rejectNote}
                        onChange={(e) => setRejectNote(e.target.value)}
                        placeholder="Reason for rejection (required)…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Notes row */}
                  {pr.notes && (
                    <div className="px-4 pb-3 border-t border-border/30 pt-2">
                      <p className="text-xs text-muted-foreground"><span className="font-medium">Note:</span> {pr.notes}</p>
                    </div>
                  )}

                  {/* Proof image */}
                  {expandedProof === pr.id && pr.proofImageUrl && (
                    <div className="border-t border-border/40 p-4 bg-muted/20">
                      <img
                        src={pr.proofImageUrl}
                        alt="Payment proof"
                        className="max-h-80 rounded-md object-contain mx-auto"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices table */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : invoices.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No invoices yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    {["Invoice", "Customer", "Plan", "Amount", "Status", "Due", "Actions"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-mono text-xs font-semibold text-foreground">{inv.invoiceNo}</p>
                        <p className="text-[10px] text-muted-foreground">{format(parseISO(inv.createdAt), "MMM d, yyyy")}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {inv.customer ? (
                          <>
                            <p className="font-medium text-xs">{inv.customer.name}</p>
                            <p className="text-[10px] text-muted-foreground">{inv.customer.email}</p>
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold capitalize ${PLAN_COLORS[inv.plan]}`}>{inv.plan}</span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold">{fmt(inv.amount)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[inv.status]}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(inv.dueAt), "MMM d, yyyy")}
                        {inv.paidAt && (
                          <p className="text-emerald-600 font-medium">Paid {format(parseISO(inv.paidAt), "MMM d")}</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {(inv.status === "pending" || inv.status === "overdue") && (
                          <div className="relative">
                            <button
                              onClick={() => setActiveMenu(activeMenu === inv.id ? null : inv.id)}
                              className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                            {activeMenu === inv.id && (
                              <div className="absolute right-0 top-8 z-10 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px]">
                                <button
                                  onClick={() => handleMarkPaid(inv.id)}
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/10 flex items-center gap-2"
                                >
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Mark Paid
                                </button>
                                <button
                                  onClick={() => handleCancel(inv.id)}
                                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent/10 flex items-center gap-2 text-destructive"
                                >
                                  <XCircle className="w-4 h-4" /> Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground">{total} invoices total</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>← Prev</Button>
                <span className="text-xs flex items-center px-3 text-muted-foreground">{page} / {pages}</span>
                <Button size="sm" variant="outline" onClick={() => setPage((p) => p + 1)} disabled={page === pages}>Next →</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
