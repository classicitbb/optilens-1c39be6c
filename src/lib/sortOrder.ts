/**
 * Canonical sort orders for categories and materials.
 * Used across all views, previews, editors, and exports.
 */

export const CATEGORY_ORDER = [
  "Progressive - Best",
  "Progressive - Better",
  "Progressive - Good",
  "Specific Use - Office",
  "Specific Use - Bifocal FT",
  "Specific Use - Drive PAL",
  "Specific Use - Drive SV",
  "Specific Use - Curved Lens",
  "Single Vision - Antifatigue",
  "Single Vision - Single Vision",
] as const;

export const MATERIAL_ORDER = [
  "1.50",
  "POLY",
  "Trivex",
  "1.60",
  "1.67",
  "1.74",
] as const;

/** Sort comparator for categories using canonical order */
export const compareCategoryOrder = (a: string, b: string): number => {
  const aIdx = CATEGORY_ORDER.indexOf(a as any);
  const bIdx = CATEGORY_ORDER.indexOf(b as any);
  if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
  if (aIdx === -1) return 1;
  if (bIdx === -1) return -1;
  return aIdx - bIdx;
};

/** Sort comparator for materials using canonical order */
export const compareMaterialOrder = (a: string, b: string): number => {
  const aIdx = MATERIAL_ORDER.indexOf(a as any);
  const bIdx = MATERIAL_ORDER.indexOf(b as any);
  if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
  if (aIdx === -1) return 1;
  if (bIdx === -1) return -1;
  return aIdx - bIdx;
};

/** Sort an array of categories in canonical order */
export const sortCategories = (categories: string[]): string[] =>
  [...categories].sort(compareCategoryOrder);

/** Sort an array of material keys in canonical order */
export const sortMaterials = (materials: string[]): string[] =>
  [...materials].sort(compareMaterialOrder);
