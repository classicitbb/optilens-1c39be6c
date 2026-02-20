import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Returns a Set of item_ids (lens/addon/supply IDs) that are linked in any pricelist catalog row */
export const usePricelistUsedItems = () => {
  return useQuery<Set<string>>({
    queryKey: ["pricelist-used-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricelist_catalog_rows" as any)
        .select("item_id")
        .not("item_id", "is", null);
      if (error) throw error;
      const ids = new Set<string>();
      (data ?? []).forEach((r: any) => { if (r.item_id) ids.add(r.item_id); });
      return ids;
    },
    staleTime: 30_000,
  });
};
