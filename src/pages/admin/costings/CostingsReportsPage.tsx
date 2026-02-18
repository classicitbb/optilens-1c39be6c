import { useMemo } from "react";
import { useShipments, useShipmentCharges, computeShipmentTotals } from "@/hooks/useShipments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Ship, DollarSign, TrendingUp, Package } from "lucide-react";

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CostingsReportsPage = () => {
  const { data: shipments = [], isLoading } = useShipments();

  // We can't call useShipmentCharges per-shipment in a loop, so compute simple totals from shipment-level data
  // For the reports page we compute FOB BBD from shipment fields only (without per-charge breakdown)
  const supplierSummary = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalFobBbd: number; totalInvoiceBbd: number }> = {};
    shipments.forEach((sh) => {
      const key = sh.supplier_name || sh.supplier_id;
      if (!map[key]) map[key] = { name: sh.supplier_name || "Unknown", count: 0, totalFobBbd: 0, totalInvoiceBbd: 0 };
      map[key].count += 1;
      map[key].totalFobBbd += sh.fob_foreign * (sh.exchange_rate || 1);
      map[key].totalInvoiceBbd += sh.invoice_total_foreign * (sh.exchange_rate || 1);
    });
    return Object.values(map).sort((a, b) => b.totalFobBbd - a.totalFobBbd);
  }, [shipments]);

  const monthlyVolume = useMemo(() => {
    const map: Record<string, { month: string; count: number; fobBbd: number }> = {};
    shipments.forEach((sh) => {
      const m = sh.date_received?.substring(0, 7) || "Unknown";
      if (!map[m]) map[m] = { month: m, count: 0, fobBbd: 0 };
      map[m].count += 1;
      map[m].fobBbd += sh.fob_foreign * (sh.exchange_rate || 1);
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [shipments]);

  const statusBreakdown = useMemo(() => {
    const counts = { draft: 0, reviewed: 0, locked: 0 };
    shipments.forEach((sh) => { if (sh.status in counts) counts[sh.status as keyof typeof counts]++; });
    return counts;
  }, [shipments]);

  const totalFobBbd = useMemo(() => shipments.reduce((s, sh) => s + sh.fob_foreign * (sh.exchange_rate || 1), 0), [shipments]);
  const avgXr = useMemo(() => {
    if (shipments.length === 0) return 0;
    return shipments.reduce((s, sh) => s + (sh.exchange_rate || 0), 0) / shipments.length;
  }, [shipments]);

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading reports…</div>;

  return (
    <div className="p-4 space-y-6 max-w-6xl">
      <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Import Costing Reports</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Package} label="Total Shipments" value={shipments.length.toString()} />
        <KpiCard icon={DollarSign} label="Total FOB (BBD)" value={fmt(totalFobBbd)} />
        <KpiCard icon={TrendingUp} label="Avg Exchange Rate" value={avgXr.toFixed(4)} />
        <KpiCard icon={Ship} label="Locked" value={`${statusBreakdown.locked} / ${shipments.length}`} />
      </div>

      {/* Monthly Volume Chart */}
      {monthlyVolume.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Monthly Shipment Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyVolume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="left" dataKey="count" fill="hsl(215 65% 55%)" name="Shipments" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="right" dataKey="fobBbd" fill="hsl(215 40% 75%)" name="FOB (BBD)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exchange Rate Trend */}
      {shipments.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Exchange Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={shipments.slice().sort((a, b) => a.date_received.localeCompare(b.date_received)).map(s => ({
                  date: s.date_received,
                  xr: s.exchange_rate,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="xr" stroke="hsl(215 65% 55%)" name="XR (BBD/USD)" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Landed Cost by Supplier */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">FOB Summary by Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-8">Supplier</TableHead>
                  <TableHead className="h-8 text-right">Shipments</TableHead>
                  <TableHead className="h-8 text-right">Total FOB (BBD)</TableHead>
                  <TableHead className="h-8 text-right">Total Invoice (BBD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierSummary.map((row) => (
                  <TableRow key={row.name} className="text-xs">
                    <TableCell className="py-1.5">{row.name}</TableCell>
                    <TableCell className="py-1.5 text-right">{row.count}</TableCell>
                    <TableCell className="py-1.5 text-right font-mono">{fmt(row.totalFobBbd)}</TableCell>
                    <TableCell className="py-1.5 text-right font-mono">{fmt(row.totalInvoiceBbd)}</TableCell>
                  </TableRow>
                ))}
                {supplierSummary.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-xs py-4 text-muted-foreground">No data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div><span className="font-mono font-semibold">{statusBreakdown.draft}</span> <span className="text-muted-foreground">Draft</span></div>
            <div><span className="font-mono font-semibold">{statusBreakdown.reviewed}</span> <span className="text-muted-foreground">Reviewed</span></div>
            <div><span className="font-mono font-semibold">{statusBreakdown.locked}</span> <span className="text-muted-foreground">Locked</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <Card>
    <CardContent className="pt-4 pb-3 px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: "hsl(215 65% 50% / 0.1)" }}>
          <Icon className="h-4 w-4" style={{ color: "hsl(215 65% 55%)" }} />
        </div>
        <div>
          <div className="text-[11px] text-muted-foreground">{label}</div>
          <div className="text-base font-semibold font-mono">{value}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default CostingsReportsPage;
