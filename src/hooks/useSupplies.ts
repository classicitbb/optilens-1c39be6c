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

const SUPPLIES_SELECT_QUERY = "*, supplier:suppliers!supplies_supplier_id_fkey(id, name), brand:brands!supplies_brand_id_fkey(id, name)";

const toSupplyFormData = (supply: Supply): SupplyFormData => ({
  name: supply.name,
  category: supply.category,
  description: supply.description,
  sku: supply.sku,
  base_price: supply.base_price,
  sell_price: supply.sell_price,
  unit: supply.unit,
  quantity_per_unit: supply.quantity_per_unit,
  is_active: supply.is_active,
  show_on_website: supply.show_on_website,
  image_url: supply.image_url,
  notes: supply.notes,
  supplier_id: supply.supplier_id,
  brand_id: supply.brand_id,
  preferred: supply.preferred,
  stocked: supply.stocked,
  show_in_pricelist: supply.show_in_pricelist,
  bin: supply.bin,
  detail: supply.detail,
  currency: supply.currency,
  bb_item: supply.bb_item,
  duty_added: supply.duty_added,
  vat_paid: supply.vat_paid,
  labour_added: supply.labour_added,
  stk_wspl: supply.stk_wspl,
});

export const useSupplies = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Supply[]>({
    queryKey: ["supplies"],
    queryFn: async () => {
      // Use server-side safe RPC that strips base_price for viewer/customer roles
      const { data: safeRows, error: safeErr } = await (supabase.rpc as any)("get_supplies_safe");
      if (safeErr) throw safeErr;
      if (!safeRows || (safeRows as any[]).length === 0) return [];
      const safeMap = new Map((safeRows as any[]).map((r: any) => [r.id, r.base_price]));
      const { data, error } = await (supabase.from("supplies") as any)
        .select(SUPPLIES_SELECT_QUERY)
        .order("name");
      if (error) throw error;
      return (data as any[]).map((s) => ({
        ...s,
        base_price: safeMap.has(s.id) ? safeMap.get(s.id) : s.base_price,
        supplier_id: s.supplier_id ?? null,
        supplier_name: s.supplier?.name ?? null,
        brand_id: s.brand_id ?? null,
        brand_name: s.brand?.name ?? null,
      })) as Supply[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: SupplyFormData) => {
      const { data, error } = await (supabase.from("supplies") as any)
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
      const { error } = await (supabase.from("supplies") as any)
        .update(form as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from("supplies") as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("supplies") as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (supply: Supply) => {
      const newSupply = { ...toSupplyFormData(supply), name: `${supply.name} (Copy)` };
      const { data, error } = await (supabase.from("supplies") as any).insert(newSupply as any).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplies"] }),
  });

  return { ...query, createMutation, updateMutation, toggleActiveMutation, deleteMutation, duplicateMutation };
};
