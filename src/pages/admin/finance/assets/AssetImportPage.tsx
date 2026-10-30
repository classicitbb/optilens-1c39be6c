import { useMemo, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router";
import { AlertTriangle, Building2, Download, Upload } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/useConfirm";
import { Field, money } from "@/features/admin/hr/formFields";
import { AssetsNav } from "@/features/admin/finance/assets/AssetsRoute";
import { toCsv } from "@/features/admin/finance/assets/engine";
import { IMPORT_COLUMNS, parseImport, totalsByAccount, type ImportRow } from "@/features/admin/finance/assets/importRows";
import { downloadText, useAssetClasses, useImportAssets, useRegister } from "@/features/admin/finance/assets/useAssets";

const CUT_OVER = "2026-10-31";
const cents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v.replace(/[$,\s]/g, "")) * 100));

const AssetImportPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { data: classes = [] } = useAssetClasses();
  const { data: register = [] } = useRegister();
  const importAssets = useImportAssets();
  const [asOf, setAsOf] = useState(CUT_OVER);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  // QBO balances typed in by the person importing, per QBO cost account.
  const [qbo, setQbo] = useState<Record<string, { cost: string; accum: string }>>({});

  const accountOfClass = useMemo(() => new Map(classes.map((c) => [c.name, c.qbo_cost_account])), [classes]);
  const totals = totalsByAccount(rows, accountOfClass);
  const errors = rows.filter((r) => r.errors.length);
  const reconciled = totals.length > 0 && totals.every((t) => {
    const q = qbo[t.account];
    return q && cents(q.cost) === Math.round(t.cost * 100) && cents(q.accum) === Math.round(t.accumDep * 100);
  });
  const alreadyImported = register.some((a) => a.legacy_qbo_account || a.book?.opening_as_of);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      setRows(parseImport(await file.text(), classes.map((c) => c.name)));
      setParseError(null);
    } catch (error) {
      setRows([]);
      setParseError((error as Error).message);
    }
  };

  const handleImport = async () => {
    if (!(await confirm({
      title: `Import ${rows.length} assets?`,
      description: `They go straight into service with their opening balances at ${asOf}. This can't be undone from the screen.`,
      confirmLabel: "Import",
    }))) return;
    try {
      const count = await importAssets.mutateAsync({ asOf, rows });
      toast({ title: `${count} assets imported`, description: "Download the reclass journal from Reports for the accountant." });
      navigate("/admin/finance/assets");
    } catch (error) {
      toast({ title: "Import failed; nothing was saved", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <AdminPageHeader icon={Building2} title="Import opening balances" tooltip="One-off load of the register from QBO's balances at the cut-over, with useful lives and dates from the accountant's schedule." />
      <AssetsNav />

      <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
        <li>Fill in the template: one row per asset. Cost and depreciation come from the asset's “Original cost” and “Depreciation” accounts in QBO at the cut-over.</li>
        <li>Upload it and fix anything marked in red. Amber items are worth a look but don't block.</li>
        <li>Type QBO's balance for each account below. The import unlocks when every total matches to the cent.</li>
      </ol>

      {alreadyImported && (
        <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Opening balances have already been imported. Importing again adds the assets a second time.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Cut-over date" htmlFor="as_of">
          <Input id="as_of" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-44" />
        </Field>
        <Field label="Import file (CSV)" htmlFor="file">
          <Input id="file" type="file" accept=".csv,text/csv" onChange={(e) => void handleFile(e)} className="w-72" />
        </Field>
        <Button variant="outline" size="sm" onClick={() => downloadText("asset-import-template.csv", toCsv([[...IMPORT_COLUMNS]]))}>
          <Download className="mr-1 h-4 w-4" /> Template
        </Button>
      </div>

      {parseError && <p className="text-sm text-destructive">{parseError}</p>}

      {rows.length > 0 && (
        <>
          <p className="text-sm">
            {fileName}: {rows.length} assets · {errors.length ? <span className="text-destructive">{errors.length} with problems</span> : "no blocking problems"}
          </p>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QBO account</TableHead>
                  <TableHead className="text-right">Cost in file</TableHead>
                  <TableHead className="text-right">Cost in QBO</TableHead>
                  <TableHead className="text-right">Depreciation in file</TableHead>
                  <TableHead className="text-right">Depreciation in QBO</TableHead>
                  <TableHead className="text-right">Book value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {totals.map((t) => {
                  const q = qbo[t.account] ?? { cost: "", accum: "" };
                  const set = (key: "cost" | "accum", value: string) => setQbo((prev) => ({ ...prev, [t.account]: { ...q, [key]: value } }));
                  const costOk = cents(q.cost) === Math.round(t.cost * 100);
                  const accumOk = cents(q.accum) === Math.round(t.accumDep * 100);
                  return (
                    <TableRow key={t.account}>
                      <TableCell className="font-medium">{t.account}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(t.cost)}</TableCell>
                      <TableCell className="text-right">
                        <Input aria-label={`QBO cost for ${t.account}`} inputMode="decimal" value={q.cost} onChange={(e) => set("cost", e.target.value)}
                          className={`ml-auto h-8 w-32 text-right ${q.cost && !costOk ? "border-destructive" : ""}`} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{money(t.accumDep)}</TableCell>
                      <TableCell className="text-right">
                        <Input aria-label={`QBO depreciation for ${t.account}`} inputMode="decimal" value={q.accum} onChange={(e) => set("accum", e.target.value)}
                          className={`ml-auto h-8 w-32 text-right ${q.accum && !accumOk ? "border-destructive" : ""}`} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{money(t.nbv)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div>
            <Button disabled={!!errors.length || !reconciled || importAssets.isPending} onClick={() => void handleImport()}>
              <Upload className="mr-1 h-4 w-4" /> Import {rows.length} assets
            </Button>
            {!reconciled && !errors.length && <span className="ml-3 text-sm text-muted-foreground">Enter QBO's balances; every total has to match.</span>}
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Line</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">Life (yrs)</TableHead>
                  <TableHead>Checks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.line} className={r.errors.length ? "bg-destructive/5" : undefined}>
                    <TableCell className="tabular-nums">{r.line}</TableCell>
                    <TableCell className="font-medium">{r.name}<div className="text-xs text-muted-foreground">{r.legacy_qbo_account}</div></TableCell>
                    <TableCell>{r.class}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number.isNaN(r.cost) ? "?" : money(r.cost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number.isNaN(r.opening_accum_dep) ? "?" : money(r.opening_accum_dep)}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number.isInteger(r.useful_life_months) ? +(r.useful_life_months / 12).toFixed(2) : "?"}</TableCell>
                    <TableCell className="text-xs">
                      {r.errors.map((e) => <div key={e} className="text-destructive">{e}</div>)}
                      {r.warnings.map((w) => <div key={w} className="text-amber-700 dark:text-amber-400">{w}</div>)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      {confirmDialog}
    </div>
  );
};

export default AssetImportPage;
