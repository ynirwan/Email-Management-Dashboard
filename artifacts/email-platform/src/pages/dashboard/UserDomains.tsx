import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, Input, Button, Badge, Spinner } from "@/components/ui/core";
import { useAddDomain, useDeleteDomain, useDomains } from "@/hooks/use-domains";
import { useToast } from "@/hooks/use-toast";

export function UserDomains() {
  const [domain, setDomain] = useState("");
  const { toast } = useToast();
  const { data, isLoading, error } = useDomains();
  const addDomain = useAddDomain();
  const deleteDomain = useDeleteDomain();

  const handleAdd = async () => {
    if (!domain.trim()) return;
    try {
      await addDomain.mutateAsync(domain.trim());
      setDomain("");
      toast({ title: "Domain added" });
    } catch (err: any) {
      toast({ title: "Failed to add domain", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDomain.mutateAsync(id);
      toast({ title: "Domain removed" });
    } catch (err: any) {
      toast({ title: "Failed to remove domain", description: err.message, variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">My Domains</h1>
        <p className="text-muted-foreground mt-1">Add and manage sending domains for your account.</p>
      </div>

      <Card className="border-border/50 mb-6">
        <CardHeader><CardTitle>Add Domain</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Input
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button onClick={handleAdd} isLoading={addDomain.isPending}>Add</Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader><CardTitle>Domains</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : error ? (
            <p className="text-sm text-destructive">Failed to load domains.</p>
          ) : (data?.domains.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No domains yet. Add your first domain above.</p>
          ) : data!.domains.map((item) => (
            <div key={item.id} className="flex items-center justify-between border border-border/40 rounded-lg p-4">
              <div>
                <p className="font-medium">{item.domain}</p>
                <p className="text-xs text-muted-foreground">Added {new Date(item.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={item.isVerified ? "success" : "outline"}>
                  {item.isVerified ? "Verified" : "Pending"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => handleDelete(item.id)} isLoading={deleteDomain.isPending}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
