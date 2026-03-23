import { useMemo } from "react";
import { useShipments, useAllShipmentCharges } from "@/hooks/useShipments";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Ship, DollarSign, TrendingUp, Package } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { computeShipmentDerivedTotals, formatMoney } from "@/lib/importCostings";

const fmt = formatMoney;

const CostingsReportsPage = ({ embedded = false }: { embedded?: boolean }) => {
  const { data: shipments = [], isLoading } = useShipments();
  const { data: allCharges = [] } = useAllShipmentCharges();
  const { settings } = usePricingEngine();

  const chargesByShipment = useMemo(() => {
    return allCharges.reduce<Record<string, typeof allCharges>>((acc, charge) => {
      const shipmentId = charge.shipment_id;
      if (!shipmentId) return acc;
      acc[shipmentId] ??= [];
      acc[shipmentId].push(charge);
      return acc;
    }, {});
  }, [allCharges]);

  const shipmentMetrics = useMemo(() => {
    return shipments.map((shipment) => {
      const totals = computeShipmentDerivedTotals(shipment, chargesByShipment[shipment.id] ?? [], settings);
      return {
        shipment,
        totals,
      };
    });
  }, [chargesByShipment, settings, shipments]);

  const supplierSummary = useMemo(() => {
    const map: Record<string, { name: string; count: number; totalFobBbd: number; totalLandedBbd: number }> = {};
    shipmentMetrics.forEach(({ shipment, totals }) => {
      const key = shipment.supplier_name || shipment.supplier_id;
      if (!map[key]) map[key] = { name: shipment.supplier_name || "Unknown", count: 0, totalFobBbd: 0, totalLandedBbd: 0 };
      map[key].count += 1;
      map[key].totalFobBbd += totals.fobBbd;
      map[key].totalLandedBbd += totals.totalLandedBbd;
    });
    return Object.values(map).sort((a, b) => b.totalFobBbd - a.totalFobBbd);
  }, [shipmentMetrics]);

  const monthlyVolume = useMemo(() => {
    const map: Record<string, { month: string; count: number; fobBbd: number }> = {};
    shipmentMetrics.forEach(({ shipment, totals }) => {
      const month = shipment.date_received?.substring(0, 7) || "Unknown";
      if (!map[month]) map[month] = { month, count: 0, fobBbd: 0 };
      map[month].count += 1;
      map[month].fobBbd += totals.fobBbd;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [shipmentMetrics]);

  const multiplyingFactorTrend = useMemo(() => {
    const map: Record<string, { month: string; totalFob: number; totalLanded: number }> = {};
    shipmentMetrics.forEach(({ shipment, totals }) => {
      const month = shipment.date_received?.substring(0, 7) || "Unknown";
      if (!map[month]) map[month] = { month, totalFob: 0, totalLanded: 0 };
      map[month].totalFob += shipment.fob_foreign || 0;
      map[month].totalLanded += totals.totalLandedBbd;
    });

    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((entry) => ({
        month: entry.month,
        multiplyingFactor: entry.totalFob > 0 ? entry.totalLanded / entry.totalFob : 0,
      }));
  }, [shipmentMetrics]);

  const statusBreakdown = useMemo(() => {
    const counts = { draft: 0, reviewed: 0, locked: 0 };
    shipments.forEach((sh) => { if (sh.status in counts) counts[sh.status as keyof typeof counts]++; });
    return counts;
  }, [shipments]);

  const totals = useMemo(() => {
    return shipmentMetrics.reduce(
      (acc, { shipment, totals: metric }) => {
        acc.totalFobBbd += metric.fobBbd;
        acc.totalFobForeign += shipment.fob_foreign || 0;
        acc.totalLandedBbd += metric.totalLandedBbd;
        acc.totalLandedUsd += metric.totalLandedUsd;
        return acc;
      },
      { totalFobBbd: 0, totalFobForeign: 0, totalLandedBbd: 0, totalLandedUsd: 0 }
    );
  }, [shipmentMetrics]);

  const multiplyingFactor = totals.totalFobForeign > 0 ? totals.totalLandedBbd / totals.totalFobForeign : 0;
  const averageFobBbd = shipments.length > 0 ? totals.totalFobBbd / shipments.length : 0;
  const averageLandedUsd = shipments.length > 0 ? totals.totalLandedUsd / shipments.length : 0;

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Loading reports…</div>;

  return (
    <div className={`space-y-6 max-w-6xl ${embedded ? "" : "p-4"}`}>
      {!embedded && <AdminPageHeader icon={TrendingUp} title="Import Costing Reports" />}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Package} label="Total Shipments" value={shipments.length.toString()} />
        <KpiCard icon={DollarSign} label="Total FOB (BBD)" value={fmt(totals.totalFobBbd)} />
        <KpiCard icon={TrendingUp} label="Multiplying Factor" value={multiplyingFactor.toFixed(4)} />
        <KpiCard icon={Ship} label="Locked" value={`${statusBreakdown.locked} / ${shipments.length}`} />
      </div>

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

      {multiplyingFactorTrend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Multiplying Factor Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={multiplyingFactorTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="multiplyingFactor" stroke="hsl(215 65% 55%)" name="Multiplying Factor" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Import Costings Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <Metric label="Average FOB (BBD)" value={fmt(averageFobBbd)} />
            <Metric label="Average Landed Cost (USD)" value={fmt(averageLandedUsd)} />
            <Metric label="Core Multiplying Factor" value={multiplyingFactor.toFixed(4)} mono />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Landed Cost Summary by Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="h-8">Supplier</TableHead>
                  <TableHead className="h-8 text-right">Shipments</TableHead>
                  <TableHead className="h-8 text-right">Total FOB (BBD)</TableHead>
                  <TableHead className="h-8 text-right">Total Landed (BBD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierSummary.map((row) => (
                  <TableRow key={row.name} className="text-xs">
                    <TableCell className="py-1.5">{row.name}</TableCell>
                    <TableCell className="py-1.5 text-right">{row.count}</TableCell>
                    <TableCell className="py-1.5 text-right font-mono">{fmt(row.totalFobBbd)}</TableCell>
                    <TableCell className="py-1.5 text-right font-mono">{fmt(row.totalLandedBbd)}</TableCell>
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

const Metric = ({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) => (
  <div className="rounded-lg border border-border bg-muted/40 p-3">
    <div className="text-[11px] text-muted-foreground">{label}</div>
    <div className={mono ? "mt-1 font-mono text-base font-semibold" : "mt-1 text-base font-semibold"}>{value}</div>
  </div>
);

export default CostingsReportsPage;
