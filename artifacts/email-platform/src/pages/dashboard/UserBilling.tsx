import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from "@/components/ui/core";
import { useInvoices } from "@/hooks/use-billing";
import { format, parseISO } from "date-fns";

export function UserBilling() {
  const { data, isLoading, error } = useInvoices(1, 20);

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center py-16"><Spinner /></div></DashboardLayout>;
  }

  if (error) {
    return <DashboardLayout><div className="text-destructive p-8">Failed to load invoices</div></DashboardLayout>;
  }

  const invoices = data?.invoices ?? [];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">My Billing</h1>
        <p className="text-muted-foreground mt-1">Track invoice status and due dates.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between gap-3 border border-border/40 rounded-lg p-4">
              <div>
                <p className="font-mono text-xs font-semibold">{inv.invoiceNo}</p>
                <p className="text-xs text-muted-foreground">Due {format(parseISO(inv.dueAt), "MMM d, yyyy")}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${Number(inv.amount).toFixed(2)}</p>
                <Badge variant={inv.status === "paid" ? "success" : "outline"} className="capitalize">{inv.status}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
