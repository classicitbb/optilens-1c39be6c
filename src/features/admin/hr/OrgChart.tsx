import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { employeeDisplayName, type Employee } from "./useEmployees";
import { STATUS_LABELS } from "./formFields";
import OrgTreeView from "./OrgTreeView";
import { buildOrgTree, buildPositionTree, type PositionItem } from "./orgTree";
import type { EmployeePosition, Position } from "./usePositions";

interface ChartProps {
  /** Ids to keep at full strength (search matches); the rest are dimmed. Omit for no dimming. */
  highlightIds?: Set<string>;
  onOpen: (employee: Employee) => void;
}

const cardClass = "w-52 rounded-md border bg-card p-2.5 text-center shadow-sm transition-opacity";

/** Reporting lines from each employee's manager. Used until positions are defined. */
export const OrgChart = ({ employees, highlightIds, onOpen }: ChartProps & { employees: Employee[] }) => {
  const tree = useMemo(() => buildOrgTree(employees), [employees]);

  return (
    <OrgTreeView<Employee>
      nodes={tree}
      idOf={(e) => e.id}
      labelOf={employeeDisplayName}
      emptyText="No employees match."
      tourId="hr-people-orgchart"
      renderCard={(e) => (
        <div className={cn(cardClass, highlightIds && !highlightIds.has(e.id) && "opacity-40")}>
          <button type="button" onClick={() => onOpen(e)} className="block w-full truncate text-sm font-medium hover:underline" title={employeeDisplayName(e)}>
            {employeeDisplayName(e)}
          </button>
          <div className="truncate text-xs text-muted-foreground">{e.job_title ?? "No job title"}</div>
          <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1">
            {e.department && <Badge variant="outline" className="max-w-full truncate text-[10px]">{e.department}</Badge>}
            {e.status !== "active" && <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[e.status]}</Badge>}
          </div>
        </div>
      )}
    />
  );
};

/**
 * Reporting lines between positions. A person who holds several positions appears on each,
 * so working across departments or answering to two managers is just two seats.
 */
export const PositionChart = ({
  positions,
  assignments,
  employees,
  highlightIds,
  onOpen,
}: ChartProps & { positions: Position[]; assignments: EmployeePosition[]; employees: Employee[] }) => {
  const tree = useMemo(() => buildPositionTree(positions, assignments, employees), [positions, assignments, employees]);
  const rolesOf = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of assignments) counts.set(a.employee_id, (counts.get(a.employee_id) ?? 0) + 1);
    return counts;
  }, [assignments]);

  return (
    <OrgTreeView<PositionItem>
      nodes={tree}
      idOf={(i) => i.position.id}
      labelOf={(i) => i.position.title}
      emptyText="No positions match."
      tourId="hr-people-orgchart"
      renderCard={({ position, holders }) => {
        const vacancies = Math.max(position.headcount - holders.length, 0);
        const dimmed = highlightIds && !highlightIds.has(position.id) && !holders.some((h) => highlightIds.has(h.id));
        return (
          <div className={cn(cardClass, "w-56", dimmed && "opacity-40", !position.active && "border-dashed")}>
            <div className="truncate text-sm font-medium" title={position.title}>{position.title}</div>
            <Badge variant="outline" className="mt-1 max-w-full truncate text-[10px]">{position.department}</Badge>
            <ul className="mt-1.5 space-y-0.5 text-xs">
              {holders.map((h) => (
                <li key={h.id} className="truncate">
                  <button type="button" onClick={() => onOpen(h)} className="hover:underline" title={employeeDisplayName(h)}>{employeeDisplayName(h)}</button>
                  {(rolesOf.get(h.id) ?? 0) > 1 && <span className="ml-1 text-muted-foreground">· {rolesOf.get(h.id)} roles</span>}
                </li>
              ))}
              {vacancies > 0 && <li className="text-muted-foreground">{vacancies > 1 ? `${vacancies} vacancies` : "Vacant"}</li>}
            </ul>
          </div>
        );
      }}
    />
  );
};
