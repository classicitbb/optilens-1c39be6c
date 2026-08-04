import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { InnovationsPowerRow } from "@/features/store-variants/innovationsVariantImport";

export type InnovationsStoreLens = {
  id: string; innovations_lens_id: string; name: string; lens_state: "semi_finished" | "finished" | "stock_lens";
  material_group: string | null; material: string | null; lens_type: string | null; option_name: string | null;
  mf_type: string | null; manufacturer: string | null; finish_type: string | null; is_enabled: boolean;
};

export const useInnovationsStoreLensCatalog = () => useQuery<InnovationsStoreLens[]>({
  queryKey: ["innovations-store-lens-catalog"],
  queryFn: async () => {
    const { data, error } = await (supabase.from("innovations_store_lenses") as any)
      .select("id,innovations_lens_id,name,lens_state,material_group,material,lens_type,option_name,mf_type,manufacturer,finish_type,is_enabled")
      .eq("is_enabled", true).order("name");
    if (error) throw error;
    return data ?? [];
  },
});

export const useInnovationsLensPowerRows = (lensIds: string[] = []) => useQuery<InnovationsPowerRow[]>({
  queryKey: ["innovations-store-lens-powers", lensIds], enabled: lensIds.length > 0,
  queryFn: async () => {
    const { data, error } = await (supabase.from("innovations_store_lens_power_rows") as any)
      .select("id,innovations_lens_id,diameter,sphere,base,cylinder,add,stock_on_hand,right_opc,left_opc")
      .in("innovations_lens_id", lensIds).order("id");
    if (error) throw error;
    return data ?? [];
  },
});
