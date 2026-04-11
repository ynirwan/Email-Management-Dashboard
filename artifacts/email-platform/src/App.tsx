import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Landing }    from "@/pages/public/Landing";
import { Login }      from "@/pages/auth/Login";
import { Register }   from "@/pages/auth/Register";
import { AdminLogin } from "@/pages/auth/AdminLogin";
import { Overview }   from "@/pages/dashboard/Overview";
import { Users }      from "@/pages/dashboard/Users";
import { Plans }      from "@/pages/dashboard/Plans";
import { Settings }   from "@/pages/dashboard/Settings";
import { Licenses }   from "@/pages/dashboard/Licenses";
import { AuditLogs }  from "@/pages/dashboard/AuditLogs";
import { Billing }    from "@/pages/dashboard/Billing";
import { UserBilling } from "@/pages/dashboard/UserBilling";
import { UserLicenses } from "@/pages/dashboard/UserLicenses";
import { Account } from "@/pages/dashboard/Account";
import { UserDomains } from "@/pages/dashboard/UserDomains";
import { useAuth }    from "@/hooks/use-auth";

const Domains = UserDomains;

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function ProtectedRoute({ component: Component }: { component: any }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  if (!user) { setLocation("/login"); return null; }
  return <Component />;
}

function AdminRoute({ component: Component }: { component: any }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  if (!user) { setLocation("/admin"); return null; }
  if (user.role !== "admin") { setLocation("/dashboard"); return null; }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/"          component={Landing} />
      <Route path="/login"     component={Login} />
      <Route path="/register"  component={Register} />
      <Route path="/admin"     component={AdminLogin} />

      <Route path="/dashboard">
        {() => <ProtectedRoute component={Overview} />}
      </Route>
      <Route path="/dashboard/domains">
        {() => <ProtectedRoute component={Domains} />}
      </Route>

      <Route path="/dashboard/users">
        {() => <AdminRoute component={Users} />}
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
      <Route path="/dashboard/domains">
        {() => <ProtectedRoute component={Domains} />}
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

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
