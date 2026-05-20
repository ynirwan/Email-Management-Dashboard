import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner, Button } from "@/components/ui/core";
import { usePortal } from "@/hooks/use-portal";
import { fetchApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Download, AlertCircle } from "lucide-react";

export function UserLicenses() {
  const { data, isLoading, error } = usePortal();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState<number | null>(null);

  // window.open() doesn't include the Authorization header — so we use fetchApi
  // to make an authenticated fetch, then convert the JSON response to a blob download.
  const handleDownload = async (licenseId: number, domain: string) => {
    setDownloading(licenseId);
    try {
      const data = await fetchApi<object>(`/api/portal/license/${licenseId}/download`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `zenipost-license-${domain}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      const msg = err?.message ?? "Download failed";
      toast({
        title:       "Download failed",
        description: msg.includes("LICENSE_NOT_ACTIVATED")
          ? "This license is awaiting admin activation. Please complete payment and wait for confirmation."
          : msg,
        variant: "destructive",
      });
    } finally {
      setDownloading(null);
    }
  };

  if (isLoading) {
    return <DashboardLayout><div className="flex justify-center py-16"><Spinner /></div></DashboardLayout>;
  }

  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="flex items-center gap-3 text-destructive p-8">
          <AlertCircle className="h-5 w-5" />
          <p>Failed to load licenses. Please refresh the page.</p>
        </div>
      </DashboardLayout>
    );
  }

  const licenses = data.licenses ?? [];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">My Licenses</h1>
        <p className="text-muted-foreground mt-1">View status and download your active license files.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader><CardTitle>Licenses</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {licenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No licenses found for this account yet.</p>
          ) : licenses.map((license) => {
            const isAwaiting = !license.isActivated;
            const isRevoked  = license.status === "revoked";
            const canDownload = !isAwaiting && !isRevoked;

            return (
              <div key={license.id} className="flex items-center justify-between gap-4 border border-border/40 rounded-lg p-4">
                <div>
                  <p className="font-medium">{license.domain}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    Plan: {license.plan}
                    {license.expiresAt && ` · Expires ${license.expiresAt}`}
                  </p>
                  {isAwaiting && (
                    <p className="text-xs text-amber-600 mt-0.5">Awaiting admin activation after payment confirmation</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    variant={
                      isAwaiting ? "outline" :
                      license.status === "active" ? "success" :
                      license.status === "expiring" ? "warning" :
                      "destructive"
                    }
                    className="capitalize"
                  >
                    {isAwaiting ? "Awaiting" : license.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant={canDownload ? "default" : "outline"}
                    disabled={!canDownload || downloading === license.id}
                    onClick={() => canDownload && handleDownload(license.id, license.domain)}
                    className="gap-1.5"
                  >
                    {downloading === license.id
                      ? <Spinner className="h-3.5 w-3.5" />
                      : <Download className="h-3.5 w-3.5" />}
                    {isAwaiting ? "Awaiting" : isRevoked ? "Revoked" : "Download"}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
