import { describe, expect, it } from "vitest";
import { descendantIds, suggestManagers } from "@/features/admin/hr/reporting";
import type { EmployeeManager } from "@/features/admin/hr/useDepartments";
import type { Employee } from "@/features/admin/hr/useEmployees";
import type { EmployeePosition, Position } from "@/features/admin/hr/usePositions";

const emp = (id: string, status = "active") => ({ id, status, first_name: id, last_name: "X" }) as Employee;
const pos = (id: string, reports_to_position_id: string | null = null) => ({ id, title: id, reports_to_position_id }) as Position;
const assign = (employee_id: string, position_id: string, end_date: string | null = null) =>
  ({ id: `${employee_id}-${position_id}`, employee_id, position_id, end_date }) as EmployeePosition;
const link = (employee_id: string, manager_id: string, end_date: string | null = null) =>
  ({ id: `${employee_id}-${manager_id}`, employee_id, manager_id, end_date }) as EmployeeManager;

describe("suggestManagers", () => {
  const positions = [pos("md"), pos("ops", "md"), pos("retail", "md"), pos("clerk", "ops")];

  it("offers the holders of the position each of their positions reports to", () => {
    const assignments = [assign("ann", "md"), assign("bob", "retail"), assign("bob", "ops"), assign("cy", "clerk"), assign("dee", "ops")];
    const result = suggestManagers("bob", positions, assignments, [emp("ann"), emp("bob"), emp("cy"), emp("dee")], []);
    expect(result.map((s) => s.employee.id)).toEqual(["ann"]);
    expect(suggestManagers("cy", positions, assignments, [emp("bob"), emp("cy"), emp("dee")], []).map((s) => s.employee.id)).toEqual(["bob", "dee"]);
  });

  it("skips people who are already managers, have left, or no longer hold the seat", () => {
    const assignments = [assign("ann", "md"), assign("old", "md", "2020-01-01"), assign("gone", "md"), assign("bob", "ops")];
    const employees = [emp("ann"), emp("old"), emp("gone", "terminated"), emp("bob")];
    expect(suggestManagers("bob", positions, assignments, employees, [link("bob", "ann")])).toEqual([]);
    expect(suggestManagers("bob", positions, assignments, employees, []).map((s) => s.employee.id)).toEqual(["ann"]);
  });
});

describe("descendantIds", () => {
  it("collects every level below an item and never the item itself", () => {
    const items = [
      { id: "a", parent: null },
      { id: "b", parent: "a" },
      { id: "c", parent: "b" },
      { id: "x", parent: null },
    ];
    expect([...descendantIds(items, "a", (i) => i.id, (i) => i.parent)].sort()).toEqual(["b", "c"]);
    expect(descendantIds(items, "x", (i) => i.id, (i) => i.parent).size).toBe(0);
  });

  it("terminates on a loop", () => {
    const items = [{ id: "a", parent: "b" }, { id: "b", parent: "a" }];
    expect([...descendantIds(items, "a", (i) => i.id, (i) => i.parent)]).toEqual(["b"]);
  });
});
