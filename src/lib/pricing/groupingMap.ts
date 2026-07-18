/**
 * groupingMap.ts — maps classifier output (classifier.ts's treatment/tier
 * strings) onto the live `rx_price_groupings.key` / `rx_price_categories.key`
 * slugs the matrix editor (TreatmentMatricesAccordion, matrix_allocations)
 * actually keys off.
 *
 * These are NOT string-equal (e.g. classifier "Trans® XtrActive® New Gen" vs
 * live default_name "Trans® XTRActive® New Generation") and in several cases
 * there was no clean live equivalent at all. Resolved with the operator
 * 2026-07-15 — see docs/issues/BS1-05-pricing-computation-service.md
 * "Taxonomy reconciliation" section for the full reasoning. Locked decision:
 * the classifier (local tool) is the source of truth for naming/structure;
 * migration 20260715170000_rx_taxonomy_reconciliation.sql brings the live
 * rx_price_groupings/rx_price_categories labels in line with it.
 */

// classifier normTreatment() output -> rx_price_groupings.key
export const GROUPING_KEY_MAP: Record<string, string> = {
  Clear: "clear",
  Polarized: "polarized",
  UV420: "uv420",
  "Photochromic - Gray": "photochromic_gray",
  "Photochromic - Brown": "photochromic_gray", // operator decision: lump brown into gray, no separate live grouping
  "Trans Gen S™": "transitions_gen_s", // NOT transitions_gen_s_2 — that key is a deprecated duplicate, see migration
  "Trans® XtrActive® New Gen": "transitions_xtractive_new_generation",
  "Trans® XtrActive® Polarized": "transitions_xtractive_polarized",
};

// classifier TIER_MAP output -> rx_price_categories.key
export const CATEGORY_KEY_MAP: Record<string, string> = {
  "Progressive - Best": "progressive_best",
  "Progressive - Better": "progressive_better",
  "Progressive - Good": "progressive_good",
  "Specific Use - Office": "specific_use_office",
  "Single Vision - HD": "single_vision_hd",
  "Single Vision - Regular": "single_vision_regular",
  "Progressive - Adept": "progressive_adapt", // live key/default_name predate the "Adept" spelling; migration renames the label, not the key
  "Anti-Fatigue": "single_vision_antifatigue", // operator decision: one shared category for both progressive and single-vision anti-fatigue designs, matching the classifier's undifferentiated tier; migration renames the live label from "Single Vision - Antifatigue" to "Anti-Fatigue"
  "Specific Use - Sport": "specific_use_sport", // did not exist live; migration adds it
  "Specific Use - Bifocal": "specific_use_bifocal_round", // operator decision: collapse the live round/FT split into the classifier's digital/conventional split; migration renames the label from "Specific Use - Bifocal Round"
  "Specific Use - Adept Bifocal": "specific_use_bifocal_ft", // migration renames the label from "Specific Use - Bifocal FT"
};

export function groupingKeyFor(treatment: string): string | null {
  return GROUPING_KEY_MAP[treatment] ?? null;
}

export function categoryKeyFor(tier: string): string | null {
  return CATEGORY_KEY_MAP[tier] ?? null;
}

// classifier normMaterial() output -> useMatrixAllocations.ts's MATERIAL_COLUMNS key.
// Mostly identity; only casing differs for Trivex. "1.56"/"1.59"/"GLASS" have no
// matrix column at all (only 6 columns exist) — categoryKeyFor-style callers
// should treat a null return as "no cell exists for this material," not an error.
export const MATERIAL_KEY_MAP: Record<string, string> = {
  "1.50": "1.50",
  "1.60": "1.60",
  "1.67": "1.67",
  "1.74": "1.74",
  POLY: "POLY",
  TRIVEX: "Trivex",
};

export function materialKeyFor(material: string): string | null {
  return MATERIAL_KEY_MAP[material] ?? null;
}
