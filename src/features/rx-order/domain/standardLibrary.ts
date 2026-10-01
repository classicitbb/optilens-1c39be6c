// The standard shapes, parsed once (lazily) into the compact form the form keeps.
import { compactShape, parseOma, type ShapeData } from "./shape";
import { STD_SHAPES, type StandardShapeId } from "./standardShapes";

const cache = new Map<string, ShapeData>();

/** A standard shape's outline (240 points), or null for an unknown id. */
export function standardShape(id: string): ShapeData | null {
  const hit = cache.get(id);
  if (hit) return hit;
  const def = STD_SHAPES.find((s) => s.id === id);
  const parsed = def ? parseOma(def.raw) : null;
  if (!def || !parsed || !parsed.points.R.length) return null;
  const compact = compactShape(parsed);
  cache.set(id, compact);
  return compact;
}

export const standardShapeIds = (): StandardShapeId[] => STD_SHAPES.map((s) => s.id);
