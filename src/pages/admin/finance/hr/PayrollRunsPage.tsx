import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Calculator, Plus } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { employeeDisplayName } from "@/features/admin/hr/useEmployees";
import { day, Field, fieldInputClass } from "@/features/admin/hr/formFields";
import HelpTip from "@/help/HelpTip";
import {
  payDateFor,
  periodLabel,
  RUN_STATUS_LABELS,
  useCreatePayrollRun,
  usePayableEmployees,
  usePayrollRuns,
  type PayrollRunStatus,
} from "@/features/admin/hr/payroll/usePayroll";

const statusVariant = (status: PayrollRunStatus) => (status === "paid" ? "default" : status === "approved" ? "secondary" : "outline");

const nextPeriod = (latest: string | undefined) => {
  const d = latest ? new Date(`${latest}T00:00:00Z`) : new Date();
  if (latest) d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const NewRunDialog = ({ onClose, defaultMonth }: { onClose: () => void; defaultMonth: string }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createRun = useCreatePayrollRun();
  const [month, setMonth] = useState(defaultMonth);
  const [payDate, setPayDate] = useState<string | null>(null);
  // Everyone is paid unless unticked.
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const periodStart = `${month || defaultMonth}-01`;
  const { data: people = [], isLoading } = usePayableEmployees(periodStart);

  const selected = people.filter((p) => !unticked.has(p.employee.id));
  // Default pay date: the most common pay day among the people being paid.
  const suggested = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of people) {
      if (p.payDay && !unticked.has(p.employee.id)) counts.set(p.payDay, (counts.get(p.payDay) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    return top ? payDateFor(periodStart, top[0]) : "";
  }, [people, unticked, periodStart]);

  const toggle = (id: string, on: boolean) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      if (on) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const { run, skipped } = await createRun.mutateAsync({
        periodStart,
        payDate: (payDate ?? suggested) || null,
        excludedIds: people.filter((p) => unticked.has(p.employee.id)).map((p) => p.employee.id),
      });
      if (skipped.length) toast({ title: `${skipped.length} employee(s) left out`, description: "Open the run to see who and why." });
      onClose();
      navigate(`/admin/finance/payroll/${run.id}`);
    } catch (error) {
      toast({ title: "Could not start payroll run", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-xl flex-col">
        <DialogHeader><DialogTitle>New payroll run</DialogTitle></DialogHeader>
        <form id="new-payroll-run" onSubmit={handleCreate} className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Month" htmlFor="period" tip="hr.payroll.month">
              <Input id="period" type="month" required value={month} onChange={(e) => setMonth(e.target.value)} className={fieldInputClass} />
            </Field>
            <Field label="Pay date" htmlFor="pay_date" tip="hr.payroll.payDate">
              <Input id="pay_date" type="date" value={payDate ?? suggested} onChange={(e) => setPayDate(e.target.value)} />
            </Field>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Employees to pay <span className="font-normal text-muted-foreground">({selected.length} of {people.length})</span>
              </span>
              <span className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setUnticked(new Set())}>All</Button>
                <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setUnticked(new Set(people.map((p) => p.employee.id)))}>None</Button>
              </span>
            </div>
            <ul className="min-h-0 flex-1 divide-y overflow-y-auto rounded-md border text-sm" aria-label="Employees to pay">
              {isLoading ? (
                <li className="p-3 text-muted-foreground">Loading…</li>
              ) : people.length === 0 ? (
                <li className="p-3 text-muted-foreground">No current employees.</li>
              ) : (
                people.map(({ employee, payDay }) => (
                  <li key={employee.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-1.5 hover:bg-muted/50">
                      <Checkbox
                        checked={!unticked.has(employee.id)}
                        onCheckedChange={(v) => toggle(employee.id, v === true)}
                        aria-label={`Pay ${employeeDisplayName(employee)}`}
                      />
                      <span className="flex-1 truncate">{employeeDisplayName(employee)}</span>
                      <span className="text-xs text-muted-foreground">{payDay ? `pay day ${payDay}` : "no pay day"}</span>
                    </label>
                  </li>
                ))
              )}
            </ul>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="new-payroll-run" disabled={createRun.isPending || selected.length === 0}>Calculate payroll</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PayrollRunsPage = () => {
  const navigate = useNavigate();
  const { data: runs = [], isLoading, error } = usePayrollRuns();
  const [adding, setAdding] = useState(false);

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <AdminPageHeader icon={Calculator} title="Payroll" tooltip="Monthly payroll runs: NIS, PAYE and R&R levy worked out from each employee's pay setup.">
        <div className="flex items-center gap-1.5">
          <HelpTip id="hr.payroll.newRun" side="left" />
          <Button size="sm" onClick={() => setAdding(true)} data-tour="hr-payroll-new">
            <Plus className="mr-1 h-4 w-4" /> New payroll run
          </Button>
        </div>
      </AdminPageHeader>

      <div className="overflow-x-auto rounded-md border" data-tour="hr-payroll-list">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Pay date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Approved</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow><TableCell colSpan={4} className="text-center text-destructive">Could not load payroll runs: {(error as Error).message}</TableCell></TableRow>
            ) : isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : runs.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No payroll runs yet.</TableCell></TableRow>
            ) : (
              runs.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate(`/admin/finance/payroll/${r.id}`)}>
                  <TableCell className="font-medium">
                    <a href={`/admin/finance/payroll/${r.id}`} onClick={(ev) => { ev.preventDefault(); navigate(`/admin/finance/payroll/${r.id}`); }}>
                      {periodLabel(r.period_start)}
                    </a>
                  </TableCell>
                  <TableCell>{day(r.pay_date)}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{RUN_STATUS_LABELS[r.status]}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell">{day(r.approved_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {adding && <NewRunDialog onClose={() => setAdding(false)} defaultMonth={nextPeriod(runs[0]?.period_start)} />}
    </div>
  );
};

export default PayrollRunsPage;
