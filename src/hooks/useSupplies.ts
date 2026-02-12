import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Supply {
  id: string;
  name: string;
  category: string;
  description: string;
  sku: string;
  base_price: number;
  sell_price: number;
  unit: string;
  quantity_per_unit: number;
  is_active: boolean;
  show_on_website: boolean;
  image_url: string | null;
  notes: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  brand_id: string | null;
  brand_name: string | null;
  preferred: boolean;
  stocked: boolean;
  show_in_pricelist: boolean;
  bin: string;
  detail: string;
  currency: string;
  bb_item: boolean;
  duty_added: boolean;
  vat_paid: boolean;
  labour_added: boolean;
  stk_wspl: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplyFormData {
  name: string;
  category: string;
  description: string;
  sku: string;
  base_price: number;
  sell_price: number;
  unit: string;
  quantity_per_unit: number;
  is_active: boolean;
  show_on_website: boolean;
  image_url: string | null;
  notes: string | null;
  supplier_id: string | null;
  brand_id: string | null;
  preferred: boolean;
  stocked: boolean;
  show_in_pricelist: boolean;
  bin: string;
  detail: string;
  currency: string;
  bb_item: boolean;
  duty_added: boolean;
  vat_paid: boolean;
  labour_added: boolean;
  stk_wspl: boolean;
}

export const useSupplies = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Supply[]>({
    queryKey: ["supplies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplies")
        .select("*, supplier:suppliers(id, name), brand:brands(id, name)")
        .order("name");
      if (error) throw error;
      return (data as any[]).map((s) => ({
        ...s,
        supplier_id: s.supplier_id ?? null,
        supplier_name: s.supplier?.name ?? null,
        brand_id: s.brand_id ?? null,
        brand_name: s.brand?.name ?? null,
      })) as Supply[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: SupplyFormData) => {
      const { data, error } = await supabase
        .from("supplies")
        .insert(form as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: SupplyFormData }) => {
      const { error } = await supabase
        .from("supplies")
        .update(form as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("supplies")
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  return { ...query, createMutation, updateMutation, toggleActiveMutation };
};
