import { Link, useLocation } from "wouter";
import { Mail, LayoutDashboard, Users, CreditCard, Settings, LogOut, Menu, X, ShieldCheck, ClipboardList } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Spinner } from "@/components/ui/core";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = user.role === "admin";

  const navigation = [
    { name: "Overview",      href: "/dashboard",           icon: LayoutDashboard, adminOnly: false },
    { name: "Users",         href: "/dashboard/users",     icon: Users,           adminOnly: true  },
    { name: "Licenses",      href: "/dashboard/licenses",  icon: ShieldCheck,     adminOnly: true  },
    { name: "Plans",         href: "/dashboard/plans",     icon: CreditCard,      adminOnly: true  },
    { name: "Settings",      href: "/dashboard/settings",  icon: Settings,        adminOnly: false },
  ];

  const systemNavigation = [
    { name: "Audit Logs",    href: "/dashboard/audit",     icon: ClipboardList,   adminOnly: true  },
  ];

  const visibleNav    = navigation.filter((n)  => !n.adminOnly || isAdmin);
  const visibleSystem = systemNavigation.filter((n) => !n.adminOnly || isAdmin);

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block flex flex-col shadow-2xl lg:shadow-none border-r border-sidebar-border",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="h-[62px] flex items-center px-5 border-b border-sidebar-border/50 justify-between shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Mail className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">ZeniPost</span>
          </Link>
          {isAdmin && (
            <span className="text-[10px] font-semibold bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded tracking-wider uppercase">
              Admin
            </span>
          )}
          <button className="lg:hidden text-sidebar-foreground/70 ml-2" onClick={() => setMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <div className="px-3 py-5 flex-1 overflow-y-auto space-y-0.5">
          <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-wider mb-2 px-3">
            Main
          </p>
          {visibleNav.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all group cursor-pointer text-[13px]",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon
                    className={cn(
                      "w-4 h-4 transition-colors shrink-0",
                      isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-white"
                    )}
                  />
                  {item.name}
                </div>
              </Link>
            );
          })}

          {/* System section — only shown to admins */}
          {isAdmin && visibleSystem.length > 0 && (
            <>
              <div className="my-3 border-t border-sidebar-border/40" />
              <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-wider mb-2 px-3">
                System
              </p>
              {visibleSystem.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium transition-all group cursor-pointer text-[13px]",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 transition-colors shrink-0",
                          isActive ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-white"
                        )}
                      />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </>
          )}
        </div>

        {/* User footer */}
        <div className="p-3 border-t border-sidebar-border/50 shrink-0">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-sidebar-accent/50 rounded-xl mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl font-medium text-[13px] text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="h-[62px] bg-background/80 backdrop-blur-md border-b border-border/50 flex items-center px-4 lg:hidden sticky top-0 z-30">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-foreground/70 hover:bg-accent/10"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 font-display font-bold text-lg">ZeniPost</span>
        </header>

        <div className="flex-1 overflow-auto p-5 sm:p-7">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}