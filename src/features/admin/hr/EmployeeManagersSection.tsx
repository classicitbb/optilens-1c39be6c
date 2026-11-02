import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { day, Field, formValues } from "./formFields";
import { NativeSelect, Section, useSubmit } from "./formBits";
import { suggestManagers } from "./reporting";
import { isCurrentManager, RELATIONSHIP_LABELS, useEmployeeManagers } from "./useDepartments";
import { employeeDisplayName, useEmployees, useHrMutation } from "./useEmployees";
import { isCurrentAssignment, useEmployeePositions, usePositions } from "./usePositions";

/**
 * Everyone this person answers to. A person has one primary line manager (the default for
 * approvals and the org chart) and can have more: another line manager for a second position,
 * plus dotted-line or functional managers.
 */
const EmployeeManagersSection = ({ employeeId }: { employeeId: string }) => {
  const { toast } = useToast();
  const { data: employees = [] } = useEmployees();
  const { data: positions = [] } = usePositions();
  const { data: assignments = [] } = useEmployeePositions();
  const { data: allLinks = [] } = useEmployeeManagers();
  const mutate = useHrMutation("employee_managers");
  const submit = useSubmit();

  const links = allLinks.filter((l) => l.employee_id === employeeId).sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const positionOfAssignment = (assignmentId: string | null) => {
    const a = assignments.find((x) => x.id === assignmentId);
    return a ? positions.find((p) => p.id === a.position_id) : undefined;
  };
  const suggestions = suggestManagers(employeeId, positions, assignments, employees, allLinks);

  const hasPrimary = links.some((l) => l.is_primary && isCurrentManager(l));
  const heldPositions = assignments.filter((a) => a.employee_id === employeeId && isCurrentAssignment(a));
  const managerChoices = Object.fromEntries(
    employees.filter((e) => e.id !== employeeId && e.status !== "terminated").map((e) => [e.id, employeeDisplayName(e)]),
  );
  const positionChoices = {
    "": "All positions",
    ...Object.fromEntries(heldPositions.map((a) => [a.id, positions.find((p) => p.id === a.position_id)?.title ?? "Unknown position"])),
  };

  const fail = (error: unknown) => toast({ title: "Save failed", description: (error as Error).message, variant: "destructive" });

  /** Only one primary manager per person, so demote the current one first. */
  const makePrimary = async (id: string) => {
    const current = links.find((l) => l.is_primary && l.id !== id);
    if (current) await mutate.mutateAsync({ update: { id: current.id, values: { is_primary: false } } });
    await mutate.mutateAsync({ update: { id, values: { is_primary: true, relationship: "line" } } });
  };

  const add = async (values: Record<string, unknown>, primary: boolean) => {
    const created = (await mutate.mutateAsync({ insert: { ...values, employee_id: employeeId, is_primary: false } })) as { id: string };
    if (primary) await makePrimary(created.id);
  };

  return (
    <Section title="Managers">
      <p className="text-sm text-muted-foreground">
        The primary line manager approves leave and appears above this person on the org chart. Add more for a second position, a dotted-line or a functional reporting line.
      </p>
      <ul className="divide-y text-sm">
        {links.map((l) => {
          const manager = employeeById.get(l.manager_id);
          const position = positionOfAssignment(l.employee_position_id);
          return (
            <li key={l.id} className="space-y-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{manager ? employeeDisplayName(manager) : "Unknown employee"}</span>
                <Badge variant="outline">{RELATIONSHIP_LABELS[l.relationship]}</Badge>
                {l.is_primary && <Badge>Primary</Badge>}
                {!isCurrentManager(l) && <Badge variant="secondary">Ended</Badge>}
                <div className="ml-auto flex items-center gap-1">
                  {!l.is_primary && l.relationship === "line" && (
                    <Button variant="ghost" size="sm" onClick={() => makePrimary(l.id).catch(fail)}>Make primary</Button>
                  )}
                  <Button variant="ghost" size="icon" aria-label={`Remove ${manager ? employeeDisplayName(manager) : "manager"}`} onClick={() => mutate.mutate({ deleteId: l.id }, { onError: fail })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {position ? `For ${position.title}` : "All positions"}
                {(l.start_date || l.end_date) && ` · ${day(l.start_date)} – ${l.end_date ? day(l.end_date) : "present"}`}
              </div>
            </li>
          );
        })}
        {links.length === 0 && <li className="py-2 text-muted-foreground">No managers yet.</li>}
      </ul>

      {suggestions.length > 0 && (
        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <div className="text-xs font-medium text-muted-foreground">From the positions they hold</div>
          <ul className="space-y-1.5 text-sm">
            {suggestions.map((s) => (
              <li key={s.employee.id} className="flex flex-wrap items-center gap-2">
                <span>{employeeDisplayName(s.employee)}</span>
                <span className="text-xs text-muted-foreground">manages {s.position.title}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto"
                  disabled={mutate.isPending}
                  onClick={() =>
                    add({ manager_id: s.employee.id, relationship: "line", employee_position_id: s.assignment.id }, !hasPrimary).catch(fail)
                  }
                >
                  Add as manager
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={(event) => {
          const form = event.currentTarget;
          const v = formValues(form);
          const primary = new FormData(form).has("is_primary");
          delete v.is_primary;
          return submit(() => add(v, primary || (!hasPrimary && v.relationship === "line")), "Manager added")(event);
        }}
        className="grid gap-3 border-t pt-4 sm:grid-cols-4"
      >
        <Field label="Manager" htmlFor="manager_id" className="sm:col-span-2"><NativeSelect id="manager_id" name="manager_id" options={managerChoices} /></Field>
        <Field label="Relationship" htmlFor="relationship">
          <NativeSelect id="relationship" name="relationship" options={RELATIONSHIP_LABELS} />
        </Field>
        <Field label="For position" htmlFor="employee_position_id"><NativeSelect id="employee_position_id" name="employee_position_id" options={positionChoices} /></Field>
        <Field label="Start date" htmlFor="manager_start"><Input id="manager_start" name="start_date" type="date" /></Field>
        <Field label="End date" htmlFor="manager_end"><Input id="manager_end" name="end_date" type="date" /></Field>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="is_primary" /> Primary line manager</label>
        <div className="flex items-end sm:justify-end"><Button type="submit" disabled={mutate.isPending || Object.keys(managerChoices).length === 0}>Add manager</Button></div>
      </form>
    </Section>
  );
};

export default EmployeeManagersSection;
