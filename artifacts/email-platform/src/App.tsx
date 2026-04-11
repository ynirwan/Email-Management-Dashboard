import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

import { useAuth } from "@/hooks/use-auth";

import { Landing }      from "@/pages/public/Landing";
import { Login }        from "@/pages/auth/Login";
import { Register }     from "@/pages/auth/Register";
import { AdminLogin }   from "@/pages/auth/AdminLogin";

import { Overview }     from "@/pages/dashboard/Overview";
import { Domains }      from "@/pages/dashboard/Domains";
import { UserDomains }  from "@/pages/dashboard/UserDomains";
import { Users }        from "@/pages/dashboard/Users";
import { Licenses }     from "@/pages/dashboard/Licenses";
import { Billing }      from "@/pages/dashboard/Billing";
import { Plans }        from "@/pages/dashboard/Plans";
import { AuditLogs }    from "@/pages/dashboard/AuditLogs";
import { Settings }     from "@/pages/dashboard/Settings";
import { Account }      from "@/pages/dashboard/Account";
import { UserLicenses } from "@/pages/dashboard/UserLicenses";
import { UserBilling }  from "@/pages/dashboard/UserBilling";

import { Legal }        from "@/pages/legal/Legal";
import { Privacy }      from "@/pages/legal/Privacy";
import { Terms }        from "@/pages/legal/Terms";
import { Refunds }      from "@/pages/legal/Refunds";
import { Cookies }      from "@/pages/legal/Cookies";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
  if (!user)         return <Redirect to="/login" />;
  if (!user.isAdmin) return <Redirect to="/dashboard" />;
  return <Component />;
}

function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page not found.</p>
      <a href="/" className="text-primary underline">Go home</a>
    </div>
  );
}

function Routes() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/"         component={Landing} />
      <Route path="/login"    component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/admin"    component={AdminLogin} />

      {/* Legal */}
      <Route path="/legal"          component={Legal} />
      <Route path="/legal/privacy"  component={Privacy} />
      <Route path="/legal/terms"    component={Terms} />
      <Route path="/legal/refunds"  component={Refunds} />
      <Route path="/legal/cookies"  component={Cookies} />

      {/* User dashboard */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Overview} />}
      </Route>
      <Route path="/dashboard/domains">
        {() => <ProtectedRoute component={UserDomains} />}
      </Route>
      <Route path="/dashboard/licenses">
        {() => <ProtectedRoute component={UserLicenses} />}
      </Route>
      <Route path="/dashboard/billing">
        {() => <ProtectedRoute component={UserBilling} />}
      </Route>
      <Route path="/dashboard/account">
        {() => <ProtectedRoute component={Account} />}
      </Route>

      {/* Admin dashboard */}
      <Route path="/dashboard/users">
        {() => <AdminRoute component={Users} />}
      </Route>
      <Route path="/dashboard/domains/all">
        {() => <AdminRoute component={Domains} />}
      </Route>
      <Route path="/dashboard/admin/licenses">
        {() => <AdminRoute component={Licenses} />}
      </Route>
      <Route path="/dashboard/admin/billing">
        {() => <AdminRoute component={Billing} />}
      </Route>
      <Route path="/dashboard/plans">
        {() => <AdminRoute component={Plans} />}
      </Route>
      <Route path="/dashboard/audit">
        {() => <AdminRoute component={AuditLogs} />}
      </Route>
      <Route path="/dashboard/settings">
        {() => <AdminRoute component={Settings} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Routes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
