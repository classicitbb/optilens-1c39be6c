import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface Addon {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  is_auto: boolean;
  auto_rule: Json | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AddonFormData {
  name: string;
  category: string;
  description: string;
  price: number;
  is_auto: boolean;
  auto_rule: Json | null;
  is_active: boolean;
  sort_order: number;
}

export const useAddons = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Addon[]>({
    queryKey: ["addons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("addons" as any)
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return data as unknown as Addon[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: AddonFormData) => {
      const { data, error } = await supabase
        .from("addons" as any)
        .insert(form as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addons"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: AddonFormData }) => {
      const { error } = await supabase
        .from("addons" as any)
        .update(form as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addons"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("addons" as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addons"] }),
  });

  return { ...query, createMutation, updateMutation, toggleActiveMutation };
};
