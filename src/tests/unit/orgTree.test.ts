import { describe, expect, it } from "vitest";
import { branchIds, buildOrgTree, countDescendants } from "@/features/admin/hr/orgTree";
import type { Employee } from "@/features/admin/hr/useEmployees";

const emp = (id: string, manager_id: string | null = null) => ({ id, manager_id, first_name: id, last_name: "X" }) as Employee;
const ids = (nodes: { employee: Employee }[]) => nodes.map((n) => n.employee.id);

describe("buildOrgTree", () => {
  it("nests reports under their manager, roots with reports first", () => {
    const tree = buildOrgTree([emp("solo"), emp("ceo"), emp("a", "ceo"), emp("b", "ceo"), emp("c", "a")]);
    expect(ids(tree)).toEqual(["ceo", "solo"]);
    expect(ids(tree[0].reports)).toEqual(["a", "b"]);
    expect(ids(tree[0].reports[0].reports)).toEqual(["c"]);
    expect(countDescendants(tree[0])).toBe(3);
    expect(branchIds(tree)).toEqual(["ceo", "a"]);
  });

  it("treats a manager outside the list as no manager", () => {
    expect(ids(buildOrgTree([emp("a", "gone")]))).toEqual(["a"]);
  });

  it("breaks reporting loops and self-management without dropping anyone", () => {
    const tree = buildOrgTree([emp("a", "b"), emp("b", "a"), emp("s", "s")]);
    const all: string[] = [];
    const walk = (nodes: typeof tree) => nodes.forEach((n) => (all.push(n.employee.id), walk(n.reports)));
    walk(tree);
    expect(all.sort()).toEqual(["a", "b", "s"]);
  });
});
