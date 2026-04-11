import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Card, CardContent, Button } from "@/components/ui/core";
import { Globe, Trash2, Download, Plus, CheckCircle, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Domain {
  id: number;
  domain: string;
  licenseKey: string;
  isVerified: boolean;
  expiresAt: string | null;
  createdAt: string;
}

export function Domains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    const data = await fetchApi<{ domains: Domain[] }>("/api/domains");
    if (data) setDomains(data.domains);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/domains", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to add domain");
      } else {
        setNewDomain("");
        await load();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setAdding(false);
  }

  async function handleDelete(id: number) {
    if (!confirm("Remove this domain? Its license key will also be invalidated.")) return;
    setDeletingId(id);
    await fetch(`/api/domains/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setDeletingId(null);
    await load();
  }

  async function handleDownloadLicense(domain: Domain) {
    setDownloadingId(domain.id);
    try {
      const res = await fetch(`/api/domains/${domain.id}/license`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) {
        alert("Failed to generate license file");
        setDownloadingId(null);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zenipost-license-${domain.domain}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download license");
    }
    setDownloadingId(null);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Domain Licenses</h1>
        <p className="text-muted-foreground">
          Register your domains and download JWT-signed license files for each one.
        </p>
      </div>

      {/* Add domain form */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Add a Domain
          </h2>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => { setNewDomain(e.target.value); setError(null); }}
                placeholder="yourdomain.com"
                className={cn(
                  "w-full px-4 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition",
                  error ? "border-destructive focus:ring-destructive/30" : "border-border"
                )}
                disabled={adding}
              />
              {error && (
                <p className="text-destructive text-xs mt-1.5 flex items-center gap-1">
                  <X className="w-3 h-3" /> {error}
                </p>
              )}
            </div>
            <Button type="submit" disabled={adding || !newDomain.trim()} className="gap-2 sm:w-auto w-full">
              {adding ? "Adding…" : <><Plus className="w-4 h-4" /> Add Domain</>}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-3">
            Enter the root domain only, e.g. <code className="bg-muted px-1 rounded">example.com</code> — not a URL or subdomain.
          </p>
        </CardContent>
      </Card>

      {/* Domain list */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-40" />
            </Card>
          ))}
        </div>
      ) : domains.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold text-muted-foreground mb-1">No domains yet</p>
            <p className="text-sm text-muted-foreground">Add your first domain above to get a license file.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {domains.map((domain) => (
            <Card key={domain.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold truncate text-lg">{domain.domain}</h3>
                      <span className={cn(
                        "inline-flex items-center gap-1 text-xs font-semibold mt-0.5",
                        domain.isVerified ? "text-emerald-600" : "text-amber-600"
                      )}>
                        {domain.isVerified
                          ? <><CheckCircle className="w-3 h-3" /> Verified</>
                          : <><Clock className="w-3 h-3" /> Pending verification</>
                        }
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(domain.id)}
                    disabled={deletingId === domain.id}
                    className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-muted/50 rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wider">License Key</p>
                  <p className="font-mono text-sm text-foreground break-all">{domain.licenseKey}</p>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                  <span>Added {new Date(domain.createdAt).toLocaleDateString()}</span>
                  {domain.expiresAt && (
                    <span>Expires {new Date(domain.expiresAt).toLocaleDateString()}</span>
                  )}
                </div>

                <Button
                  onClick={() => handleDownloadLicense(domain)}
                  disabled={downloadingId === domain.id}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Download className="w-4 h-4" />
                  {downloadingId === domain.id ? "Generating…" : "Download License File"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
