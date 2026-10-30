import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowLeft, Building2, Download } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/useConfirm";
import { day, Field, formValues, money } from "@/features/admin/hr/formFields";
import { journalCsv, periodLabel, runJournal } from "@/features/admin/finance/assets/engine";
import {
  downloadText,
  periodEnd,
  RUN_STATUS_LABELS,
  toClassAccounts,
  useAssetClasses,
  useDepreciationRun,
  useDepreciationRunAction,
  useRegister,
} from "@/features/admin/finance/assets/useAssets";

const cents = (n: number) => Math.round(n * 100);

const DepreciationRunPage = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const { data, isLoading, error } = useDepreciationRun(runId);
  const { data: classes = [] } = useAssetClasses();
  const { data: register = [] } = useRegister();
  const action = useDepreciationRunAction();
  const [posting, setPosting] = useState(false);

  if (error) return <p className="p-4 text-destructive">Could not load run: {(error as Error).message}</p>;
  if (isLoading || !data || !classes.length) return <p className="p-4 text-muted-foreground">Loading…</p>;

  const { run, lines } = data;
  const assetById = new Map(register.map((a) => [a.id, a]));
  const classById = new Map(classes.map((c) => [c.id, c]));
  const journal = runJournal(
    lines.map((l) => ({ assetId: l.asset_id, classId: l.class_id, expenseTarget: l.expense_target, amount: l.amount })),
    classes.map(toClassAccounts),
    run.period,
  );
  const totalCents = lines.reduce((s, l) => s + cents(l.amount), 0);
  const journalNo = `DEP-${run.period.slice(0, 7)}`;
  const sorted = [...lines].sort((a, b) => (assetById.get(a.asset_id)?.tag ?? "").localeCompare(assetById.get(b.asset_id)?.tag ?? ""));

  const byClass = classes
    .map((c) => {
      const inClass = lines.filter((l) => l.class_id === c.id);
      return {
        name: c.name,
        cogs: inClass.filter((l) => l.expense_target === "cogs").reduce((s, l) => s + cents(l.amount), 0) / 100,
        overhead: inClass.filter((l) => l.expense_target === "overhead").reduce((s, l) => s + cents(l.amount), 0) / 100,
        count: inClass.length,
      };
    })
    .filter((c) => c.count > 0);

  const perform = async (kind: "recalculate" | "approve" | "delete", confirmOptions?: Parameters<typeof confirm>[0]) => {
    if (confirmOptions && !(await confirm(confirmOptions))) return;
    try {
      const result = await action.mutateAsync({ run, action: kind });
      if (kind === "delete") navigate("/admin/finance/assets/runs");
      else toast({ title: kind === "approve" ? "Run approved" : `Recalculated: ${result} assets charged` });
    } catch (error) {
      toast({ title: "Action failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const markPosted = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const v = formValues(event.currentTarget);
    try {
      await action.mutateAsync({ run, action: "posted", journalRef: v.journal_ref ?? journalNo });
      setPosting(false);
      toast({ title: "Marked as posted to QBO" });
    } catch (error) {
      toast({ title: "Could not mark posted", description: (error as Error).message, variant: "destructive" });
    }
  };

  const busy = action.isPending;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link to="/admin/finance/assets/runs" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Depreciation runs
      </Link>
      <AdminPageHeader icon={Building2} title={`Depreciation · ${periodLabel(run.period)}`} tooltip="Charges are worked out from each asset's approved total when the run is created or recalculated.">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{RUN_STATUS_LABELS[run.status]}</Badge>
          {run.status === "draft" && (
            <>
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void perform("delete", { title: "Delete this draft run?", confirmLabel: "Delete", destructive: true })}>Delete draft</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void perform("recalculate")}>Recalculate</Button>
              <Button size="sm" disabled={busy || lines.length === 0}
                onClick={() => void perform("approve", { title: `Approve ${periodLabel(run.period)} depreciation?`, description: `${money(totalCents / 100)} is added to the assets' depreciation and the run is locked.`, confirmLabel: "Approve" })}>
                Approve
              </Button>
            </>
          )}
          <Button size="sm" variant="outline" disabled={lines.length === 0} onClick={() => downloadText(`${journalNo}.csv`, journalCsv(journal, journalNo, periodEnd(run.period)))}>
            <Download className="mr-1 h-4 w-4" /> Journal CSV
          </Button>
          {run.status === "approved" && <Button size="sm" disabled={busy} onClick={() => setPosting(true)}>Mark posted</Button>}
        </div>
      </AdminPageHeader>

      <p className="text-sm text-muted-foreground">
        {lines.length} assets charged · total {money(totalCents / 100)}
        {run.approved_at && ` · approved ${day(run.approved_at)}`}
        {run.posted_at && ` · posted ${day(run.posted_at)} as ${run.journal_ref ?? "—"}`}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By class</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Class</TableHead><TableHead className="text-right">Cost of sales</TableHead><TableHead className="text-right">Overhead</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {byClass.map((c) => (
                  <TableRow key={c.name}>
                    <TableCell>{c.name} <span className="text-xs text-muted-foreground">({c.count})</span></TableCell>
                    <TableCell className="text-right tabular-nums">{money(c.cogs)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(c.overhead)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Journal for QBO ({journalNo}, dated {day(periodEnd(run.period))})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Account</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Credit</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {journal.map((j) => (
                  <TableRow key={`${j.account}-${j.debit ? "dr" : "cr"}`}>
                    <TableCell>{j.account}</TableCell>
                    <TableCell className="text-right tabular-nums">{j.debit ? money(j.debit) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{j.credit ? money(j.credit) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Asset</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>To</TableHead>
              <TableHead className="text-right">Charge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nothing to charge this month.</TableCell></TableRow>
            ) : (
              sorted.map((l) => {
                const a = assetById.get(l.asset_id);
                return (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">{a?.tag}</TableCell>
                    <TableCell><Link to={`/admin/finance/assets/${l.asset_id}`} className="hover:underline">{a?.name ?? "Unknown asset"}</Link></TableCell>
                    <TableCell>{classById.get(l.class_id)?.name}</TableCell>
                    <TableCell>{l.expense_target === "cogs" ? "Cost of sales" : "Overhead"}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(l.amount)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {sorted.length > 0 && (
            <TableFooter>
              <TableRow><TableCell colSpan={4}>Total</TableCell><TableCell className="text-right tabular-nums">{money(totalCents / 100)}</TableCell></TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <Dialog open={posting} onOpenChange={setPosting}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark posted to QBO</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Import or key the journal CSV into QBO first, then record its journal number here.</p>
          <form id="posted-form" onSubmit={markPosted}>
            <Field label="QBO journal number" htmlFor="journal_ref"><Input id="journal_ref" name="journal_ref" defaultValue={journalNo} /></Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosting(false)}>Cancel</Button>
            <Button type="submit" form="posted-form" disabled={busy}>Mark posted</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </div>
  );
};

export default DepreciationRunPage;
