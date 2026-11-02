import type { Employee } from "./useEmployees";
import type { EmployeePosition, Position } from "./usePositions";
import { isCurrentAssignment } from "./usePositions";

export interface TreeNode<T> {
  item: T;
  reports: TreeNode<T>[];
}

/**
 * Builds a tree from a parent pointer. Items whose parent is missing from `items` (no parent,
 * or filtered out) become roots. Loops are broken so every item appears exactly once.
 * Roots with reports come first.
 */
export const buildTree = <T,>(items: T[], idOf: (item: T) => string, parentOf: (item: T) => string | null): TreeNode<T>[] => {
  const ids = new Set(items.map(idOf));
  const childrenOf = new Map<string, T[]>();
  const roots: T[] = [];

  for (const item of items) {
    const parent = parentOf(item);
    if (!parent || parent === idOf(item) || !ids.has(parent)) roots.push(item);
    else childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), item]);
  }

  const placed = new Set<string>();
  const build = (item: T): TreeNode<T> => {
    placed.add(idOf(item));
    const reports = (childrenOf.get(idOf(item)) ?? []).filter((c) => !placed.has(idOf(c))).map(build);
    return { item, reports };
  };

  const tree = roots.map(build);
  // Members of a loop have no root above them; surface them rather than drop them.
  for (const item of items) if (!placed.has(idOf(item))) tree.push(build(item));
  return tree.sort((a, b) => Number(b.reports.length > 0) - Number(a.reports.length > 0));
};

export const buildOrgTree = (employees: Employee[]) => buildTree(employees, (e) => e.id, (e) => e.manager_id);

export interface PositionItem {
  position: Position;
  /** Current holders who are in scope. A position can have several, and a person can hold several positions. */
  holders: Employee[];
}

/** Position tree for the org chart. Holders outside `employees` (filtered out) leave the seat vacant. */
export const buildPositionTree = (positions: Position[], assignments: EmployeePosition[], employees: Employee[]) => {
  const byId = new Map(employees.map((e) => [e.id, e]));
  const holdersOf = new Map<string, Employee[]>();
  for (const a of assignments) {
    const employee = byId.get(a.employee_id);
    if (employee && isCurrentAssignment(a)) holdersOf.set(a.position_id, [...(holdersOf.get(a.position_id) ?? []), employee]);
  }
  const items = positions.map((position): PositionItem => ({ position, holders: holdersOf.get(position.id) ?? [] }));
  return buildTree(items, (i) => i.position.id, (i) => i.position.reports_to_position_id);
};

export const countDescendants = <T,>(node: TreeNode<T>): number =>
  node.reports.reduce((sum, r) => sum + 1 + countDescendants(r), 0);

/** Ids of every node that has reports, for expand/collapse all. */
export const branchIds = <T,>(nodes: TreeNode<T>[], idOf: (item: T) => string): string[] =>
  nodes.flatMap((n) => (n.reports.length ? [idOf(n.item), ...branchIds(n.reports, idOf)] : []));
