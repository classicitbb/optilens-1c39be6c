import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PricingSheet {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const usePricingSheets = () => {
  const queryClient = useQueryClient();

  const query = useQuery<PricingSheet[]>({
    queryKey: ["pricing-sheets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_sheets")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as PricingSheet[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("pricing_sheets")
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing-sheets"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<PricingSheet, "name" | "description" | "is_active" | "sort_order">> }) => {
      const { error } = await supabase
        .from("pricing_sheets")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing-sheets"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pricing_sheets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricing-sheets"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};
