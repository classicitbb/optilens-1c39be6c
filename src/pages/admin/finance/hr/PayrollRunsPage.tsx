import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Calculator, Plus } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { day, Field, fieldInputClass, formValues } from "@/features/admin/hr/formFields";
import { periodLabel, RUN_STATUS_LABELS, useCreatePayrollRun, usePayrollRuns, type PayrollRunStatus } from "@/features/admin/hr/payroll/usePayroll";

const statusVariant = (status: PayrollRunStatus) => (status === "paid" ? "default" : status === "approved" ? "secondary" : "outline");

const nextPeriod = (latest: string | undefined) => {
  const d = latest ? new Date(`${latest}T00:00:00Z`) : new Date();
  if (latest) d.setUTCMonth(d.getUTCMonth() + 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const PayrollRunsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: runs = [], isLoading, error } = usePayrollRuns();
  const createRun = useCreatePayrollRun();
  const [adding, setAdding] = useState(false);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const v = formValues(event.currentTarget);
    try {
      const { run, skipped } = await createRun.mutateAsync({ periodStart: `${v.period}-01`, payDate: v.pay_date });
      if (skipped.length) toast({ title: `${skipped.length} employee(s) left out`, description: "Open the run to see who and why." });
      setAdding(false);
      navigate(`/admin/finance/payroll/${run.id}`);
    } catch (error) {
      toast({ title: "Could not start payroll run", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <AdminPageHeader icon={Calculator} title="Payroll" tooltip="Monthly payroll runs: NIS, PAYE and R&R levy worked out from each employee's pay setup.">
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="mr-1 h-4 w-4" /> New payroll run
        </Button>
      </AdminPageHeader>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Pay date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approved</TableHead>
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
                  <TableCell>{day(r.approved_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>New payroll run</DialogTitle></DialogHeader>
          <form id="new-payroll-run" onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <Field label="Month" htmlFor="period">
              <Input id="period" name="period" type="month" required defaultValue={nextPeriod(runs[0]?.period_start)} className={fieldInputClass} />
            </Field>
            <Field label="Pay date" htmlFor="pay_date"><Input id="pay_date" name="pay_date" type="date" /></Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" form="new-payroll-run" disabled={createRun.isPending}>Calculate payroll</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollRunsPage;
