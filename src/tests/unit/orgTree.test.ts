import { describe, expect, it } from "vitest";
import { branchIds, buildOrgTree, buildPositionTree, countDescendants } from "@/features/admin/hr/orgTree";
import type { Employee } from "@/features/admin/hr/useEmployees";
import type { EmployeePosition, Position } from "@/features/admin/hr/usePositions";

const emp = (id: string, manager_id: string | null = null) => ({ id, manager_id, first_name: id, last_name: "X" }) as Employee;
const ids = (nodes: { item: Employee }[]) => nodes.map((n) => n.item.id);

describe("buildOrgTree", () => {
  it("nests reports under their manager, roots with reports first", () => {
    const tree = buildOrgTree([emp("solo"), emp("ceo"), emp("a", "ceo"), emp("b", "ceo"), emp("c", "a")]);
    expect(ids(tree)).toEqual(["ceo", "solo"]);
    expect(ids(tree[0].reports)).toEqual(["a", "b"]);
    expect(ids(tree[0].reports[0].reports)).toEqual(["c"]);
    expect(countDescendants(tree[0])).toBe(3);
    expect(branchIds(tree, (e) => e.id)).toEqual(["ceo", "a"]);
  });

  it("treats a manager outside the list as no manager", () => {
    expect(ids(buildOrgTree([emp("a", "gone")]))).toEqual(["a"]);
  });

  it("breaks reporting loops and self-management without dropping anyone", () => {
    const tree = buildOrgTree([emp("a", "b"), emp("b", "a"), emp("s", "s")]);
    const all: string[] = [];
    const walk = (nodes: typeof tree) => nodes.forEach((n) => (all.push(n.item.id), walk(n.reports)));
    walk(tree);
    expect(all.sort()).toEqual(["a", "b", "s"]);
  });
});

const pos = (id: string, reports_to_position_id: string | null = null, headcount = 1) =>
  ({ id, title: id, department: "D", reports_to_position_id, headcount, active: true }) as Position;
const assign = (employee_id: string, position_id: string, end_date: string | null = null) =>
  ({ id: `${employee_id}-${position_id}`, employee_id, position_id, end_date }) as EmployeePosition;

describe("buildPositionTree", () => {
  it("places a person under every position they hold", () => {
    const tree = buildPositionTree(
      [pos("md"), pos("retail", "md"), pos("ops", "md")],
      [assign("ann", "retail"), assign("ann", "ops"), assign("bob", "md")],
      [emp("ann"), emp("bob")],
    );
    expect(tree[0].item.holders.map((h) => h.id)).toEqual(["bob"]);
    const seats = tree[0].reports.map((n) => [n.item.position.id, n.item.holders.map((h) => h.id)]);
    expect(seats).toEqual([["retail", ["ann"]], ["ops", ["ann"]]]);
  });

  it("leaves a seat vacant when its holder is out of scope or the assignment has ended", () => {
    const tree = buildPositionTree(
      [pos("a"), pos("b")],
      [assign("ann", "a"), assign("bob", "b", "2000-01-01")],
      [emp("bob")],
    );
    expect(tree.flatMap((n) => n.item.holders)).toEqual([]);
  });

  it("breaks position loops without dropping seats", () => {
    const tree = buildPositionTree([pos("a", "b"), pos("b", "a")], [], []);
    const all: string[] = [];
    const walk = (nodes: typeof tree) => nodes.forEach((n) => (all.push(n.item.position.id), walk(n.reports)));
    walk(tree);
    expect(all.sort()).toEqual(["a", "b"]);
  });
});
