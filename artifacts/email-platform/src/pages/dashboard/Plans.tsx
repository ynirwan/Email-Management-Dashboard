import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePlans } from "@/hooks/use-plans";
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Label, Modal, Spinner } from "@/components/ui/core";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { CheckCircle2, Check, Minus, Edit2 } from "lucide-react";

// Feature matrix — verified against actual email app code:
//   App.jsx (which routes use FeatureGate)
//   FeatureGate.jsx (which keys are gated)
//   license.py _PLAN_DEFAULTS + _V2_FLAG_MAP
//
// ALL plans  → campaigns, email builder, subscribers, analytics, suppression,
//              webhooks, segmentation (default=True all plans),
//              audit_trail (default=True all plans)
// Domains    → Starter: license domain only (max_domains=0)
//              Pro: up to 5 custom domains + 1 tracking subdomain each (max_domains=5)
//              Agency: unlimited domains (max_domains=-1)
// Pro+       → automation, ab_testing, api_access, deliverability_dashboard
//
// Row shape: boolean true/false → Check / Minus icon
//            string             → renders as plain text (used for tiered limits)
const FEATURE_MATRIX: {
  label: string;
  starter: boolean | string;
  pro: boolean | string;
  agency: boolean | string;
  note: string;
}[] = [
  // ── All plans ─────────────────────────────────────────────────────────────
  { label: "Campaign Management",         starter: true,             pro: true,           agency: true,        note: "" },
  { label: "Email Builder (all editors)", starter: true,             pro: true,           agency: true,        note: "" },
  { label: "Subscriber Management",       starter: true,             pro: true,           agency: true,        note: "" },
  { label: "Basic Analytics",             starter: true,             pro: true,           agency: true,        note: "" },
  { label: "Suppression Management",      starter: true,             pro: true,           agency: true,        note: "" },
  { label: "Webhooks",                    starter: true,             pro: true,           agency: true,        note: "" },
  { label: "Audience Segmentation",       starter: true,             pro: true,           agency: true,        note: "Segment by any field or tag" },
  { label: "Audit Trail",                 starter: true,             pro: true,           agency: true,        note: "Full activity history" },
  // ── Domains ───────────────────────────────────────────────────────────────
  { label: "Sending Domains",             starter: "License domain", pro: "Up to 5",      agency: "Unlimited", note: "" },
  { label: "Tracking Domain per Sender",  starter: false,            pro: "1 per domain", agency: "1 per domain", note: "Click / open / unsubscribe" },
  // ── Pro & Agency ──────────────────────────────────────────────────────────
  { label: "Automation Workflows",        starter: false,            pro: true,           agency: true,        note: "" },
  { label: "A/B Testing",                 starter: false,            pro: true,           agency: true,        note: "" },
  { label: "API Access",                  starter: false,            pro: true,           agency: true,        note: "" },
  { label: "Deliverability Dashboard",    starter: false,            pro: true,           agency: true,        note: "Inbox placement & reputation" },
];

export function Plans() {
  const { data, isLoading } = usePlans();
  const [editingPlan, setEditingPlan] = useState<any>(null);

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Plans & Pricing</h1>
          <p className="text-muted-foreground mt-1">One-time software license pricing and included capabilities.</p>
        </div>
        <Button onClick={() => data?.plans?.[0] && setEditingPlan(data.plans[0])}>
          <Edit2 className="w-4 h-4" />Edit Plans
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="w-12 h-12" /></div>
      ) : (
        <>
          {/* Plan cards */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
            {data?.plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 ${
                  plan.isPopular ? "border-primary shadow-lg shadow-primary/10" : "border-border/50"
                }`}
              >
                {plan.isPopular && (
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
                )}
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{plan.name}</h3>
                    {plan.isPopular && <Badge variant="default" className="text-[10px]">Popular</Badge>}
                  </div>

                  <div className="mb-5 pb-5 border-b border-border/50">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold font-display">
                        {formatCurrency(plan.price).replace(".00", "")}
                      </span>
                      <span className="text-muted-foreground font-medium text-sm">one-time</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm mb-5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Installations</span>
                      <span className="font-semibold">
                        {plan.installations >= 9000000 ? "Unlimited" : formatNumber(plan.installations)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shared Workspace</span>
                      <span className="font-semibold">
                        {plan.sharedWorkspace ? "Yes" : "No"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Support + Updates</span>
                      <span className="font-semibold">{formatCurrency(plan.supportAndUpdatesYearly)}/year</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Features</p>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 pt-5 border-t border-border/50 flex items-center justify-between">
                    <div>
                      <p className="font-display font-bold text-xl">—</p>
                      <p className="text-xs text-muted-foreground">customers</p>
                    </div>
                    <Button
                      size="sm"
                      variant={plan.isPopular ? "default" : "outline"}
                      onClick={() => setEditingPlan(plan)}
                    >
                      <Edit2 className="w-3 h-3" />Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Feature Matrix */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Feature Comparison</CardTitle>
              <p className="text-sm text-muted-foreground">Exactly what's included in each plan — no surprises</p>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border/50 bg-muted/30">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider w-1/2">Feature</th>
                    {[
                      { label: "Starter", sub: "$49" },
                      { label: "Pro",     sub: "$149" },
                      { label: "Agency",  sub: "$299" },
                    ].map((p) => (
                      <th key={p.label} className="px-4 py-3 text-center">
                        <span className="block text-xs font-bold uppercase tracking-wider text-foreground">{p.label}</span>
                        <span className="block text-xs text-muted-foreground font-normal">{p.sub} one-time</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {FEATURE_MATRIX.map((row, i) => {
                    const isDomainsStart = i === 8;  // Sending Domains
                    const isProStart     = i === 10; // Automation Workflows
                    return (
                      <>
                        {isDomainsStart && (
                          <tr key="domains-divider">
                            <td colSpan={4} className="px-6 py-2 bg-muted/40 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                              Domains
                            </td>
                          </tr>
                        )}
                        {isProStart && (
                          <tr key="pro-divider">
                            <td colSpan={4} className="px-6 py-2 bg-primary/5 text-[10px] font-bold text-primary uppercase tracking-widest">
                              Pro &amp; Agency
                            </td>
                          </tr>
                        )}
                        <tr key={row.label} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-3">
                            <span className="font-medium">{row.label}</span>
                            {row.note && <span className="ml-2 text-xs text-muted-foreground">— {row.note}</span>}
                          </td>
                          {(["starter", "pro", "agency"] as const).map((plan) => {
                            const val = row[plan];
                            return (
                              <td key={plan} className="px-4 py-3 text-center">
                                {typeof val === "string" ? (
                                  <span className="text-xs font-semibold text-foreground">{val}</span>
                                ) : val ? (
                                  <Check className="w-4 h-4 text-primary mx-auto" />
                                ) : (
                                  <Minus className="w-4 h-4 text-border mx-auto" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Delivery Add-ons */}
          <div className="mt-10">
            <h2 className="text-2xl font-display font-bold mb-2">Delivery & Infrastructure Add-ons</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Use your own SMTP or upgrade to managed delivery anytime.
            </p>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
              {data?.deliveryPlans?.map((plan) => (
                <Card key={plan.id} className="border-border/50">
                  <CardContent className="p-6">
                    <h3 className="font-bold mb-1">{plan.name}</h3>
                    <p className="text-2xl font-extrabold mb-3">{formatCurrency(plan.priceMonthly)}/mo</p>
                    <p className="text-sm mb-1">
                      {plan.emailsPerMonth > 0 ? `${formatNumber(plan.emailsPerMonth)} emails/month` : "Custom volume"}
                    </p>
                    <p className="text-xs text-muted-foreground">{plan.infrastructure}</p>
                    <p className="text-xs text-muted-foreground mt-1">{plan.routing}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Edit Plan Modal */}
      {editingPlan && (
        <Modal
          isOpen={true}
          onClose={() => setEditingPlan(null)}
          title={`Edit Plan — ${editingPlan.name}`}
          description="Changes apply to all new licenses generated on this plan"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              alert("Plan editing requires backend implementation (PATCH /api/plans/:id).\nSee Phase 2 backend tasks.");
              setEditingPlan(null);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Plan Name</Label>
                <Input defaultValue={editingPlan.name} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price (one-time)</Label>
                <Input type="number" defaultValue={editingPlan.price} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Installations</Label>
                <Input type="number" defaultValue={editingPlan.installations} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Support + Updates ($/year)</Label>
                <Input type="number" defaultValue={editingPlan.supportAndUpdatesYearly} className="h-11" />
              </div>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              ⚠️ Existing licenses are <strong>not affected</strong> by plan changes.
              Only newly generated licenses will use the updated limits.
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Modal>
      )}
    </DashboardLayout>
  );
}
