import { useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Field, fieldInputClass, formValues } from "./formFields";
import { NativeSelect } from "./formBits";
import { descendantIds } from "./reporting";
import type { Department } from "./useDepartments";
import { employeeDisplayName, useHrMutation, type Employee } from "./useEmployees";
import { isCurrentAssignment, type EmployeePosition, type Position } from "./usePositions";

interface DepartmentsPanelProps {
  departments: Department[];
  positions: Position[];
  assignments: EmployeePosition[];
  employees: Employee[];
}

const DepartmentsPanel = ({ departments, positions, assignments, employees }: DepartmentsPanelProps) => {
  const { toast } = useToast();
  const mutate = useHrMutation("departments");
  const [editing, setEditing] = useState<Department | "new" | null>(null);

  const byId = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments]);
  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Someone counts in a department when it is their own or one of their positions' departments.
  const peopleIn = useMemo(() => {
    const positionDept = new Map(positions.map((p) => [p.id, p.department_id]));
    const out = new Map<string, Set<string>>();
    const add = (deptId: string | null | undefined, employeeId: string) => {
      if (deptId) out.set(deptId, (out.get(deptId) ?? new Set()).add(employeeId));
    };
    for (const e of employees) if (e.status !== "terminated") add(e.department_id, e.id);
    for (const a of assignments) {
      const e = employeeById.get(a.employee_id);
      if (e && e.status !== "terminated" && isCurrentAssignment(a)) add(positionDept.get(a.position_id), a.employee_id);
    }
    return out;
  }, [employees, positions, assignments, employeeById]);

  const positionCount = (id: string) => positions.filter((p) => p.department_id === id && p.active).length;

  const current = editing && editing !== "new" ? editing : null;
  const blocked = current ? new Set([current.id, ...descendantIds(departments, current.id, (d) => d.id, (d) => d.parent_department_id)]) : new Set<string>();
  const parentOptions = {
    "": "— None (top level) —",
    ...Object.fromEntries(departments.filter((d) => !blocked.has(d.id)).map((d) => [d.id, d.name])),
  };
  const headOptions = {
    "": "— None —",
    ...Object.fromEntries(employees.filter((e) => e.status !== "terminated" || e.id === current?.head_employee_id).map((e) => [e.id, employeeDisplayName(e)])),
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const v = formValues(form);
    const values = {
      name: v.name,
      code: v.code,
      description: v.description,
      parent_department_id: v.parent_department_id,
      head_employee_id: v.head_employee_id,
      active: new FormData(form).has("active"),
    };
    try {
      await mutate.mutateAsync(current ? { update: { id: current.id, values } } : { insert: values });
      setEditing(null);
    } catch (error) {
      const message = (error as { code?: string; message: string }).code === "23505" ? "A department with that name already exists." : (error as Error).message;
      toast({ title: "Could not save department", description: message, variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Departments group positions and people. Positions and employees pick from this list.</p>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" /> Add department</Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Part of</TableHead>
              <TableHead>Head</TableHead>
              <TableHead>People</TableHead>
              <TableHead>Positions</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No departments yet. Add the first one.</TableCell></TableRow>
            ) : (
              departments.map((d) => {
                const head = d.head_employee_id ? employeeById.get(d.head_employee_id) : undefined;
                return (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setEditing(d)}>
                    <TableCell className="font-medium">
                      {d.name}
                      {d.code && <span className="ml-2 text-xs text-muted-foreground">{d.code}</span>}
                    </TableCell>
                    <TableCell>{d.parent_department_id ? byId.get(d.parent_department_id)?.name ?? "—" : "—"}</TableCell>
                    <TableCell>{head ? employeeDisplayName(head) : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{peopleIn.get(d.id)?.size ?? 0}</TableCell>
                    <TableCell>{positionCount(d.id)}</TableCell>
                    <TableCell><Badge variant={d.active ? "default" : "outline"}>{d.active ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{current ? "Edit department" : "Add department"}</DialogTitle></DialogHeader>
          <form id="department-form" key={current?.id ?? "new"} onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="dept-name"><Input id="dept-name" name="name" required defaultValue={current?.name} className={fieldInputClass} /></Field>
            <Field label="Code" htmlFor="dept-code"><Input id="dept-code" name="code" defaultValue={current?.code ?? ""} placeholder="e.g. OPS" /></Field>
            <Field label="Part of" htmlFor="dept-parent"><NativeSelect id="dept-parent" name="parent_department_id" defaultValue={current?.parent_department_id} options={parentOptions} /></Field>
            <Field label="Department head" htmlFor="dept-head"><NativeSelect id="dept-head" name="head_employee_id" defaultValue={current?.head_employee_id} options={headOptions} /></Field>
            <Field label="Description" htmlFor="dept-description" className="sm:col-span-2"><Textarea id="dept-description" name="description" rows={3} defaultValue={current?.description ?? ""} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={current?.active ?? true} /> Active department</label>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button type="submit" form="department-form" disabled={mutate.isPending}>Save department</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DepartmentsPanel;
