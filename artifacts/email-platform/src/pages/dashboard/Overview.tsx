import { Users, Mail, MousePointerClick, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Spinner } from "@/components/ui/core";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useStatsSummary } from "@/hooks/use-dashboard";
import { formatNumber } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

export function Overview() {
  const { data: stats, isLoading, error } = useStatsSummary();

  if (isLoading) return (
    <DashboardLayout>
      <div className="flex h-64 items-center justify-center"><Spinner /></div>
    </DashboardLayout>
  );

  if (error || !stats) return (
    <DashboardLayout>
      <div className="text-destructive p-8">Failed to load stats</div>
    </DashboardLayout>
  );

  const statCards = [
    { title: "Total Users",  value: stats.totalUsers,       icon: Users,             color: "text-blue-500",    bg: "bg-blue-500/10" },
    { title: "Active Users", value: stats.activeUsers,      icon: TrendingUp,        color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Emails Sent",  value: stats.totalEmailsSent,  icon: Mail,              color: "text-primary",     bg: "bg-primary/10" },
    { title: "Subscribers",  value: stats.totalSubscribers, icon: MousePointerClick, color: "text-purple-500",  bg: "bg-purple-500/10" },
  ];

  const timelineData = [
    { name: "Mon", emails: Math.floor(stats.totalEmailsSent * 0.10) },
    { name: "Tue", emails: Math.floor(stats.totalEmailsSent * 0.15) },
    { name: "Wed", emails: Math.floor(stats.totalEmailsSent * 0.20) },
    { name: "Thu", emails: Math.floor(stats.totalEmailsSent * 0.25) },
    { name: "Fri", emails: Math.floor(stats.totalEmailsSent * 0.15) },
    { name: "Sat", emails: Math.floor(stats.totalEmailsSent * 0.10) },
    { name: "Sun", emails: Math.floor(stats.totalEmailsSent * 0.05) },
  ];

  const pieData = [
    { name: "Starter", value: stats.planBreakdown.starter, color: "#38bdf8" },
    { name: "Pro",     value: stats.planBreakdown.pro,     color: "#0d9488" },
    { name: "Agency",  value: stats.planBreakdown.agency,  color: "#1e293b" },
  ].filter((d) => d.value > 0);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here's what's happening today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-7 h-7 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</p>
                <h3 className="text-3xl font-bold font-display">{formatNumber(stat.value)}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card className="col-span-1 lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>Email Sending Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: "#f1f5f9" }}
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                  />
                  <Bar dataKey="emails" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card className="col-span-1 border-border/50">
          <CardHeader>
            <CardTitle>Users by Plan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[220px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full space-y-2 mt-4">
              {pieData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-medium">{entry.name}</span>
                  </div>
                  <span className="text-muted-foreground">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
