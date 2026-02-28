import { useMemo, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCrmDashboardKpis, type CrmDashboardPeriod } from "@/features/admin/crm/hooks/useCrmDashboardKpis";

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

export default CrmDashboardPage;
