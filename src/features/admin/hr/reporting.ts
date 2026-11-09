import type { Employee } from "./useEmployees";
import type { EmployeeManager } from "./useDepartments";
import { isCurrentManager } from "./useDepartments";
import { isCurrentAssignment, type EmployeePosition, type Position } from "./usePositions";

/**
 * People who currently hold the position each of `employeeId`'s positions reports to, and who are
 * not already one of their managers. These are offered as one-click manager suggestions.
 */
export const suggestManagers = (
  employeeId: string,
  positions: Position[],
  assignments: EmployeePosition[],
  employees: Employee[],
  managers: EmployeeManager[],
): { employee: Employee; position: Position; assignment: EmployeePosition }[] => {
  const positionById = new Map(positions.map((p) => [p.id, p]));
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  const existing = new Set(managers.filter((m) => m.employee_id === employeeId && isCurrentManager(m)).map((m) => m.manager_id));
  const out: { employee: Employee; position: Position; assignment: EmployeePosition }[] = [];

  for (const own of assignments) {
    if (own.employee_id !== employeeId || !isCurrentAssignment(own)) continue;
    const parentId = positionById.get(own.position_id)?.reports_to_position_id;
    const parent = parentId ? positionById.get(parentId) : undefined;
    if (!parent) continue;
    for (const held of assignments) {
      const holder = employeeById.get(held.employee_id);
      if (held.position_id !== parent.id || !isCurrentAssignment(held) || !holder) continue;
      if (holder.id === employeeId || holder.status === "terminated" || existing.has(holder.id)) continue;
      if (out.some((s) => s.employee.id === holder.id)) continue;
      out.push({ employee: holder, position: positionById.get(own.position_id)!, assignment: own });
    }
  }
  return out;
};

/** Every id below `id` in a parent-pointer list, so a parent picker cannot offer a loop. */
export const descendantIds = <T,>(items: T[], id: string, idOf: (item: T) => string, parentOf: (item: T) => string | null): Set<string> => {
  const found = new Set<string>();
  let frontier = [id];
  while (frontier.length) {
    const next = items.filter((i) => parentOf(i) && frontier.includes(parentOf(i)!) && !found.has(idOf(i)) && idOf(i) !== id).map(idOf);
    next.forEach((n) => found.add(n));
    frontier = next;
  }
  return found;
};
