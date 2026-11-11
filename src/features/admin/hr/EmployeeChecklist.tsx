import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { checklistFor, type OutstandingItem } from "./checklist";
import { useChecklistContext, useChecklistDismissals } from "./useChecklist";
import type { Employee } from "./useEmployees";

const db = supabase as any;
const SNOOZE_DAYS = 7;
const isoDay = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

/** How many items on someone's list still need attention. Used by the People list. */
export const useOpenChecklistCount = () => {
  const { data: dismissals = [] } = useChecklistDismissals();
  const contextOf = useChecklistContext();
  return (employee: Employee) => checklistFor(employee, contextOf(employee.id), dismissals, isoDay()).open.length;
};

/**
 * Blank details for this person, with a way to fill each in, put it off for a week, or mark it
 * as not applying. Set-aside items stay one click away so a mistake can be undone.
 */
const EmployeeChecklist = ({ employee, onGo }: { employee: Employee; onGo: (item: OutstandingItem) => void }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: dismissals = [] } = useChecklistDismissals();
  const contextOf = useChecklistContext();
  const [expanded, setExpanded] = useState(true);
  const [showSetAside, setShowSetAside] = useState(false);
  const [busy, setBusy] = useState(false);

  const { open, later, ignored } = checklistFor(employee, contextOf(employee.id), dismissals, isoDay());
  const setAside = [...later, ...ignored];
  if (open.length === 0 && setAside.length === 0) return null;

  const run = async (action: () => PromiseLike<{ error: unknown }>) => {
    setBusy(true);
    try {
      const { error } = await action();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["hr", "checklist_dismissals"] });
    } catch (error) {
      toast({ title: "Could not update the list", description: (error as Error)?.message ?? "Has the latest database update been applied?", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const putAside = (key: string, until: string | null) =>
    run(() => db.from("employee_checklist_dismissals").upsert({ employee_id: employee.id, item_key: key, dismissed_until: until }, { onConflict: "employee_id,item_key" }));
  const restore = (id: string) => run(() => db.from("employee_checklist_dismissals").delete().eq("id", id));

  return (
    <Card className="px-3 py-2" data-testid="employee-checklist">
      <div className="flex items-center gap-2 text-sm">
        <button type="button" className="flex items-center gap-1.5 font-medium" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <ListChecks className="h-4 w-4" /> To complete{open.length > 0 && ` (${open.length})`}
        </button>
        {open.length === 0 && <span className="text-muted-foreground">Nothing outstanding.</span>}
        {setAside.length > 0 && (
          <Button variant="link" size="sm" className="ml-auto h-auto p-0 text-xs" onClick={() => setShowSetAside((v) => !v)}>
            {showSetAside ? "Hide" : "Show"} set aside ({setAside.length})
          </Button>
        )}
      </div>
      {expanded && (
        <ul className="mt-1 divide-y text-sm">
          {open.map((item) => (
            <li key={item.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
              <span>{item.label}</span>
              <span className="ml-auto flex gap-1">
                <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onGo(item)}>Fill in</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => void putAside(item.key, isoDay(SNOOZE_DAYS))} title={`Hide for ${SNOOZE_DAYS} days`}>Remind me later</Button>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => void putAside(item.key, null)} title="Stop asking for this on this person">Doesn't apply</Button>
              </span>
            </li>
          ))}
          {showSetAside && setAside.map((item) => (
            <li key={item.key} className="flex flex-wrap items-center gap-x-2 py-1 text-muted-foreground">
              <span>{item.label}</span>
              <span className="text-xs">{item.dismissal.dismissed_until === null ? "doesn't apply" : `hidden until ${item.dismissal.dismissed_until}`}</span>
              <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" disabled={busy} onClick={() => void restore(item.dismissal.id)}>Ask again</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default EmployeeChecklist;
