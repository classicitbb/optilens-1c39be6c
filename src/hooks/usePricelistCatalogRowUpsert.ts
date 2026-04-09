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
  const queryKey = ["pricelist-catalog-rows", versionId, catalogType];

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey,
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
        .from("pricelist_catalog_rows") as any)
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
          { onConflict: "pricelist_version_id,catalog_type,row_key" }
        );
      if (error) throw error;
      return row;
    },
    onMutate: async (incomingRow) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData<any[]>(queryKey) ?? [];
      const nextRows = [...previousRows];
      const existingIndex = nextRows.findIndex((row) => row.row_key === incomingRow.row_key);
      const optimisticRow = {
        ...(existingIndex >= 0 ? nextRows[existingIndex] : {}),
        pricelist_version_id: versionId ?? 0,
        catalog_type: catalogType,
        row_key: incomingRow.row_key,
        row_type: incomingRow.row_type,
        section: incomingRow.section,
        display_description: incomingRow.display_description,
        bbd_price: incomingRow.bbd_price,
        item_id: incomingRow.item_id,
        sort_order: incomingRow.sort_order ?? 0,
      };

      if (existingIndex >= 0) {
        nextRows[existingIndex] = optimisticRow;
      } else {
        nextRows.push(optimisticRow);
      }

      nextRows.sort((a, b) => a.sort_order - b.sort_order);
      queryClient.setQueryData(queryKey, nextRows);

      return { previousRows };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(queryKey, context.previousRows);
      }
    },
    onSuccess: invalidate,
  });

  const deleteRow = useMutation({
    mutationFn: async (rowKey: string) => {
      if (!versionId) throw new Error("No version selected");
      const { error } = await supabase
        .from("pricelist_catalog_rows") as any)
        .delete()
        .eq("row_key", rowKey)
        .eq("pricelist_version_id", versionId);
      if (error) throw error;
    },
    onMutate: async (rowKey) => {
      await queryClient.cancelQueries({ queryKey });
      const previousRows = queryClient.getQueryData<any[]>(queryKey) ?? [];
      queryClient.setQueryData(
        queryKey,
        previousRows.filter((row) => row.row_key !== rowKey)
      );
      return { previousRows };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousRows) {
        queryClient.setQueryData(queryKey, context.previousRows);
      }
    },
    onSuccess: invalidate,
  });

  return { upsertRow, deleteRow };
};
