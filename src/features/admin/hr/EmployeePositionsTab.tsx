import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { day, Field, fieldInputClass, formValues } from "./formFields";
import { FormActions, FormDialog, NativeSelect, Section, useSubmit } from "./formBits";
import EmployeeManagersSection from "./EmployeeManagersSection";
import { employeeDisplayName, useEmployees, useHrMutation } from "./useEmployees";
import { isCurrentAssignment, openHrDocument, useEmployeePositions, usePositions } from "./usePositions";

const EmployeePositionsTab = ({ employeeId }: { employeeId: string }) => {
  const { toast } = useToast();
  const { data: positions = [] } = usePositions();
  const { data: allAssignments = [] } = useEmployeePositions();
  const { data: employees = [] } = useEmployees();
  const mutate = useHrMutation("employee_positions");
  const submit = useSubmit();

  const assignments = allAssignments.filter((a) => a.employee_id === employeeId);
  const held = new Set(assignments.map((a) => a.position_id));
  const available = Object.fromEntries(positions.filter((p) => p.active && !held.has(p.id)).map((p) => [p.id, `${p.title} · ${p.department}`]));
  const positionOf = (id: string) => positions.find((p) => p.id === id);
  /** A position already held can be swapped for any free one, or kept. */
  const optionsFor = (current: string) => ({
    ...Object.fromEntries(positions.filter((p) => p.id === current).map((p) => [p.id, `${p.title} · ${p.department}`])),
    ...available,
  });
  const reportsTo = (id: string | null) => {
    const parent = id ? positionOf(id) : null;
    if (!parent) return "—";
    const names = allAssignments
      .filter((a) => a.position_id === parent.id && isCurrentAssignment(a))
      .map((a) => employees.find((e) => e.id === a.employee_id))
      .filter((e): e is NonNullable<typeof e> => !!e && e.id !== employeeId)
      .map(employeeDisplayName);
    return `${parent.title} · ${parent.department}${names.length ? ` (${names.join(", ")})` : ""}`;
  };

  /** Only one primary position per person, so demote the current one first. */
  const setPrimary = async (id: string) => {
    const current = assignments.find((a) => a.is_primary && a.id !== id);
    if (current) await mutate.mutateAsync({ update: { id: current.id, values: { is_primary: false } } });
    await mutate.mutateAsync({ update: { id, values: { is_primary: true } } });
  };

  return (
    <div className="space-y-4">
      <Section
        title="Positions held"
        action={Object.keys(available).length > 0 ? (
          <FormDialog title="Add a position" description="A person can hold several positions, for example in two departments, each reporting to a different manager.">
            {(close) => (
              <form
                onSubmit={(event) => {
                  const form = event.currentTarget;
                  const v = formValues(form);
                  const makePrimary = new FormData(form).has("is_primary");
                  return submit(
                    async () => {
                      const created = (await mutate.mutateAsync({
                        insert: { employee_id: employeeId, position_id: v.position_id, allocation_percent: v.allocation_percent, start_date: v.start_date, end_date: v.end_date, is_primary: false },
                      })) as { id: string };
                      if (makePrimary || assignments.length === 0) await setPrimary(created.id);
                    },
                    "Position added",
                    close,
                  )(event);
                }}
                className="grid gap-3 sm:grid-cols-4"
              >
                <Field label="Position" htmlFor="position_id" className="sm:col-span-2"><NativeSelect id="position_id" name="position_id" options={available} /></Field>
                <Field label="Share of time (%)" htmlFor="allocation_percent"><Input id="allocation_percent" name="allocation_percent" type="number" min="1" max="100" step="0.01" className={fieldInputClass} /></Field>
                <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="is_primary" /> Primary position</label>
                <Field label="Start date" htmlFor="start_date"><Input id="start_date" name="start_date" type="date" /></Field>
                <Field label="End date" htmlFor="end_date"><Input id="end_date" name="end_date" type="date" /></Field>
                <FormActions submit="Add position" pending={mutate.isPending} />
              </form>
            )}
          </FormDialog>
        ) : undefined}
      >
        <ul className="divide-y text-sm">
          {assignments.map((a) => {
            const p = positionOf(a.position_id);
            return (
              <li key={a.id} className="space-y-1 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p?.title ?? "Unknown position"}</span>
                  {p && <Badge variant="outline">{p.department}</Badge>}
                  {a.is_primary && <Badge>Primary</Badge>}
                  {!isCurrentAssignment(a) && <Badge variant="secondary">Ended</Badge>}
                  {a.allocation_percent != null && <span className="text-muted-foreground">{Number(a.allocation_percent)}% of time</span>}
                  <div className="ml-auto flex items-center gap-1">
                    {!a.is_primary && (
                      <Button variant="ghost" size="sm" onClick={() => setPrimary(a.id).catch((e) => toast({ title: "Save failed", description: (e as Error).message, variant: "destructive" }))}>
                        Make primary
                      </Button>
                    )}
                    <FormDialog edit title="Edit position">
                      {(close) => (
                        <form
                          onSubmit={(event) => {
                            const v = formValues(event.currentTarget);
                            return submit(
                              () => mutate.mutateAsync({ update: { id: a.id, values: { position_id: v.position_id, allocation_percent: v.allocation_percent, start_date: v.start_date, end_date: v.end_date } } }),
                              "Position updated",
                              close,
                            )(event);
                          }}
                          className="grid gap-3 sm:grid-cols-4"
                        >
                          <Field label="Position" htmlFor="edit_position_id" className="sm:col-span-2"><NativeSelect id="edit_position_id" name="position_id" defaultValue={a.position_id} options={optionsFor(a.position_id)} /></Field>
                          <Field label="Share of time (%)" htmlFor="edit_allocation_percent"><Input id="edit_allocation_percent" name="allocation_percent" type="number" min="1" max="100" step="0.01" defaultValue={a.allocation_percent ?? ""} className={fieldInputClass} /></Field>
                          <div />
                          <Field label="Start date" htmlFor="edit_start_date"><Input id="edit_start_date" name="start_date" type="date" defaultValue={a.start_date ?? ""} /></Field>
                          <Field label="End date" htmlFor="edit_end_date"><Input id="edit_end_date" name="end_date" type="date" defaultValue={a.end_date ?? ""} /></Field>
                          <FormActions submit="Save changes" pending={mutate.isPending} />
                        </form>
                      )}
                    </FormDialog>
                    <Button variant="ghost" size="icon" aria-label={`Remove ${p?.title ?? "position"}`} onClick={() => mutate.mutate({ deleteId: a.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Reports to {reportsTo(p?.reports_to_position_id ?? null)} · {day(a.start_date)} – {a.end_date ? day(a.end_date) : "present"}
                </div>
                {p?.job_description && <details className="text-xs"><summary className="cursor-pointer">Job description</summary><p className="mt-1 whitespace-pre-wrap">{p.job_description}</p></details>}
                {p?.job_description_path && (
                  <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => openHrDocument(p.job_description_path!)}>
                    Open {p.job_description_file_name ?? "job description file"}
                  </Button>
                )}
              </li>
            );
          })}
          {assignments.length === 0 && <li className="py-2 text-muted-foreground">No positions yet. Define positions on the People page, then assign them here.</li>}
        </ul>
      </Section>

      <EmployeeManagersSection employeeId={employeeId} />
    </div>
  );
};

export default EmployeePositionsTab;
