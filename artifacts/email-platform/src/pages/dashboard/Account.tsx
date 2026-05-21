import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Spinner } from "@/components/ui/core";
import { usePortal } from "@/hooks/use-portal";

export function Account() {
  const { data, isLoading, error } = usePortal();

  if (isLoading) return <DashboardLayout><div className="flex justify-center py-16"><Spinner /></div></DashboardLayout>;
  if (error || !data) return <DashboardLayout><div className="text-destructive p-8">Failed to load account</div></DashboardLayout>;

  const { user } = data;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">My Account</h1>
        <p className="text-muted-foreground mt-1">Profile and plan overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="text-muted-foreground">Name:</span> {user.name}</p>
            <p><span className="text-muted-foreground">Email:</span> {user.email}</p>
            <p><span className="text-muted-foreground">Company:</span> {user.company || "—"}</p>
            <p className="capitalize"><span className="text-muted-foreground">Plan:</span> {user.plan}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader><CardTitle>Plan Details</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sending Domains</span>
              <span className="font-medium">
                {user.plan === "agency" ? "Unlimited" : user.plan === "pro" ? "Up to 5" : "License domain"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Installations</span>
              <span className="font-medium">
                {user.plan === "agency" ? "Unlimited" : user.plan === "pro" ? "Up to 3" : "1"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Advanced Features</span>
              <span className="font-medium">
                {user.plan === "starter" ? "Not included" : "Included"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
