export const PRICELIST_EDITOR_SECTIONS = ["rx", "stock", "supplies"] as const;

export type PricelistEditorSection = (typeof PRICELIST_EDITOR_SECTIONS)[number];

export const isPricelistEditorSection = (value: string | undefined): value is PricelistEditorSection =>
  PRICELIST_EDITOR_SECTIONS.includes(value as PricelistEditorSection);

export const buildPricelistEditorPath = (
  versionId: number,
  section: PricelistEditorSection,
  itemId?: string | null,
) => {
  const path = `/admin/pricing/pricelists/${versionId}/${section}`;
  return itemId ? `${path}?id=${encodeURIComponent(itemId)}` : path;
};

export const buildPricelistSelectionPath = (section?: PricelistEditorSection, itemId?: string | null) => {
  const params = new URLSearchParams();
  if (section) params.set("section", section);
  if (itemId) params.set("id", itemId);
  const query = params.toString();
  return `/admin/pricing/pricelists${query ? `?${query}` : ""}`;
};
