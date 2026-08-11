import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PricelistCatalogRow {
  id?: string;
  pricelist_version_id: number;
  catalog_type: string; // 'rx' | 'stock' | 'buysell'
  row_key: string;
  row_type: string; // 'lens' | 'addon' | 'supply'
  section: string;
  display_description: string;
  bbd_price: number | null;
  item_id: string | null;
  sort_order: number;
}

export const usePricelistCatalogRows = (
  versionId: number | null,
  catalogType: "rx" | "stock" | "buysell"
) => {
  const queryClient = useQueryClient();

  const query = useQuery<PricelistCatalogRow[]>({
    queryKey: ["pricelist-catalog-rows", versionId, catalogType],
    queryFn: async () => {
      if (!versionId) return [];
      const { data, error } = await (supabase.from("pricelist_catalog_rows") as any)
        .select("*")
        .eq("pricelist_version_id", versionId)
        .eq("catalog_type", catalogType)
        .order("sort_order");
      if (error) throw error;
      return ((data ?? []) as unknown) as PricelistCatalogRow[];
    },
    enabled: !!versionId,
  });

  const saveRows = useMutation({
    mutationFn: async (rows: Omit<PricelistCatalogRow, "id">[]) => {
      if (!versionId) return;
      // Delete all existing rows for this version + catalog_type, but only
      // the row_types this editor actually manages (lens/addon/supply).
      // catalog_type='stock' is a shared bucket — the Stock Order Builder's
      // pricing tab also writes row_type='stock_variant' rows into it
      // (see 20260811000000_stock_order_pricing_and_outbox.sql). A blanket
      // delete-by-catalog_type here would silently wipe that pricing every
      // time someone saves the WSPL Stock Lens Prices page. Scope the wipe
      // to the row_types ListCatalogTab actually rebuilds below.
      const { error: delErr } = await (supabase.from("pricelist_catalog_rows") as any)
        .delete()
        .eq("pricelist_version_id", versionId)
        .eq("catalog_type", catalogType)
        .in("row_type", ["lens", "addon", "supply"]);
      if (delErr) throw delErr;

      // Insert current rows
      if (rows.length > 0) {
        const { error: insErr } = await (supabase.from("pricelist_catalog_rows") as any)
          .insert(rows as any[]);
        if (insErr) throw insErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pricelist-catalog-rows", versionId, catalogType],
      });
    },
  });

  return { ...query, saveRows };
};
