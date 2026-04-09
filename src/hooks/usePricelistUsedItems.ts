import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Returns a Set of item_ids (lens/addon/supply IDs) that are linked in any pricelist catalog row */
export const usePricelistUsedItems = () => {
  return useQuery<Set<string>>({
    queryKey: ["pricelist-used-items"],
    queryFn: async () => {
      const [catalogRes, matrixRes] = await Promise.all([
        (supabase.from("pricelist_catalog_rows") as any)
          .select("item_id")
          .not("item_id", "is", null),
        (supabase.from("matrix_allocations") as any)
          .select("lens_id")
          .not("lens_id", "is", null),
      ]);
      if (catalogRes.error) throw catalogRes.error;
      if (matrixRes.error) throw matrixRes.error;
      const ids = new Set<string>();
      (catalogRes.data ?? []).forEach((r: any) => { if (r.item_id) ids.add(r.item_id); });
      (matrixRes.data ?? []).forEach((r: any) => { if (r.lens_id) ids.add(r.lens_id); });
      return ids;
    },
    staleTime: 30_000,
  });
};
