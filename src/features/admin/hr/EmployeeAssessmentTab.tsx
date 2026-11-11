import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { inAppConfirm } from "@/lib/inAppDialog";
import { day, Field, fieldInputClass, formValues } from "./formFields";
import { FormActions, FormDialog, Section, useSubmit } from "./formBits";
import { KOLBE_MODES, kolbeZone, type EmployeeAssessment } from "./useAssessments";
import { useEmployeeRows, useHrMutation } from "./useEmployees";

const today = () => new Date().toISOString().slice(0, 10);

const ScoreBars = ({ a }: { a: EmployeeAssessment }) => (
  <ul className="space-y-3">
    {KOLBE_MODES.map((m) => (
      <li key={m.key} className="space-y-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className="font-medium">{m.label}</span>
          <span className="tabular-nums">{a[m.key]} <span className="text-xs text-muted-foreground">· {kolbeZone(a[m.key])}</span></span>
        </div>
        <div className="h-2 rounded-full bg-muted" role="img" aria-label={`${m.label} ${a[m.key]} of 10`}>
          <div className="h-2 rounded-full bg-primary" style={{ width: `${a[m.key] * 10}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{m.hint}</p>
      </li>
    ))}
  </ul>
);

const EmployeeAssessmentTab = ({ employeeId, readOnly = false }: { employeeId: string; readOnly?: boolean }) => {
  const { toast } = useToast();
  const { data: rows = [] } = useEmployeeRows<EmployeeAssessment>("employee_assessments", employeeId, "assessed_on");
  const mutate = useHrMutation("employee_assessments");
  const submit = useSubmit();
  const [latest, ...history] = rows;

  const remove = async (a: EmployeeAssessment) => {
    if (!(await inAppConfirm(`Delete the Kolbe A result from ${day(a.assessed_on)}? This cannot be undone.`, { confirmLabel: "Delete", destructive: true }))) return;
    try {
      await mutate.mutateAsync({ deleteId: a.id });
    } catch (error) {
      toast({ title: "Could not delete result", description: (error as Error).message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Section
        title="Kolbe A Index"
        action={!readOnly ? (
          <FormDialog title="Record a result" description="Kolbe scores come from the employee's Kolbe A Index report. Enter the four mode scores (1-10) as printed on it.">
            {(close) => (
          <form
            onSubmit={(event) => {
              const v = formValues(event.currentTarget);
              return submit(
                () =>
                  mutate.mutateAsync({
                    insert: {
                      employee_id: employeeId,
                      assessed_on: v.assessed_on,
                      fact_finder: Number(v.fact_finder),
                      follow_thru: Number(v.follow_thru),
                      quick_start: Number(v.quick_start),
                      implementor: Number(v.implementor),
                      notes: v.notes,
                    },
                  }),
                "Result recorded",
                close,
              )(event);
            }}
            className="grid gap-3 sm:grid-cols-4"
          >
            {KOLBE_MODES.map((m) => (
              <Field key={m.key} label={m.label} htmlFor={m.key}>
                <Input id={m.key} name={m.key} type="number" min={1} max={10} step={1} required className={fieldInputClass} />
              </Field>
            ))}
            <Field label="Assessed on" htmlFor="assessed_on"><Input id="assessed_on" name="assessed_on" type="date" defaultValue={today()} required /></Field>
            <Field label="Notes" htmlFor="notes" className="sm:col-span-4"><Textarea id="notes" name="notes" rows={2} placeholder="Optional context, e.g. how the result shapes their role" /></Field>
            <FormActions submit="Save result" pending={mutate.isPending} />
          </form>
            )}
          </FormDialog>
        ) : undefined}
      >
        {latest ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">Latest</Badge>
              <span>Assessed {day(latest.assessed_on)}</span>
              {!readOnly && (
                <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" aria-label="Delete latest result" onClick={() => remove(latest)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
            <ScoreBars a={latest} />
            {latest.notes && <p className="whitespace-pre-wrap text-sm">{latest.notes}</p>}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{readOnly ? "No Kolbe A result has been recorded for you yet." : "No Kolbe A result recorded yet."}</p>
        )}
      </Section>

      {history.length > 0 && (
        <Section title="Earlier results">
          <ul className="divide-y text-sm">
            {history.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
                <span className="font-medium">{day(a.assessed_on)}</span>
                {KOLBE_MODES.map((m) => <span key={m.key} className="text-muted-foreground">{m.label} <span className="tabular-nums text-foreground">{a[m.key]}</span></span>)}
                {!readOnly && (
                  <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" aria-label={`Delete result from ${day(a.assessed_on)}`} onClick={() => remove(a)}><Trash2 className="h-4 w-4" /></Button>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

export default EmployeeAssessmentTab;
