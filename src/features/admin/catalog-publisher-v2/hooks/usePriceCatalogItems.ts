import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PriceCatalogItem } from "../types";

export const usePriceCatalogItems = () => {
  return useQuery({
    queryKey: ["price-catalog-v2"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_catalog" as any)
        .select("id, sku, name, category, description, unit_price, web_enabled, wspl_enabled")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as PriceCatalogItem[];
    },
  });
};
