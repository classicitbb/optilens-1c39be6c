import { useState } from "react";
import { Download, UserRound } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { employeeDisplayName, type Employee } from "@/features/admin/hr/useEmployees";
import { day, money, STATUS_LABELS } from "@/features/admin/hr/formFields";
import { periodLabel } from "@/features/admin/hr/payroll/usePayroll";
import { buildPayslipPdf } from "@/features/admin/hr/payroll/archivePack";
import { LeaveBalanceCards, LeaveRequestForm } from "@/features/admin/hr/leave/LeaveComponents";
import { LEAVE_STATUS_LABELS, useLeaveAdjustments, useLeavePolicy, useLeaveRequests, useLeaveTypes } from "@/features/admin/hr/leave/useLeave";
import { EmployeeTaxPanel } from "@/features/admin/hr/tax/TaxComponents";
import { useCancelMyLeave, useMyEmployee, useMyPayslips, type MyPayslip } from "@/features/admin/hr/self/useMyHr";
import { PrivacyFilterProvider, Private, PrivacyToggle } from "@/features/admin/hr/privacy";

const savePdf = (slip: MyPayslip, employee: Employee) => {
  const bytes = buildPayslipPdf(slip.run, slip, employee);
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `payslip-${slip.run.period_start.slice(0, 7)}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

const PayslipsTab = ({ employee }: { employee: Employee }) => {
  const { data: payslips = [], isLoading } = useMyPayslips(employee.id);
  const [open, setOpen] = useState<MyPayslip | null>(null);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (payslips.length === 0) return <p className="text-sm text-muted-foreground">No payslips yet. They appear here once HR approves the month's payroll.</p>;

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Pay date</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">Deductions</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payslips.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <button type="button" className="font-medium underline-offset-4 hover:underline" onClick={() => setOpen(p)}>{periodLabel(p.run.period_start)}</button>
                </TableCell>
                <TableCell>{day(p.run.pay_date)}</TableCell>
                <TableCell className="text-right tabular-nums"><Private>{money(p.gross)}</Private></TableCell>
                <TableCell className="text-right tabular-nums"><Private>{money(Number(p.gross) - Number(p.net))}</Private></TableCell>
                <TableCell className="text-right font-medium tabular-nums"><Private>{money(p.net)}</Private></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" aria-label={`Download ${periodLabel(p.run.period_start)} payslip`} onClick={() => savePdf(p, employee)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>Payslip · {periodLabel(open.run.period_start)}</DialogTitle>
                <div><PrivacyToggle /></div>
              </DialogHeader>
              <Private block className="grid gap-4">
                <dl className="divide-y text-sm">
                  {open.lines.map((line, i) => (
                    <div key={i} className="flex justify-between gap-3 py-1.5">
                      <dt>{line.label}</dt>
                      <dd className="tabular-nums">{["base", "earning"].includes(line.code) ? money(line.amount) : `−${money(line.amount)}`}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 font-medium"><dt>Net pay</dt><dd className="tabular-nums">{money(open.net)}</dd></div>
                </dl>
                {open.splits.length > 0 && (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {open.splits.map((s, i) => <li key={i} className="flex justify-between"><span>{s.label} ({s.method.replace(/_/g, " ")})</span><span className="tabular-nums">{money(s.amount)}</span></li>)}
                  </ul>
                )}
              </Private>
              <Button variant="outline" onClick={() => savePdf(open, employee)}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const LeaveTab = ({ employee }: { employee: Employee }) => {
  const { toast } = useToast();
  const { data: types = [] } = useLeaveTypes();
  const { data: policy } = useLeavePolicy();
  const { data: requests = [] } = useLeaveRequests(employee.id);
  const { data: adjustments = [] } = useLeaveAdjustments(employee.id);
  const cancel = useCancelMyLeave();
  const [cancelling, setCancelling] = useState<string | null>(null);
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? "Leave";

  const confirmCancel = async () => {
    if (!cancelling) return;
    try {
      await cancel.mutateAsync(cancelling);
      toast({ title: "Request withdrawn" });
    } catch (error) {
      toast({ title: "Could not withdraw request", description: (error as Error).message, variant: "destructive" });
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="space-y-4">
      <LeaveBalanceCards employee={employee} types={types} policy={policy} requests={requests} adjustments={adjustments} />
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Request leave</CardTitle></CardHeader>
        <CardContent><LeaveRequestForm employees={[employee]} types={types} policy={policy} employeeId={employee.id} selfService /></CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">My requests</CardTitle></CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leave requested yet.</p>
          ) : (
            <ul className="divide-y text-sm">
              {requests.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 py-2">
                  <Badge variant={r.status === "approved" ? "default" : r.status === "requested" ? "secondary" : "outline"}>{LEAVE_STATUS_LABELS[r.status]}</Badge>
                  <span className="font-medium">{typeName(r.leave_type_id)}</span>
                  <span>{day(r.start_date)} – {day(r.end_date)}</span>
                  <span className="text-muted-foreground">{Number(r.days)} day{Number(r.days) === 1 ? "" : "s"}</span>
                  {r.decision_note && <span className="text-muted-foreground">· {r.decision_note}</span>}
                  {r.status === "requested" && (
                    <Button size="sm" variant="ghost" className="ml-auto" disabled={cancel.isPending} onClick={() => setCancelling(r.id)}>Withdraw</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={cancelling !== null} onOpenChange={(o) => !o && setCancelling(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Withdraw this leave request?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmCancel()}>Withdraw</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const ProfileTab = ({ employee }: { employee: Employee }) => (
  <Card>
    <CardContent className="p-4">
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {[
          ["Employee no.", employee.employee_no],
          ["Job title", employee.job_title],
          ["Department", employee.department],
          ["Status", STATUS_LABELS[employee.status]],
          ["Started", day(employee.hire_date)],
          ["Email", employee.email],
          ["Phone", employee.phone],
          ["Address", employee.address],
        ].map(([label, value]) => (
          <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{value || "—"}</dd></div>
        ))}
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">Something out of date? Tell HR and they'll correct it.</p>
    </CardContent>
  </Card>
);

const MyHrPage = () => {
  const { data: employee, isLoading, error } = useMyEmployee();

  return (
    <PrivacyFilterProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto max-w-5xl space-y-6 px-4 lg:px-8">
            <div className="flex items-center gap-3">
              <UserRound className="h-6 w-6 text-muted-foreground" />
              <h1 className="text-2xl font-bold">{employee ? employeeDisplayName(employee) : "My HR"}</h1>
              {employee && <div className="ml-auto"><PrivacyToggle /></div>}
            </div>
            {error ? (
              <p className="text-destructive">Could not load your record: {(error as Error).message}</p>
            ) : isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : !employee ? (
              <Card>
                <CardContent className="p-6 text-sm">
                  Your login isn't linked to an employee record yet. Ask HR to link it, using the email you signed in with.
                </CardContent>
              </Card>
            ) : (
              <Tabs defaultValue="payslips">
                <TabsList className="flex h-auto flex-wrap justify-start">
                  <TabsTrigger value="payslips">Payslips</TabsTrigger>
                  <TabsTrigger value="leave">Leave</TabsTrigger>
                  <TabsTrigger value="tax">Tax</TabsTrigger>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                </TabsList>
                <TabsContent value="payslips"><PayslipsTab employee={employee} /></TabsContent>
                <TabsContent value="leave"><LeaveTab employee={employee} /></TabsContent>
                <TabsContent value="tax"><Private block><EmployeeTaxPanel employee={employee} year={new Date().getFullYear()} readOnly /></Private></TabsContent>
                <TabsContent value="profile"><ProfileTab employee={employee} /></TabsContent>
              </Tabs>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </PrivacyFilterProvider>
  );
};

export default MyHrPage;
