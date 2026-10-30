import { useState } from "react";
import { Building2, Download } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { day, Field, money } from "@/features/admin/hr/formFields";
import { AssetsNav } from "@/features/admin/finance/assets/AssetsRoute";
import { journalCsv, reclassJournal, rollForward, toCsv, type RollForwardRow } from "@/features/admin/finance/assets/engine";
import { downloadText, toClassAccounts, useApprovedLines, useAssetClasses, useRegister } from "@/features/admin/finance/assets/useAssets";

// Reports start the day after the 31 Oct 2026 cut-over; earlier history lives in QBO.
const FIRST_DAY = "2026-11-01";
const today = () => new Date().toISOString().slice(0, 10);

const COLUMNS: { key: keyof Omit<RollForwardRow, "classId">; label: string }[] = [
  { key: "openingCost", label: "Cost at start" },
  { key: "additions", label: "Additions" },
  { key: "disposalsCost", label: "Disposals" },
  { key: "closingCost", label: "Cost at end" },
  { key: "openingAccum", label: "Depreciation at start" },
  { key: "depreciation", label: "Charge for period" },
  { key: "disposalsAccum", label: "On disposals" },
  { key: "closingAccum", label: "Depreciation at end" },
  { key: "openingNbv", label: "Book value at start" },
  { key: "closingNbv", label: "Book value at end" },
];

const AssetReportsPage = () => {
  const { data: register = [], isLoading } = useRegister();
  const { data: classes = [] } = useAssetClasses();
  const { data: lines = [] } = useApprovedLines();
  const [from, setFrom] = useState(FIRST_DAY);
  const [to, setTo] = useState(() => (today() < FIRST_DAY ? FIRST_DAY : today()));

  const className = new Map(classes.map((c) => [c.id, c.name]));
  const rfAssets = register.filter((a) => a.status !== "draft").map((a) => ({
    id: a.id,
    classId: a.class_id,
    cost: a.cost,
    acquiredOn: a.acquired_on,
    inServiceOn: a.in_service_on,
    disposedOn: a.disposed_on,
    openingAccumDep: a.book?.opening_accum_dep ?? 0,
    openingAsOf: a.book?.opening_as_of ?? null,
  }));
  const rows = from <= to ? rollForward(rfAssets, lines, from, to).sort((a, b) => (className.get(a.classId) ?? "").localeCompare(className.get(b.classId) ?? "")) : [];
  const totals = COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: rows.reduce((s, r) => s + Math.round(r[c.key] * 100), 0) / 100 }), {} as Record<string, number>);

  const exportRollForward = () =>
    downloadText(`asset-roll-forward-${from}-to-${to}.csv`, toCsv([
      ["Class", ...COLUMNS.map((c) => c.label)],
      ...rows.map((r) => [className.get(r.classId) ?? "", ...COLUMNS.map((c) => r[c.key].toFixed(2))]),
      ["Total", ...COLUMNS.map((c) => totals[c.key].toFixed(2))],
    ]));

  // The register at `to`: cost, depreciation through that month and book value per asset.
  const exportRegister = () => {
    const accumAt = (assetId: string, openingAsOf: string | null, opening: number) =>
      ((openingAsOf && openingAsOf <= to ? Math.round(opening * 100) : 0)
        + lines.filter((l) => l.assetId === assetId && l.period.slice(0, 7) <= to.slice(0, 7)).reduce((s, l) => s + Math.round(l.amount * 100), 0)) / 100;
    const held = register.filter((a) => a.status !== "draft" && (a.acquired_on ?? a.in_service_on ?? "") <= to && (!a.disposed_on || a.disposed_on > to));
    downloadText(`fixed-asset-register-${to}.csv`, toCsv([
      ["Tag", "Asset", "Class", "Purchased", "In service", "Useful life (months)", "Cost", "Depreciation to date", "Book value", "Depreciation to", "Serial", "Location"],
      ...held.map((a) => {
        const accum = accumAt(a.id, a.book?.opening_as_of ?? null, a.book?.opening_accum_dep ?? 0);
        return [a.tag, a.name, className.get(a.class_id) ?? "", a.acquired_on ?? "", a.in_service_on ?? "", a.book?.useful_life_months ?? "",
          a.cost.toFixed(2), accum.toFixed(2), (a.cost - accum).toFixed(2), a.expense_target === "cogs" ? "Cost of sales" : "Overhead", a.serial_no ?? "", a.location ?? ""];
      }),
    ]));
  };

  const legacy = register.filter((a) => a.legacy_qbo_account && a.book?.opening_as_of);
  const exportReclass = () => {
    const asOf = legacy[0].book!.opening_as_of!;
    const journal = reclassJournal(
      legacy.map((a) => ({ classId: a.class_id, legacyAccount: a.legacy_qbo_account!, cost: a.cost, accumDep: a.book!.opening_accum_dep })),
      classes.map(toClassAccounts),
    );
    downloadText(`asset-reclass-${asOf}.csv`, journalCsv(journal, `FA-RECLASS-${asOf}`, asOf));
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <AdminPageHeader icon={Building2} title="Asset reports" tooltip="The roll-forward the accounts need for each class (IAS 16), the register at a date, and the one-off reclass journal." />
      <AssetsNav />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" htmlFor="from"><Input id="from" type="date" min={FIRST_DAY} value={from} onChange={(e) => setFrom(e.target.value < FIRST_DAY ? FIRST_DAY : e.target.value)} className="w-44" /></Field>
        <Field label="To" htmlFor="to"><Input id="to" type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} className="w-44" /></Field>
        <Button variant="outline" size="sm" disabled={!rows.length} onClick={exportRollForward}><Download className="mr-1 h-4 w-4" /> Roll-forward CSV</Button>
        <Button variant="outline" size="sm" disabled={!register.length} onClick={exportRegister}><Download className="mr-1 h-4 w-4" /> Register at {day(to)}</Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Roll-forward, {day(from)} to {day(to)}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                {COLUMNS.map((c) => <TableHead key={c.key} className="text-right">{c.label}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={COLUMNS.length + 1} className="text-center text-muted-foreground">No assets in this period.</TableCell></TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.classId}>
                    <TableCell className="font-medium">{className.get(r.classId)}</TableCell>
                    {COLUMNS.map((c) => <TableCell key={c.key} className="text-right tabular-nums">{money(r[c.key])}</TableCell>)}
                  </TableRow>
                ))
              )}
            </TableBody>
            {rows.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  {COLUMNS.map((c) => <TableCell key={c.key} className="text-right tabular-nums">{money(totals[c.key])}</TableCell>)}
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Reclass journal (one-off)</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            Moves each imported asset's QBO “Original cost” and “Depreciation” balances into its class accounts, so QBO carries one cost and one
            depreciation account per class from here on. The accountant posts it once, after creating the class depreciation accounts.
          </p>
          <Button variant="outline" size="sm" disabled={!legacy.length || !classes.length} onClick={exportReclass}>
            <Download className="mr-1 h-4 w-4" /> Reclass journal CSV ({legacy.length} assets)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssetReportsPage;
