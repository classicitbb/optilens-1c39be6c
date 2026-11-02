import type { Employee } from "./useEmployees";

export interface OrgNode {
  employee: Employee;
  reports: OrgNode[];
}

/**
 * Builds the reporting tree from `manager_id`. Anyone whose manager is missing from `employees`
 * (no manager, or filtered out) becomes a root. Reporting loops are broken so every employee
 * appears exactly once. Roots with reports come first.
 */
export const buildOrgTree = (employees: Employee[]): OrgNode[] => {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const childrenOf = new Map<string, Employee[]>();
  const roots: Employee[] = [];

  for (const e of employees) {
    const manager = e.manager_id && e.manager_id !== e.id ? byId.get(e.manager_id) : undefined;
    if (!manager) roots.push(e);
    else childrenOf.set(manager.id, [...(childrenOf.get(manager.id) ?? []), e]);
  }

  const placed = new Set<string>();
  const build = (employee: Employee): OrgNode => {
    placed.add(employee.id);
    const reports = (childrenOf.get(employee.id) ?? []).filter((c) => !placed.has(c.id)).map(build);
    return { employee, reports };
  };

  const tree = roots.map(build);
  // Members of a reporting loop have no root above them; surface them rather than drop them.
  for (const e of employees) if (!placed.has(e.id)) tree.push(build(e));
  return tree.sort((a, b) => Number(b.reports.length > 0) - Number(a.reports.length > 0));
};

export const countDescendants = (node: OrgNode): number =>
  node.reports.reduce((sum, r) => sum + 1 + countDescendants(r), 0);

/** Ids of every node that has reports, for expand/collapse all. */
export const branchIds = (nodes: OrgNode[]): string[] =>
  nodes.flatMap((n) => (n.reports.length ? [n.employee.id, ...branchIds(n.reports)] : []));
