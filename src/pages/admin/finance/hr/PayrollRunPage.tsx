import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertTriangle, ArrowLeft, Calculator, Trash2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { employeeDisplayName, useEmployees, type Employee } from "@/features/admin/hr/useEmployees";
import { day, Field, fieldInputClass, formValues, money } from "@/features/admin/hr/formFields";
import {
  periodLabel,
  remittanceDue,
  RUN_STATUS_LABELS,
  usePayrollRun,
  usePayrollRunAction,
  useRecalculatePayrollRun,
  type Adjustment,
  type PayrollRun,
  type PayslipRow,
} from "@/features/admin/hr/payroll/usePayroll";

const sum = (rows: PayslipRow[], key: keyof PayslipRow) => rows.reduce((total, r) => total + Number(r[key]), 0);

const PayslipDialog = ({
  run,
  payslip,
  payslips,
  employee,
  onClose,
}: {
  run: PayrollRun;
  payslip: PayslipRow;
  payslips: PayslipRow[];
  employee: Employee | undefined;
  onClose: () => void;
}) => {
  const { toast } = useToast();
  const recalc = useRecalculatePayrollRun();
  const editable = run.status === "draft";

  const saveAdjustments = async (items: Adjustment[]) => {
    try {
      await recalc.mutateAsync({ run, payslips, adjustments: { employeeId: payslip.employee_id, items } });
    } catch (error) {
      toast({ title: "Could not update payslip", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formValues(form);
    const kind = v.kind === "deduction" ? "deduction" : "earning";
    void saveAdjustments([
      ...payslip.adjustments,
      { kind, label: v.label ?? "", amount: Number(v.amount), taxable: kind === "earning" && v.taxable === "on" },
    ]).then(() => form.reset());
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee ? employeeDisplayName(employee) : "Payslip"} · {periodLabel(run.period_start)}</DialogTitle>
        </DialogHeader>
        <dl className="divide-y text-sm">
          {payslip.lines.map((line, i) => (
            <div key={i} className="flex justify-between gap-3 py-1.5">
              <dt>
                {line.label}
                {line.code === "earning" && line.taxable === false && <span className="ml-2 text-xs text-muted-foreground">non-taxable</span>}
              </dt>
              <dd className="tabular-nums">{["base", "earning"].includes(line.code) ? money(line.amount) : `−${money(line.amount)}`}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-3 py-1.5 font-semibold">
            <dt>Net pay</dt>
            <dd className="tabular-nums">{money(payslip.net)}</dd>
          </div>
        </dl>
        {payslip.splits.length > 0 && (
          <div className="space-y-1 text-sm">
            <p className="font-medium">Paid out as</p>
            {payslip.splits.map((s, i) => (
              <div key={i} className="flex justify-between text-muted-foreground">
                <span>{s.label} ({s.method.replace("_", " ")})</span>
                <span className="tabular-nums">{money(s.amount)}</span>
              </div>
            ))}
          </div>
        )}
        {payslip.warnings.length > 0 && (
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400">
            {payslip.warnings.map((w) => <li key={w} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{w}</li>)}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Allowances {money(payslip.annual_allowances)}/yr · Rules: {payslip.rules_source ?? "—"}
        </p>

        <div className="space-y-2 border-t pt-3">
          <p className="text-sm font-medium">One-off items this month</p>
          {payslip.adjustments.length === 0 && <p className="text-sm text-muted-foreground">None.</p>}
          {payslip.adjustments.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Badge variant={a.kind === "earning" ? "default" : "secondary"}>{a.kind}</Badge>
              <span>{a.label}</span>
              <span className="ml-auto tabular-nums">{money(a.amount)}</span>
              {editable && (
                <Button variant="ghost" size="icon" aria-label={`Remove ${a.label}`} disabled={recalc.isPending}
                  onClick={() => void saveAdjustments(payslip.adjustments.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {editable && (
            <form onSubmit={handleAdd} className="grid gap-2 sm:grid-cols-[7rem_1fr_7rem]">
              <Field label="Type" htmlFor="adj-kind">
                <select id="adj-kind" name="kind" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="earning">Earning</option>
                  <option value="deduction">Deduction</option>
                </select>
              </Field>
              <Field label="Label" htmlFor="adj-label"><Input id="adj-label" name="label" required placeholder="e.g. Bonus" className={fieldInputClass} /></Field>
              <Field label="Amount" htmlFor="adj-amount"><Input id="adj-amount" name="amount" type="number" step="0.01" min="0.01" required className={fieldInputClass} /></Field>
              <label htmlFor="adj-taxable" className="flex items-center gap-2 text-sm sm:col-span-2">
                <input id="adj-taxable" name="taxable" type="checkbox" defaultChecked className="h-4 w-4" /> Taxable (earnings only)
              </label>
              <Button type="submit" size="sm" disabled={recalc.isPending}>Add</Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PayrollRunPage = () => {
  const { runId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error } = usePayrollRun(runId);
  const { data: employees = [] } = useEmployees();
  const recalc = useRecalculatePayrollRun();
  const action = usePayrollRunAction();
  const [openId, setOpenId] = useState<string | null>(null);

  if (error) return <p className="p-4 text-destructive">Could not load payroll run: {(error as Error).message}</p>;
  if (isLoading || !data) return <p className="p-4 text-muted-foreground">Loading…</p>;

  const { run, payslips } = data;
  const byId = new Map(employees.map((e) => [e.id, e]));
  const sorted = [...payslips].sort((a, b) => (byId.get(a.employee_id)?.last_name ?? "").localeCompare(byId.get(b.employee_id)?.last_name ?? ""));
  const included = new Set(payslips.map((p) => p.employee_id));
  const missing = employees.filter((e) => e.status !== "terminated" && !included.has(e.id));
  const open = payslips.find((p) => p.employee_id === openId);

  const perform = async (kind: "approve" | "paid" | "delete" | "recalc", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      if (kind === "recalc") {
        const skipped = await recalc.mutateAsync({ run, payslips });
        toast({ title: "Payroll recalculated", description: skipped.length ? `${skipped.length} employee(s) left out.` : undefined });
      } else {
        await action.mutateAsync({ runId: run.id, action: kind });
        if (kind === "delete") navigate("/admin/finance/payroll");
        else toast({ title: kind === "approve" ? "Payroll approved" : "Marked as paid" });
      }
    } catch (error) {
      toast({ title: "Action failed", description: (error as Error).message, variant: "destructive" });
    }
  };

  const busy = recalc.isPending || action.isPending;
  const totals = [
    { label: "Gross pay", value: sum(payslips, "gross") },
    { label: "NIS (employee)", value: sum(payslips, "nis") },
    { label: "PAYE", value: sum(payslips, "paye") },
    { label: "R&R levy", value: sum(payslips, "rr_levy") },
    { label: "Net pay", value: sum(payslips, "net") },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Link to="/admin/finance/payroll" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Payroll
      </Link>
      <AdminPageHeader icon={Calculator} title={`Payroll · ${periodLabel(run.period_start)}`} tooltip="Figures are worked out when the run is created or recalculated. Approving locks the run and takes loan repayments off loan balances.">
        <Badge variant="outline">{RUN_STATUS_LABELS[run.status]}</Badge>
        {run.status === "draft" && (
          <>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => void perform("delete", "Delete this draft payroll run?")}>Delete draft</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void perform("recalc")}>Recalculate</Button>
            <Button size="sm" disabled={busy || payslips.length === 0}
              onClick={() => void perform("approve", `Approve ${periodLabel(run.period_start)} payroll? It will be locked and loan balances reduced.`)}>
              Approve
            </Button>
          </>
        )}
        {run.status === "approved" && <Button size="sm" disabled={busy} onClick={() => void perform("paid", "Mark this payroll run as paid?")}>Mark paid</Button>}
      </AdminPageHeader>

      <p className="text-sm text-muted-foreground">
        Pay date {day(run.pay_date)} · NIS, PAYE and R&amp;R due by {day(remittanceDue(run.period_start))}
      </p>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {totals.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{t.label}</p>
              <p className="text-lg font-semibold tabular-nums">{money(t.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {missing.length > 0 && (
        <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Not in this run (no monthly salary for the month): {missing.map(employeeDisplayName).join(", ")}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">NIS</TableHead>
              <TableHead className="text-right">PAYE</TableHead>
              <TableHead className="text-right">R&amp;R</TableHead>
              <TableHead className="text-right">Other deductions</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No payslips in this run.</TableCell></TableRow>
            ) : (
              sorted.map((p) => {
                const e = byId.get(p.employee_id);
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setOpenId(p.employee_id)}>
                    <TableCell className="font-medium">
                      <button type="button" className="text-left" onClick={(ev) => { ev.stopPropagation(); setOpenId(p.employee_id); }}>
                        {e ? employeeDisplayName(e) : "Unknown employee"}
                      </button>
                      {p.warnings.length > 0 && <AlertTriangle className="ml-2 inline h-4 w-4 text-amber-600" aria-label="Has warnings" />}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.gross)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.nis)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.paye)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.rr_levy)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(p.other_deductions)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{money(p.net)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {sorted.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                {(["gross", "nis", "paye", "rr_levy", "other_deductions", "net"] as const).map((k) => (
                  <TableCell key={k} className="text-right tabular-nums">{money(sum(payslips, k))}</TableCell>
                ))}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      {open && <PayslipDialog run={run} payslip={open} payslips={payslips} employee={byId.get(open.employee_id)} onClose={() => setOpenId(null)} />}
    </div>
  );
};

export default PayrollRunPage;
