import { Link, useLocation } from "wouter";
import { Mail, LayoutDashboard, Users, CreditCard, Settings, LogOut, Menu, X, Globe, Shield, ClipboardList, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Spinner } from "@/components/ui/core";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Spinner className="w-12 h-12" /></div>;
  }

  if (!user) return null;

  const navigation = [
    { name: "Overview",  href: "/dashboard",          icon: LayoutDashboard },
    { name: "Domains",   href: "/dashboard/domains",  icon: Globe },
    ...(user.role === "admin" ? [
      { name: "Users",      href: "/dashboard/users",    icon: Users },
      { name: "Licenses",   href: "/dashboard/licenses", icon: Shield },
      { name: "Billing",    href: "/dashboard/billing",  icon: Receipt },
      { name: "Plans",      href: "/dashboard/plans",    icon: CreditCard },
      { name: "Audit Logs", href: "/dashboard/audit",    icon: ClipboardList },
      { name: "Settings",   href: "/dashboard/settings", icon: Settings },
    ] : [])
  ];

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block flex flex-col shadow-2xl lg:shadow-none border-r border-sidebar-border",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-20 flex items-center px-6 border-b border-sidebar-border/50 justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Mail className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-white">ZeniPost</span>
          </Link>
          <button className="lg:hidden text-sidebar-foreground/70" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 py-8 flex-1 overflow-y-auto space-y-1">
          <div className="text-xs font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-4 px-3">Menu</div>
          {navigation.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-all group cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                )}>
                  <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-white")} />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="flex items-center gap-3 px-3 py-3 bg-sidebar-accent/50 rounded-xl mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center px-4 sm:px-8 lg:hidden sticky top-0 z-30">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg text-foreground/70 hover:bg-accent/10">
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 font-display font-bold text-lg">ZeniPost</span>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
