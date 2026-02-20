import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single-row upsert and delete for pricelist_catalog_rows.
 * Uses the unique row_key constraint — safe to call without wiping other rows.
 */
export const usePricelistCatalogRowUpsert = (
  versionId: number | null,
  catalogType: "rx" | "stock" | "buysell" = "rx"
) => {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ["pricelist-catalog-rows", versionId, catalogType],
    });

  const upsertRow = useMutation({
    mutationFn: async (row: {
      row_key: string;
      row_type: string;
      section: string;
      display_description: string;
      bbd_price: number | null;
      item_id: string | null;
      sort_order?: number;
    }) => {
      if (!versionId) throw new Error("No version selected");
      const { error } = await supabase
        .from("pricelist_catalog_rows" as any)
        .upsert(
          {
            pricelist_version_id: versionId,
            catalog_type: catalogType,
            row_key: row.row_key,
            row_type: row.row_type,
            section: row.section,
            display_description: row.display_description,
            bbd_price: row.bbd_price,
            item_id: row.item_id,
            sort_order: row.sort_order ?? 0,
          } as any,
          { onConflict: "row_key" }
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteRow = useMutation({
    mutationFn: async (rowKey: string) => {
      if (!versionId) throw new Error("No version selected");
      const { error } = await supabase
        .from("pricelist_catalog_rows" as any)
        .delete()
        .eq("row_key", rowKey)
        .eq("pricelist_version_id", versionId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { upsertRow, deleteRow };
};
