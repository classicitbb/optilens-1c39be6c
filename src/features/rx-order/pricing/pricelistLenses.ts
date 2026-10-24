import { buildInnovationsCatalog, comboKey, materialIdOf, designIdOf, colourIdOf, type CatalogAlias } from "../embed/innovations-catalog";
import { cellForAlias, cellKey, treatmentLookupKeys } from "./matrixPricing";

/** The same three labels and canonical alias used by the Rx form's pickers. */
export interface PricelistLens {
  alias: string;
  material: string;
  design: string;
  colour: string;
}

export interface PricelistLensAllocation {
  treatment_type: string;
  category: string;
  material_index: string;
  lens_id?: string | null;
}

export interface PricelistLensAliasLink {
  lens_id: string;
  innovations_alias: string;
  is_primary: boolean;
}

/** Follow the editor-selected lens, never every alias sharing its price band. */
export function indexPricelistLenses(aliases: CatalogAlias[], allocations: PricelistLensAllocation[] = [], links: PricelistLensAliasLink[] = []): Map<string, PricelistLens[]> {
  const index = new Map<string, PricelistLens[]>();
  const catalog = buildInnovationsCatalog(aliases);
  const byAlias = new Map(aliases.map((alias) => [alias.alias, alias]));
  const byLens = new Map<string, PricelistLensAliasLink[]>();
  for (const link of links) {
    const list = byLens.get(link.lens_id) ?? [];
    list.push(link);
    byLens.set(link.lens_id, list);
  }
  for (const allocation of allocations) {
    if (!allocation.lens_id) continue;
    const linked = byLens.get(allocation.lens_id) ?? [];
    const primaries = linked.filter((link) => link.is_primary);
    const choices = primaries.length ? primaries : linked;
    const candidates = new Map<string, CatalogAlias>();
    for (const link of choices) {
      const raw = byAlias.get(link.innovations_alias);
      if (!raw) continue;
      const canonical = catalog.aliasIndex.get(comboKey(materialIdOf(raw), designIdOf(raw), colourIdOf(raw)));
      if (canonical) candidates.set(canonical.alias, canonical);
    }
    if (candidates.size !== 1 || choices.some((link) => !byAlias.has(link.innovations_alias))) continue;
    const alias = [...candidates.values()][0];
    const cell = cellForAlias(alias);
    if (!cell || cell.category !== allocation.category || cell.materialIndex !== allocation.material_index
      || !treatmentLookupKeys(cell.treatment).includes(allocation.treatment_type)) continue;
    const lens: PricelistLens = {
      alias: alias.alias,
      material: alias.pricing_key.split("|")[0].trim(),
      design: `${alias.mf_type} · ${alias.style_description}`,
      colour: alias.color_description,
    };
    index.set(cellKey(allocation.treatment_type, allocation.category, allocation.material_index), [lens]);
  }
  return index;
}

export const pricelistLensOrderPath = (alias: string) => `/profile/rx-order?lens=${encodeURIComponent(alias)}`;
