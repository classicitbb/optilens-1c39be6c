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

      // Deduplicate defensively — the DB enforces uniqueness on
      // (pricelist_version_id, catalog_type, row_key).
      const byKey = new Map<string, Omit<PricelistCatalogRow, "id">>();
      for (const row of rows) if (!byKey.has(row.row_key)) byKey.set(row.row_key, row);
      const nextRows = [...byKey.values()];
      const keepKeys = new Set(nextRows.map((r) => r.row_key));

      // Remove only the rows this editor manages (lens/addon/supply) that are
      // no longer present. catalog_type='stock' is a shared bucket — the Stock
      // Order Builder writes row_type='stock_variant' rows into it, so a
      // blanket delete-by-catalog_type would silently wipe that pricing.
      const { data: existing, error: existingErr } = await (supabase.from("pricelist_catalog_rows") as any)
        .select("row_key,row_type")
        .eq("pricelist_version_id", versionId)
        .eq("catalog_type", catalogType);
      if (existingErr) throw existingErr;

      const staleKeys = ((existing ?? []) as { row_key: string; row_type: string }[])
        .filter((r) => ["lens", "addon", "supply"].includes(r.row_type) && !keepKeys.has(r.row_key))
        .map((r) => r.row_key);

      if (staleKeys.length > 0) {
        const { error: delErr } = await (supabase.from("pricelist_catalog_rows") as any)
          .delete()
          .eq("pricelist_version_id", versionId)
          .eq("catalog_type", catalogType)
          .in("row_key", staleKeys);
        if (delErr) throw delErr;
      }

      // Upsert only the rows that actually differ from what is currently in
      // the database. Sending untouched rows would let a stale working copy
      // push an older price over one just saved elsewhere (e.g. the Stock
      // Order SKUs tab writing the same lens-<uuid> row).
      const serverByKey = new Map(
        ((existing ?? []) as any[]).map((r) => [r.row_key as string, r]),
      );
      const changed = nextRows.filter((row) => {
        const server = serverByKey.get(row.row_key);
        if (!server) return true;
        return (
          Number(server.bbd_price ?? NaN) !== Number(row.bbd_price ?? NaN) ||
          (server.bbd_price == null) !== (row.bbd_price == null) ||
          server.display_description !== row.display_description ||
          server.section !== row.section ||
          server.row_type !== row.row_type ||
          (server.item_id ?? null) !== (row.item_id ?? null) ||
          Number(server.sort_order ?? 0) !== Number(row.sort_order ?? 0)
        );
      });

      if (changed.length > 0) {
        const { error: upErr } = await (supabase.from("pricelist_catalog_rows") as any)
          .upsert(changed as any[], { onConflict: "pricelist_version_id,catalog_type,row_key" });
        if (upErr) throw upErr;
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
