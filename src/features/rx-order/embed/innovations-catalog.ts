// Building the Rx order form's catalogue from the Innovations alias mirror.
//
// Replaces the lens-row derivation in rx-order-adapter's buildEngineData. Under
// docs/rx-order-innovations-catalogue.md §2.1 Innovations is the catalogue: what
// it publishes is what the form offers, and the CV `lenses` table is not on the
// path at all.
//
// The engine's three axes map onto the alias fields directly:
//
//   material ← the pricing_key material segment  ("Plastic 1.50", "Poly")
//   design   ← mf_type + style_description       ("Progressive · Endless Steady")
//   colour   ← color_description                 ("TGNS Amber", "UNCoated")
//
// The colour axis previously showed FINISH TYPES (Finished / Lab Uncut /
// Semifinished). Those describe how we ship a blank, not what the patient looks
// through, and are irrelevant to a prescription order. Real colours replace them.
//
// Measured 2026-08-03: 4,087 active aliases produce 4,019 distinct
// material × design × colour selections. Only 65 of those resolve to more than
// one alias (133 aliases, worst case 3), so the engine's model fits with a
// deterministic tie-break rather than a schema change.
import type { EngineData, EngineItem } from "./rx-order-adapter";

export interface CatalogAlias {
  alias: string;
  style_code: string;
  style_description: string;
  color_code: string;
  color_description: string;
  mf_type: string;
  pricing_key: string;
}

/** Ids are normalised so the engine's string keys are stable across syncs. */
const id = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

export const materialIdOf = (alias: CatalogAlias) => id(alias.pricing_key?.split("|")[0] ?? "");
export const designIdOf = (alias: CatalogAlias) => id(`${alias.mf_type}|${alias.style_description}`);
export const colourIdOf = (alias: CatalogAlias) => id(alias.color_description);

export const comboKey = (m: string, d: string, c: string) => `${m}|${d}|${c}`;

/** Single Vision is the engine's "sv" segment; everything else is multifocal. */
const visionOf = (mfType: string) => (/single\s*vision/i.test(mfType) ? "sv" : "mf");

export interface InnovationsCatalog {
  data: Pick<EngineData, "materials" | "designs" | "colours" | "matrix" | "combos">;
  /** material|design|colour → the alias to order. */
  aliasIndex: Map<string, CatalogAlias>;
  /** Selections that matched more than one alias, for reporting. */
  ambiguous: Array<{ key: string; aliases: string[] }>;
}

export const buildInnovationsCatalog = (aliases: CatalogAlias[]): InnovationsCatalog => {
  const materials = new Map<string, EngineItem>();
  const designs = new Map<string, EngineItem>();
  const colours = new Map<string, EngineItem>();
  const matrix: Record<string, { d: Set<string>; c: Set<string> }> = {};
  // Keyed by comboKey but storing the tuple: the design id contains a "|" of
  // its own, so the key cannot be split back apart safely.
  const combos = new Map<string, { m: string; d: string; c: string }>();
  const candidates = new Map<string, CatalogAlias[]>();

  for (const alias of aliases) {
    const m = materialIdOf(alias);
    const d = designIdOf(alias);
    const c = colourIdOf(alias);
    if (!m || !d || !c) continue;

    if (!materials.has(m)) {
      materials.set(m, { id: m, n: alias.pricing_key.split("|")[0].trim(), up: 0 });
    }
    if (!designs.has(d)) {
      designs.set(d, {
        id: d,
        n: `${alias.mf_type} · ${alias.style_description}`,
        v: visionOf(alias.mf_type),
        base: 0,
        prog: /progressive/i.test(alias.mf_type),
      });
    }
    if (!colours.has(c)) colours.set(c, { id: c, n: alias.color_description, up: 0 });

    (matrix[m] ??= { d: new Set(), c: new Set() });
    matrix[m].d.add(d);
    matrix[m].c.add(c);

    const key = comboKey(m, d, c);
    combos.set(key, { m, d, c });
    const list = candidates.get(key);
    if (list) list.push(alias);
    else candidates.set(key, [alias]);
  }

  // Deterministic tie-break: lowest alias code. The 65 ambiguous selections are
  // the same colour offered under two Innovations style codes for one style
  // name — the cheapest correct behaviour is to always pick the same one, and
  // surface the rest rather than hide the collision.
  const aliasIndex = new Map<string, CatalogAlias>();
  const ambiguous: InnovationsCatalog["ambiguous"] = [];
  for (const [key, list] of candidates) {
    const sorted = [...list].sort((a, b) => a.alias.localeCompare(b.alias));
    aliasIndex.set(key, sorted[0]);
    if (sorted.length > 1) ambiguous.push({ key, aliases: sorted.map((a) => a.alias) });
  }

  const byName = (a: EngineItem, b: EngineItem) => a.n.localeCompare(b.n);
  return {
    data: {
      materials: [...materials.values()].sort(byName),
      designs: [...designs.values()].sort(byName),
      // Clear/uncoated first — it is the common case and the engine's default.
      colours: [...colours.values()].sort((a, b) => {
        const clear = (x: EngineItem) => (/^(uncoated|clear)/i.test(x.n) ? 0 : 1);
        return clear(a) - clear(b) || byName(a, b);
      }),
      matrix: Object.fromEntries(
        Object.entries(matrix).map(([k, v]) => [k, { d: [...v.d], c: [...v.c] }]),
      ),
      combos: [...combos.values()],
    },
    aliasIndex,
    ambiguous,
  };
};
