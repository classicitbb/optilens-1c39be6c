import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { Briefcase, Building2, List, Network, Plus, Search, Users } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { employeeDisplayName, useEmployees, useHrMutation, type Employee, type EmployeeStatus } from "@/features/admin/hr/useEmployees";
import { day, Field, fieldInputClass, formValues, STATUS_LABELS } from "@/features/admin/hr/formFields";
import { OrgChart, PositionChart } from "@/features/admin/hr/OrgChart";
import DepartmentsPanel from "@/features/admin/hr/DepartmentsPanel";
import PositionsPanel from "@/features/admin/hr/PositionsPanel";
import { NativeSelect } from "@/features/admin/hr/formBits";
import { departmentOptions, isCurrentManager, useDepartments, useEmployeeManagers } from "@/features/admin/hr/useDepartments";
import { useEmployeePositions, usePositions } from "@/features/admin/hr/usePositions";
import { useOpenChecklistCount } from "@/features/admin/hr/EmployeeChecklist";
import HelpTip from "@/help/HelpTip";

const statusVariant = (status: EmployeeStatus) => (status === "active" ? "default" : status === "on_leave" ? "secondary" : "outline");

const EmployeesPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: employees = [], isLoading, error } = useEmployees();
  const createEmployee = useHrMutation("employees");
  const openItems = useOpenChecklistCount();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EmployeeStatus | "all">("active");
  const [department, setDepartment] = useState("all");
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"list" | "chart" | "positions" | "departments">("list");
  const { data: positions = [] } = usePositions();
  const { data: assignments = [] } = useEmployeePositions();
  const { data: departments = [] } = useDepartments();
  const { data: managerLinks = [] } = useEmployeeManagers();

  // Someone who works across departments matches the filter through any position they hold.
  const heldDepartments = useMemo(() => {
    const byPosition = new Map(positions.map((p) => [p.id, p.department_id]));
    const out = new Map<string, Set<string>>();
    for (const a of assignments) {
      const dept = byPosition.get(a.position_id);
      if (dept) out.set(a.employee_id, (out.get(a.employee_id) ?? new Set()).add(dept));
    }
    return out;
  }, [positions, assignments]);

  const scoped = useMemo(
    () =>
      employees.filter(
        (e) =>
          (status === "all" || e.status === status) &&
          (department === "all" || e.department_id === department || !!heldDepartments.get(e.id)?.has(department)),
      ),
    [employees, status, department, heldDepartments],
  );
  const scopedPositions = useMemo(
    () => (department === "all" ? positions : positions.filter((p) => p.department_id === department)),
    [positions, department],
  );

  const term = search.trim().toLowerCase();
  const matchesSearch = (e: Employee) =>
    !term || [e.first_name, e.last_name, e.preferred_name, e.job_title, e.employee_no, e.email].some((v) => v?.toLowerCase().includes(term));
  const visible = useMemo(() => scoped.filter(matchesSearch), [scoped, term]); // eslint-disable-line react-hooks/exhaustive-deps
  // The chart keeps everyone in scope so reporting lines stay intact, and dims non-matches.
  const highlightIds = useMemo(
    () =>
      term
        ? new Set([...visible.map((e) => e.id), ...scopedPositions.filter((p) => p.title.toLowerCase().includes(term)).map((p) => p.id)])
        : undefined,
    [term, visible, scopedPositions],
  );

  // Primary line manager first, then the others with how they relate.
  const managersOf = useMemo(() => {
    const byId = new Map(employees.map((e) => [e.id, e]));
    const out = new Map<string, { id: string; name: string; note: string | null }[]>();
    for (const link of [...managerLinks].sort((a, b) => Number(b.is_primary) - Number(a.is_primary))) {
      const manager = byId.get(link.manager_id);
      if (!manager || !isCurrentManager(link)) continue;
      const note = link.is_primary ? null : link.relationship;
      out.set(link.employee_id, [...(out.get(link.employee_id) ?? []), { id: link.id, name: employeeDisplayName(manager), note }]);
    }
    return out;
  }, [employees, managerLinks]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const created = (await createEmployee.mutateAsync({ insert: formValues(event.currentTarget) })) as Employee;
      setAdding(false);
      navigate(`/admin/finance/people/${created.id}`);
    } catch (error) {
      toast({ title: "Could not add employee", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <AdminPageHeader icon={Users} title="People" tooltip="Employee records, pay setup and HR notes. Visible to admins and the office administrator.">
        <div className="flex items-center gap-1.5">
          <HelpTip id="hr.people.add" side="left" />
          <Button size="sm" onClick={() => setAdding(true)} data-tour="hr-people-add">
            <Plus className="mr-1 h-4 w-4" /> Add employee
          </Button>
        </div>
      </AdminPageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64" data-tour="hr-people-search">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Search employees" placeholder="Search name, title, number…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <HelpTip id="hr.people.search" />
        <div className="flex flex-wrap items-center gap-2" data-tour="hr-people-filters">
          <Select value={status} onValueChange={(v) => setStatus(v as EmployeeStatus | "all")}>
            <SelectTrigger className="h-9 w-32" aria-label="Status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-9 w-40" aria-label="Department"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <HelpTip id="hr.people.status" />
        </div>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "list" | "chart" | "positions" | "departments")} variant="outline" size="sm" className="flex-wrap sm:ml-auto" aria-label="View">
          <ToggleGroupItem value="list" aria-label="List view"><List className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">List</span></ToggleGroupItem>
          <ToggleGroupItem value="chart" aria-label="Org chart view"><Network className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Org chart</span></ToggleGroupItem>
          <ToggleGroupItem value="positions" aria-label="Positions view"><Briefcase className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Positions</span></ToggleGroupItem>
          <ToggleGroupItem value="departments" aria-label="Departments view"><Building2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Departments</span></ToggleGroupItem>
        </ToggleGroup>
        <span className="whitespace-nowrap text-sm text-muted-foreground">{visible.length} of {employees.length}</span>
      </div>

      {view === "departments" ? (
        <DepartmentsPanel departments={departments} positions={positions} assignments={assignments} employees={employees} />
      ) : view === "positions" ? (
        <PositionsPanel positions={positions} assignments={assignments} employees={employees} departments={departments} />
      ) : view === "chart" ? (
        error ? (
          <div className="rounded-md border p-6 text-center text-destructive">Could not load employees: {(error as Error).message}</div>
        ) : isLoading ? (
          <div className="rounded-md border p-6 text-center text-muted-foreground">Loading…</div>
        ) : positions.length > 0 ? (
          <PositionChart positions={scopedPositions} assignments={assignments} employees={scoped} highlightIds={highlightIds} onOpen={(e) => navigate(`/admin/finance/people/${e.id}`)} />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">Showing each person's manager. Define positions to chart people who work in several departments.</p>
            <OrgChart employees={scoped} highlightIds={highlightIds} onOpen={(e) => navigate(`/admin/finance/people/${e.id}`)} />
          </div>
        )
      ) : (

      <div className="overflow-x-auto rounded-md border" data-tour="hr-people-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Job title</TableHead>
              <TableHead className="hidden md:table-cell">Department</TableHead>
              <TableHead className="hidden lg:table-cell">Managers</TableHead>
              <TableHead className="hidden xl:table-cell">Hired</TableHead>
              <TableHead className="hidden sm:table-cell">To complete</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow><TableCell colSpan={7} className="text-center text-destructive">Could not load employees: {(error as Error).message}</TableCell></TableRow>
            ) : isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : visible.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No employees match.</TableCell></TableRow>
            ) : (
              visible.map((e) => (
                <TableRow key={e.id} className="cursor-pointer" onClick={() => navigate(`/admin/finance/people/${e.id}`)}>
                  <TableCell className="font-medium">
                    <a href={`/admin/finance/people/${e.id}`} onClick={(ev) => { ev.preventDefault(); navigate(`/admin/finance/people/${e.id}`); }}>
                      {employeeDisplayName(e)}
                    </a>
                    {e.employee_no && <span className="ml-2 text-xs text-muted-foreground">#{e.employee_no}</span>}
                  </TableCell>
                  <TableCell>{e.job_title ?? "—"}</TableCell>
                  <TableCell className="hidden md:table-cell">{e.department ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {managersOf.get(e.id)?.map((m, i) => (
                      <span key={m.id}>{i > 0 && ", "}{m.name}{m.note && <span className="text-xs text-muted-foreground"> ({m.note})</span>}</span>
                    )) ?? "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell">{day(e.hire_date)}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {openItems(e) > 0 ? <Badge variant="outline" title="Blank details to fill in, on the employee's page">{openItems(e)} to complete</Badge> : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><Badge variant={statusVariant(e.status)}>{STATUS_LABELS[e.status]}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add employee</DialogTitle></DialogHeader>
          <form id="add-employee" onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2">
            <Field label="First name" htmlFor="first_name"><Input id="first_name" name="first_name" required className={fieldInputClass} /></Field>
            <Field label="Last name" htmlFor="last_name"><Input id="last_name" name="last_name" required className={fieldInputClass} /></Field>
            <Field label="Job title" htmlFor="job_title"><Input id="job_title" name="job_title" /></Field>
            <Field label="Department" htmlFor="department_id"><NativeSelect id="department_id" name="department_id" options={departmentOptions(departments)} /></Field>
            <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" className={fieldInputClass} /></Field>
            <Field label="Hire date" htmlFor="hire_date"><Input id="hire_date" name="hire_date" type="date" /></Field>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            <Button type="submit" form="add-employee" disabled={createEmployee.isPending}>Add employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeesPage;
