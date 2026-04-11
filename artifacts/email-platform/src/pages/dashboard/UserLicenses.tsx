import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner, Button } from "@/components/ui/core";
import { usePortal } from "@/hooks/use-portal";

export function UserLicenses() {
  const { data, isLoading, error } = usePortal();

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center py-16"><Spinner /></div></DashboardLayout>;
  }

  if (error || !data) {
    return <DashboardLayout><div className="text-destructive p-8">Failed to load licenses</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">My Licenses</h1>
        <p className="text-muted-foreground mt-1">View status and download your active license files.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle>Licenses</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.licenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No licenses found for this account yet.</p>
          ) : data.licenses.map((license) => (
            <div key={license.id} className="flex items-center justify-between gap-4 border border-border/40 rounded-lg p-4">
              <div>
                <p className="font-medium">{license.domain}</p>
                <p className="text-xs text-muted-foreground capitalize">Plan: {license.plan}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={license.status === "active" ? "success" : "outline"} className="capitalize">
                  {license.status}
                </Badge>
                <Button
                  size="sm"
                  onClick={() => window.open(`/api/portal/license/${license.id}/download`, "_blank")}
                >
                  Download
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
