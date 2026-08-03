// Pricing an Innovations alias from the Rx price matrix.
//
// A CV priced line is group × family × material — see
// docs/rx-order-innovations-catalogue.md §2.3. All three axes are derivable
// from the alias itself, so the order form never needs to resolve a CV lens
// row to find a price:
//
//   group    ← normTreatment(color_description)   → rx_price_groupings.key
//   family   ← TIER_MAP[mf_type|style_description] → rx_price_categories.key
//   material ← the pricing_key material segment    → matrix_allocations.material_index
//
// Measured 2026-08-03: 3,754 of 4,087 active aliases (92%) land in a cell that
// carries a price. A null price means "not offered" and routes to the
// quote-only / request-assistance path (§2.4) rather than blocking the order.
import { normTreatment, TIER_MAP } from "@/lib/pricing/classifier";
import { CATEGORY_KEY_MAP, GROUPING_KEY_MAP } from "@/lib/pricing/groupingMap";

export interface MatrixCell {
  treatment: string;
  category: string;
  materialIndex: string;
}

/**
 * `matrix_allocations.material_index` is not a pure index number — Poly and
 * Trivex are named rather than numbered. Check those first: "Trivex 1.53"
 * contains a number that is NOT a matrix index and would otherwise win.
 */
export const materialIndexFor = (material: string | null | undefined): string | null => {
  const m = (material ?? "").toLowerCase();
  if (!m) return null;
  if (m.includes("poly")) return "POLY";
  if (m.includes("trivex")) return "Trivex";
  const index = m.match(/1\.(50|60|67|74)/);
  return index ? `1.${index[1]}` : null;
};

/**
 * The colour text carries the treatment. normTreatment already understands the
 * live naming variants ("TGNS", "Trans 8", "Gray 8 SRC" are one product), so
 * this is a thin bridge from its output to the matrix's key.
 */
export const treatmentKeyFor = (colourDescription: string | null | undefined): string =>
  GROUPING_KEY_MAP[normTreatment(colourDescription)] ?? "clear";

/** Innovations mf_type + style_description → the matrix category key. */
export const categoryKeyFor = (
  mfType: string | null | undefined,
  styleDescription: string | null | undefined,
): string | null => {
  const tier = TIER_MAP[`${mfType}|${styleDescription}`];
  return tier ? CATEGORY_KEY_MAP[tier] ?? null : null;
};

/**
 * Deprecated duplicates of the Trans Gen S grouping. Both carry allocation rows
 * in live data (`trans_gen_s` 197, `transitions_gen_s_2` 60) and both are
 * entirely unpriced, so a lookup must tolerate them without letting a
 * zero-priced duplicate shadow the real key. Remove once the allocations are
 * merged into `transitions_gen_s` — see docs §4.2.
 */
const TREATMENT_ALIASES: Record<string, string[]> = {
  transitions_gen_s: ["transitions_gen_s", "trans_gen_s", "transitions_gen_s_2"],
};

export const treatmentLookupKeys = (treatment: string): string[] =>
  TREATMENT_ALIASES[treatment] ?? [treatment];

export const cellKey = (treatment: string, category: string, materialIndex: string) =>
  `${treatment}|${category}|${materialIndex}`;

export interface PriceableAlias {
  color_description: string;
  mf_type: string;
  style_description: string;
  /** "Material | MFType | Style" — the material segment is the CV-side label. */
  pricing_key: string;
}

/** Resolve the matrix cell an alias prices from, or null if it cannot reach one. */
export const cellForAlias = (alias: PriceableAlias): MatrixCell | null => {
  const materialIndex = materialIndexFor(alias.pricing_key?.split("|")[0]?.trim());
  const category = categoryKeyFor(alias.mf_type, alias.style_description);
  if (!materialIndex || !category) return null;
  return { treatment: treatmentKeyFor(alias.color_description), category, materialIndex };
};

export type PriceLookup = (cell: MatrixCell) => number | null;

/**
 * Build a lookup over a pricelist version's allocations. Rows with a null price
 * are deliberately not indexed — an unpriced cell and an absent cell mean the
 * same thing to the form ("not offered"), and collapsing them here keeps the
 * caller from having to distinguish.
 */
export const buildPriceLookup = (
  allocations: Array<{ treatment_type: string; category: string; material_index: string; allocated_price_bbd: number | null }>,
): PriceLookup => {
  const prices = new Map<string, number>();
  for (const row of allocations) {
    if (row.allocated_price_bbd == null) continue;
    prices.set(cellKey(row.treatment_type, row.category, row.material_index), Number(row.allocated_price_bbd));
  }
  return (cell) => {
    for (const treatment of treatmentLookupKeys(cell.treatment)) {
      const price = prices.get(cellKey(treatment, cell.category, cell.materialIndex));
      if (price != null) return price;
    }
    return null;
  };
};

/** Convenience: price an alias directly, null when unpriced or unclassifiable. */
export const priceForAlias = (alias: PriceableAlias, lookup: PriceLookup): number | null => {
  const cell = cellForAlias(alias);
  return cell ? lookup(cell) : null;
};
