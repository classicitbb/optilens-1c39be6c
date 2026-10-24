/**
 * Canonical lists are flat: each item may carry a `depth` (0 = top level). These helpers
 * turn that into a tree for rendering and back, so nesting survives without changing the
 * item shape that existing readers rely on.
 */
export interface DepthNode<T> {
  item: T;
  index: number;
  children: DepthNode<T>[];
}

/** Clamp depths so an item is never more than one level deeper than the one before it. */
export const normalizeDepths = (depths: number[]): number[] => {
  const out: number[] = [];
  depths.forEach((raw, index) => {
    const depth = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
    out.push(index === 0 ? 0 : Math.min(depth, out[index - 1] + 1));
  });
  return out;
};

export const nestByDepth = <T,>(items: T[], depths?: number[] | null): DepthNode<T>[] => {
  const normalized = normalizeDepths(items.map((_, index) => depths?.[index] ?? 0));
  const roots: DepthNode<T>[] = [];
  const stack: DepthNode<T>[] = [];
  items.forEach((item, index) => {
    const node: DepthNode<T> = { item, index, children: [] };
    const depth = normalized[index];
    stack.length = depth;
    if (depth === 0) roots.push(node);
    else stack[depth - 1].children.push(node);
    stack[depth] = node;
  });
  return roots;
};

/** Depths array to store, or undefined when the list has no nesting. */
export const depthsToStore = (depths: number[]): number[] | undefined =>
  depths.some((depth) => depth > 0) ? normalizeDepths(depths) : undefined;
