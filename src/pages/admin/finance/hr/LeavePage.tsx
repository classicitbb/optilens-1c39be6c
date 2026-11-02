import { useState } from "react";
import { Link } from "react-router";
import { CalendarDays, Plus } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import HelpTip from "@/help/HelpTip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { employeeDisplayName, useEmployees } from "@/features/admin/hr/useEmployees";
import { leaveBalance } from "@/features/admin/hr/leave/leaveBalance";
import { LeaveRequestForm, LeaveRequestTable, LeaveSettings } from "@/features/admin/hr/leave/LeaveComponents";
import { today, useLeaveAdjustments, useLeavePolicy, useLeaveRequests, useLeaveTypes } from "@/features/admin/hr/leave/useLeave";

const LeavePage = () => {
  const { data: employees = [] } = useEmployees();
  const { data: types = [] } = useLeaveTypes();
  const { data: policy } = useLeavePolicy();
  const { data: requests = [], isLoading } = useLeaveRequests();
  const { data: adjustments = [] } = useLeaveAdjustments();
  const [adding, setAdding] = useState(false);

  const pending = requests.filter((r) => r.status === "requested");
  const now = today();
  const upcoming = requests.filter((r) => r.status === "approved" && r.end_date >= now).sort((a, b) => a.start_date.localeCompare(b.start_date));
  const active = employees.filter((e) => e.status !== "terminated");
  const activeTypes = types.filter((t) => t.active);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <AdminPageHeader icon={CalendarDays} title="Leave" tooltip="Vacation, sick, maternity, paternity and unpaid leave. Unpaid and NIS-paid days come off pay in the payroll run for that month.">
        <Button size="sm" onClick={() => setAdding(true)} data-tour="hr-leave-record"><Plus className="mr-1 h-4 w-4" /> Record leave</Button>
        <HelpTip id="hr.leave.record" side="bottom" />
      </AdminPageHeader>

      <Tabs defaultValue="requests">
        <TabsList className="flex h-auto flex-wrap justify-start" data-tour="hr-leave-tabs">
          <TabsTrigger value="requests">Requests{pending.length > 0 && ` (${pending.length})`}</TabsTrigger>
          <TabsTrigger value="balances" data-tour="hr-leave-tab-balances">Balances</TabsTrigger>
          <TabsTrigger value="all">All leave</TabsTrigger>
          <TabsTrigger value="settings" data-tour="hr-leave-tab-settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <section className="space-y-2" data-tour="hr-leave-pending">
            <h2 className="text-sm font-medium">Awaiting approval</h2>
            {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : <LeaveRequestTable requests={pending} employees={employees} types={types} />}
          </section>
          <section className="space-y-2">
            <h2 className="text-sm font-medium">Current and upcoming</h2>
            <LeaveRequestTable requests={upcoming} employees={employees} types={types} />
          </section>
        </TabsContent>

        <TabsContent value="balances">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><span className="inline-flex items-center gap-1">Employee <HelpTip id="hr.leave.balances" /></span></TableHead>
                  {activeTypes.map((t) => <TableHead key={t.id} className="text-right">{t.name}{t.basis === "per_year" ? " (available)" : " (this year)"}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {policy && active.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium"><Link to={`/admin/finance/people/${e.id}`} className="hover:underline">{employeeDisplayName(e)}</Link></TableCell>
                    {activeTypes.map((t) => {
                      const b = leaveBalance(t, e, policy, requests, adjustments, now);
                      return <TableCell key={t.id} className="text-right tabular-nums">{t.basis === "per_year" ? b.available : b.taken}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="all"><LeaveRequestTable requests={requests} employees={employees} types={types} /></TabsContent>

        <TabsContent value="settings"><LeaveSettings types={types} policy={policy} /></TabsContent>
      </Tabs>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Record leave</DialogTitle></DialogHeader>
          <LeaveRequestForm employees={employees} types={types} policy={policy} onDone={() => setAdding(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeavePage;
