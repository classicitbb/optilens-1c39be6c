// The lens combination graph — ported from the engine's valid(), options() and
// repairSide(). The catalogue is a list of (material, design, colour)
// combinations that actually exist on the account's pricelist; every pick
// narrows the other two axes, and a pick that leaves no combination is repaired
// by dropping the oldest conflicting choice. Pure: the catalogue comes in as
// data (embed/innovations-catalog.ts builds it from the alias feed).
//
// These narrow what is OFFERED by what is made. They never look at the
// prescription or the frame — that is advice (domain/advice.ts), not a limit.
export interface Combo {
  /** Material id. */
  m: string;
  /** Design id. */
  d: string;
  /** Colour id. */
  c: string;
}

export interface Triple {
  m: string;
  d: string;
  c: string;
}

export interface CatalogDesign {
  id: string;
  /** "sv" single vision, "mf" multifocal / progressive. */
  v: "sv" | "mf";
}

export interface LensCatalog {
  combos: readonly Combo[];
  designs: readonly CatalogDesign[];
}

export type Vision = "sv" | "mf";

/** The combinations valid for this vision type (a design belongs to one). */
export function comboPool(catalog: LensCatalog, vision: Vision): Combo[] {
  const visionOf = new Map(catalog.designs.map((d) => [d.id, d.v]));
  return catalog.combos.filter((cmb) => visionOf.get(cmb.d) === vision);
}

const unique = (xs: string[]) => [...new Set(xs)];

export interface ComboOptions {
  mats: string[];
  designs: string[];
  cols: string[];
  pool: Combo[];
}

/**
 * What each axis may still offer given what is already chosen on this side:
 * a material list is narrowed by the chosen design and colour, and so on.
 * An unset axis (empty string) does not narrow anything.
 */
export function comboOptions(catalog: LensCatalog, vision: Vision, t: Triple): ComboOptions {
  const pool = comboPool(catalog, vision);
  const okM = (c: Combo) => (!t.d || c.d === t.d) && (!t.c || c.c === t.c);
  const okD = (c: Combo) => (!t.m || c.m === t.m) && (!t.c || c.c === t.c);
  const okC = (c: Combo) => (!t.m || c.m === t.m) && (!t.d || c.d === t.d);
  return {
    mats: unique(pool.filter(okM).map((c) => c.m)),
    designs: unique(pool.filter(okD).map((c) => c.d)),
    cols: unique(pool.filter(okC).map((c) => c.c)),
    pool,
  };
}

/** Whether some real combination is consistent with everything chosen so far. */
export const tripleFits = (pool: readonly Combo[], t: Triple): boolean =>
  pool.some((c) => (!t.m || c.m === t.m) && (!t.d || c.d === t.d) && (!t.c || c.c === t.c));

export interface Repair {
  triple: Triple;
  /** What had to be cleared, so the form can say so; null when nothing was. */
  cleared: "material" | "design" | "colour" | "all" | null;
}

/**
 * Make a side's choices consistent with the catalogue. When they match no
 * combination, the oldest conflicting choice is dropped — colour first, then
 * design, then material — until they do; if none of those helps, the whole
 * side is cleared.
 */
export function repairTriple(catalog: LensCatalog, vision: Vision, t: Triple): Repair {
  const pool = comboPool(catalog, vision);
  if (tripleFits(pool, t)) return { triple: t, cleared: null };
  const order: { key: keyof Triple; name: "material" | "design" | "colour" }[] = [
    { key: "c", name: "colour" },
    { key: "d", name: "design" },
    { key: "m", name: "material" },
  ];
  for (const { key, name } of order) {
    const attempt = { ...t, [key]: "" };
    if (tripleFits(pool, attempt)) return { triple: attempt, cleared: name };
  }
  return { triple: { m: "", d: "", c: "" }, cleared: "all" };
}

/** A side is ready to price when all three axes are chosen. */
export const tripleComplete = (t: Triple): boolean => !!(t.m && t.d && t.c);

/**
 * Splitting exists to give each eye a DIFFERENT lens — an identical pick on
 * both sides is a mistake (meant to turn split off) or a duplicate entry.
 */
export const splitLensesDuplicate = (a: Triple, b: Triple): boolean =>
  tripleComplete(a) && tripleComplete(b) && a.m === b.m && a.d === b.d && a.c === b.c;
