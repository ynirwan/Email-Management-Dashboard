import { Link } from "wouter";
import { PublicLayout } from "./PublicLayout";
import { cn } from "@/lib/utils";

interface LegalLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalLayout({ title, lastUpdated, children }: LegalLayoutProps) {
  const pages = [
    { label: "Privacy Policy",    href: "/legal/privacy" },
    { label: "Terms of Service",  href: "/legal/terms" },
    { label: "Refund Policy",     href: "/legal/refunds" },
    { label: "Cookie Policy",     href: "/legal/cookies" },
    { label: "Legal",             href: "/legal" },
  ];

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 py-16 flex flex-col md:flex-row gap-12">

        {/* Sidebar nav */}
        <aside className="md:w-48 flex-shrink-0">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">Legal</p>
          <nav className="flex flex-row md:flex-col gap-1 flex-wrap">
            {pages.map((p) => (
              <Link key={p.href} href={p.href}>
                <span className={cn(
                  "block px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  typeof window !== "undefined" && window.location.pathname === p.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}>
                  {p.label}
                </span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{title}</h1>
          <p className="text-sm text-muted-foreground mb-10">Last updated: {lastUpdated}</p>
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-3 prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
            {children}
          </div>
        </main>

      </div>
    </PublicLayout>
  );
}
