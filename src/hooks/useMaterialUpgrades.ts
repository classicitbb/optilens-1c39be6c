import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MaterialUpgrade {
  id: number;
  upgrade_name: string;
  material: string;
  full_price_bbd: number | null;
  delta_bbd: number | null;
  notes: string | null;
  updated_at: string | null;
}

export const useMaterialUpgrades = () => {
  const queryClient = useQueryClient();

  const query = useQuery<MaterialUpgrade[]>({
    queryKey: ["material-upgrades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("material_upgrades")
        .select("*")
        .order("upgrade_name");
      if (error) throw error;
      return data as MaterialUpgrade[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (rows: MaterialUpgrade[]) => {
      for (const row of rows) {
        const { error } = await supabase
          .from("material_upgrades")
          .update({
            full_price_bbd: row.full_price_bbd,
            delta_bbd: row.delta_bbd,
            notes: row.notes,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", row.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["material-upgrades"] }),
  });

  const createMutation = useMutation({
    mutationFn: async (row: Omit<MaterialUpgrade, "id" | "updated_at">) => {
      const { data, error } = await supabase
        .from("material_upgrades")
        .insert(row as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["material-upgrades"] }),
  });

  return { ...query, saveMutation, createMutation };
};

export const usePricelistNotes = () => {
  return useQuery<{ id: number; section: string | null; content: string | null; sort_order: number | null }[]>({
    queryKey: ["pricelist-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricelist_notes")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
};
