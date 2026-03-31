import type { LineOverride } from "@/hooks/usePriceHierarchy";
import type { PricelistCatalogRow } from "@/hooks/usePricelistCatalogRows";

/**
 * Preview/list pricing should reflect the exact row value being edited.
 * If a line override exists for the linked item, that override replaces the row BBD.
 */
export const resolveCatalogRowPreviewPriceBbd = (
  row: Pick<PricelistCatalogRow, "bbd_price" | "row_type" | "item_id">,
  lineOverrides: LineOverride[]
): number | null => {
  if (row.item_id) {
    const override = lineOverrides.find(
      (entry) => entry.reference_type === row.row_type && entry.reference_id === row.item_id
    );
    if (override?.overridden_price_bbd != null) return override.overridden_price_bbd;
  }
  return row.bbd_price;
};
