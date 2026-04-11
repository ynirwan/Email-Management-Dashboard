import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Spinner } from "@/components/ui/core";
import { Progress } from "@/components/ui/progress";
import { usePortal } from "@/hooks/use-portal";

function percent(used: number, limit: number) {
  if (!limit) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function Account() {
  const { data, isLoading, error } = usePortal();

  if (isLoading) return <DashboardLayout><div className="flex justify-center py-16"><Spinner /></div></DashboardLayout>;
  if (error || !data) return <DashboardLayout><div className="text-destructive p-8">Failed to load account</div></DashboardLayout>;

  const emailsPct = percent(data.user.emailsUsed, data.user.emailsLimit);
  const subsPct = percent(data.user.subscribersUsed, data.user.subscribersLimit);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">My Account</h1>
        <p className="text-muted-foreground mt-1">Profile and plan usage overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {data.user.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {data.user.email}</p>
            <p><span className="text-muted-foreground">Company:</span> {data.user.company || "—"}</p>
            <p className="capitalize"><span className="text-muted-foreground">Plan:</span> {data.user.plan}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Usage</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm mb-2">Emails: {data.user.emailsUsed} / {data.user.emailsLimit}</p>
              <Progress value={emailsPct} />
            </div>
            <div>
              <p className="text-sm mb-2">Subscribers: {data.user.subscribersUsed} / {data.user.subscribersLimit}</p>
              <Progress value={subsPct} />
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
