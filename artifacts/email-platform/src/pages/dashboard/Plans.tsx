import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePlans } from "@/hooks/use-plans";
import { Card, CardContent, Badge, Spinner } from "@/components/ui/core";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export function Plans() {
  const { data, isLoading } = usePlans();

  return (
    <DashboardLayout>
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-display font-bold">Platform Plans</h1>
        <p className="text-muted-foreground mt-2">View active subscription tiers available to users. (Editing features coming soon)</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner className="w-12 h-12" /></div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
          {data?.plans.map((plan) => (
            <Card key={plan.id} className={`relative overflow-hidden ${plan.isPopular ? 'border-primary shadow-lg shadow-primary/5' : 'border-border/50'}`}>
              {plan.isPopular && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary to-blue-500" />
              )}
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold font-display capitalize text-foreground/80">{plan.name}</h3>
                  {plan.isPopular && <Badge variant="default" className="text-[10px]">Popular</Badge>}
                </div>
                
                <div className="mb-6 pb-6 border-b border-border/50">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-foreground">{formatCurrency(plan.price).replace('.00','')}</span>
                    <span className="text-muted-foreground font-medium">/mo</span>
                  </div>
                </div>

                <div className="space-y-4 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emails/mo</span>
                    <span className="font-semibold">{formatNumber(plan.emailsPerMonth)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subscribers</span>
                    <span className="font-semibold">{formatNumber(plan.subscribers)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Features</p>
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
