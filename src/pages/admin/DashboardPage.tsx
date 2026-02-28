import { AlertCircle, LayoutDashboard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis } from "recharts";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useDashboardFunnel } from "@/features/admin/dashboard/hooks/useDashboardFunnel";
import { useDashboardKpis } from "@/features/admin/dashboard/hooks/useDashboardKpis";
import { useDashboardOverdueActivities } from "@/features/admin/dashboard/hooks/useDashboardOverdueActivities";
import { useDashboardTrends } from "@/features/admin/dashboard/hooks/useDashboardTrends";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const DashboardPage = () => {
  const { role } = useAdminRole();
  const kpis = useDashboardKpis();
  const funnel = useDashboardFunnel();
  const trends = useDashboardTrends();
  const overdue = useDashboardOverdueActivities();

  const canViewRevenue = role === "admin" || role === "operator";

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Dashboard" icon={LayoutDashboard}>
        <p className="text-xs text-muted-foreground">Snapshot of CRM health from lightweight aggregate queries.</p>
      </AdminPageHeader>

      {role === "viewer" ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Limited view</AlertTitle>
          <AlertDescription>Financial KPI cards are hidden for viewer accounts.</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Total Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{kpis.data?.totalOpportunities ?? 0}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Active Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{kpis.data?.activeOpportunities ?? 0}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Won This Month</CardTitle>
          </CardHeader>
          <CardContent>
            {kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{kpis.data?.wonThisMonth ?? 0}</p>}
          </CardContent>
        </Card>

        {canViewRevenue ? (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Pipeline Value</CardTitle>
            </CardHeader>
            <CardContent>
              {kpis.isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-2xl font-semibold">{currencyFormatter.format(kpis.data?.pipelineValue ?? 0)}</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </section>

      {kpis.error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load KPI cards</AlertTitle>
          <AlertDescription>{kpis.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Funnel by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            {funnel.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : funnel.error ? (
              <p className="text-xs text-destructive">{funnel.error.message}</p>
            ) : funnel.data?.some((row) => row.count > 0) ? (
              <ChartContainer
                className="h-[260px] w-full"
                config={{ count: { label: "Opportunities", color: "hsl(var(--primary))" } }}
              >
                <BarChart data={funnel.data}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={4} fill="var(--color-count)" />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-xs text-muted-foreground">No funnel data available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Time-Series Trends (6 months)</CardTitle>
          </CardHeader>
          <CardContent>
            {trends.isLoading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : trends.error ? (
              <p className="text-xs text-destructive">{trends.error.message}</p>
            ) : trends.data?.some((row) => row.activities > 0 || row.opportunities > 0) ? (
              <ChartContainer
                className="h-[260px] w-full"
                config={{
                  opportunities: { label: "Opportunities", color: "hsl(var(--primary))" },
                  activities: { label: "Activities", color: "hsl(var(--accent-foreground))" },
                }}
              >
                <LineChart data={trends.data}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="opportunities" stroke="var(--color-opportunities)" strokeWidth={2} dot={false} />
                  <Line dataKey="activities" stroke="var(--color-activities)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            ) : (
              <p className="text-xs text-muted-foreground">No trend data available yet.</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Overdue Activity List</CardTitle>
        </CardHeader>
        <CardContent>
          {overdue.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : overdue.error ? (
            <p className="text-xs text-destructive">{overdue.error.message}</p>
          ) : overdue.data && overdue.data.length > 0 ? (
            <div className="space-y-2">
              {overdue.data.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between rounded border p-2 text-xs">
                  <div>
                    <p className="font-medium">{activity.activity_type ?? "Task"}</p>
                    <p className="text-muted-foreground">
                      {activity.contact_name ?? "Unknown contact"}
                      {activity.opportunity_title ? ` · ${activity.opportunity_title}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{activity.status ?? "open"}</Badge>
                    {activity.due_at ? <span>{formatDistanceToNow(new Date(activity.due_at), { addSuffix: true })}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No overdue activities 🎉</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
