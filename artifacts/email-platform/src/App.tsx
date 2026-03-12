import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Landing } from "@/pages/public/Landing";
import { Login } from "@/pages/auth/Login";
import { Register } from "@/pages/auth/Register";
import { Overview } from "@/pages/dashboard/Overview";
import { Users } from "@/pages/dashboard/Users";
import { Plans } from "@/pages/dashboard/Plans";
import { Settings } from "@/pages/dashboard/Settings";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  if (adminOnly && user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected Routes */}
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Overview} />}
      </Route>
      <Route path="/dashboard/users">
        {() => <ProtectedRoute component={Users} adminOnly />}
      </Route>
      <Route path="/dashboard/plans">
        {() => <ProtectedRoute component={Plans} adminOnly />}
      </Route>
      <Route path="/dashboard/settings">
        {() => <ProtectedRoute component={Settings} adminOnly />}
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
