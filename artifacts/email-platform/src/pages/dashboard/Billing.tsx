import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge, Spinner } from "@/components/ui/core";
import { useInvoices, useBillingSummary, useMarkPaid, useCancelInvoice } from "@/hooks/use-billing";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import {
  DollarSign, TrendingUp, Clock, AlertCircle,
  CheckCircle2, XCircle, MoreHorizontal, RefreshCw,
} from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  paid:      "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  pending:   "bg-amber-500/10   text-amber-700   border-amber-200",
  overdue:   "bg-destructive/10 text-destructive  border-destructive/20",
  cancelled: "bg-muted          text-muted-foreground border-border",
  draft:     "bg-muted          text-muted-foreground border-border",
};

const PLAN_COLORS: Record<string, string> = {
  free: "text-slate-500", starter: "text-blue-600", pro: "text-teal-600", enterprise: "text-purple-600",
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
  const [activeMenu, setActiveMenu] = useState<number | null>(null);

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