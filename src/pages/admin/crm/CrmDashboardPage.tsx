import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, LayoutDashboard, PhoneCall } from "lucide-react";
import { useNavigate } from "react-router";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCrmDashboardKpis, type CrmDashboardPeriod } from "@/features/admin/crm/hooks/useCrmDashboardKpis";
import { useActivities, useCompleteActivity } from "@/features/admin/crm/hooks/useActivities";
import { useCustomerHealth } from "@/features/admin/crm/hooks/useCustomerHealth";
import { useToast } from "@/hooks/use-toast";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = (value: number, digits = 1) => `${(value * 100).toFixed(digits)}%`;

const CrmDashboardPage = () => {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [period, setPeriod] = useState<CrmDashboardPeriod>("mtd");
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);

  const kpis = useCrmDashboardKpis({
    period,
    startDate,
    endDate,
  });

  return (
    <div className="space-y-4">
      <AdminPageHeader title="CRM Dashboard" icon={LayoutDashboard}>
        <p className="text-xs text-muted-foreground">v1 KPI cards backed by aggregated Supabase RPC with period filters.</p>
      </AdminPageHeader>

      <TodayQueue />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-full sm:w-44">
            <Label className="mb-1 block text-xs">Period</Label>
            <Select value={period} onValueChange={(value) => setPeriod(value as CrmDashboardPeriod)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mtd">MTD</SelectItem>
                <SelectItem value="qtd">QTD</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {period === "custom" ? (
            <>
              <div className="w-full sm:w-44">
                <Label className="mb-1 block text-xs">Start date</Label>
                <Input type="date" className="h-8 text-xs" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="w-full sm:w-44">
                <Label className="mb-1 block text-xs">End date</Label>
                <Input type="date" className="h-8 text-xs" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </>
          ) : null}

          {kpis.data ? (
            <p className="text-xs text-muted-foreground sm:ml-auto">
              Window: {kpis.data.period_start} → {kpis.data.period_end}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {kpis.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load CRM dashboard KPI cards</AlertTitle>
          <AlertDescription>{kpis.error.message}</AlertDescription>
        </Alert>
      ) : null}

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Contacts Count</CardTitle></CardHeader>
          <CardContent>{kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{kpis.data?.contacts_count ?? 0}</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Price Items Count</CardTitle></CardHeader>
          <CardContent>{kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{kpis.data?.price_items_count ?? 0}</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Avg Markup</CardTitle></CardHeader>
          <CardContent>{kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{(kpis.data?.avg_markup ?? 0).toFixed(1)}%</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Open Opportunities</CardTitle></CardHeader>
          <CardContent>{kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{kpis.data?.open_opportunities ?? 0}</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Overdue Activities</CardTitle></CardHeader>
          <CardContent>{kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{kpis.data?.overdue_activities ?? 0}</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Quote Acceptance Rate</CardTitle></CardHeader>
          <CardContent>{kpis.isLoading ? <Skeleton className="h-7 w-20" /> : <p className="text-2xl font-semibold">{percentFormatter(kpis.data?.quote_acceptance_rate ?? 0)}</p>}</CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Landed Costing Totals</CardTitle></CardHeader>
          <CardContent>{kpis.isLoading ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-semibold">{currencyFormatter.format(kpis.data?.landed_costing_total ?? 0)}</p>}</CardContent>
        </Card>
      </section>
    </div>
  );
};

/**
 * The "sit down and know what to do next" surface: tasks due now, customers
 * who have gone quiet against their ordering rhythm, and the classification
 * backlog. This is the operator's turn-by-turn queue.
 */
const TodayQueue = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: activities = [] } = useActivities();
  const { data: health = [] } = useCustomerHealth();
  const completeActivity = useCompleteActivity();

  const dueNow = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    return activities
      .filter((a) => a.status !== "completed" && a.due_at && new Date(a.due_at) <= endOfToday)
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
  }, [activities]);

  const alarms = useMemo(
    () =>
      health
        .filter((h) => h.health === "alarm" || h.health === "flag")
        .sort((a, b) => (b.quiet_days ?? 0) - (a.quiet_days ?? 0)),
    [health],
  );

  return (
    <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Today’s Tasks</span>
            <Badge variant={dueNow.length ? "default" : "outline"}>{dueNow.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dueNow.slice(0, 8).map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium">{a.activity_type}</p>
                <p className="text-muted-foreground">Due {a.due_at ? new Date(a.due_at).toLocaleDateString() : "—"}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={async () => {
                  try {
                    await completeActivity.mutateAsync(a.id);
                    toast({ title: "Task completed" });
                  } catch {
                    toast({ title: "Unable to complete task", variant: "destructive" });
                  }
                }}
              >
                Done
              </Button>
            </div>
          ))}
          {dueNow.length === 0 ? <p className="text-xs text-muted-foreground">Nothing due. Enrol contacts in a cadence to generate tasks.</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Customers Gone Quiet</span>
            <Badge variant={alarms.some((a) => a.health === "alarm") ? "destructive" : "outline"}>{alarms.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alarms.slice(0, 8).map((h) => (
            <div key={h.contact_id} className="flex items-center justify-between gap-2 rounded border p-2 text-xs">
              <div className="min-w-0">
                <p className="truncate font-medium">{h.name}</p>
                <p className="text-muted-foreground">
                  Quiet {h.quiet_days ?? "—"} days{h.avg_gap_days ? ` · usually every ${Math.round(h.avg_gap_days)}d` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant={h.health === "alarm" ? "destructive" : "outline"} className="text-[10px]">
                  {h.health === "alarm" ? "Call now" : "Watch"}
                </Badge>
                <PhoneCall className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </div>
          ))}
          {alarms.length === 0 ? (
            <p className="text-xs text-muted-foreground">No quiet customers. Live once the order-activity feed is flowing.</p>
          ) : null}
          <Button variant="ghost" size="sm" className="h-7 w-full text-[11px]" onClick={() => navigate("/admin/crm/pipeline")}>
            Open pipeline →
          </Button>
        </CardContent>
      </Card>
    </section>
  );
};

export default CrmDashboardPage;
