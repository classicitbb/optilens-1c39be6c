import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface Addon {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  cost: number;
  price: number;
  is_auto: boolean;
  auto_rule: Json | null;
  is_active: boolean;
  show_on_website: boolean;
  sort_order: number;
  supplier_id: string | null;
  supplier_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface AddonFormData {
  name: string;
  sku: string;
  category: string;
  description: string;
  cost: number;
  price: number;
  is_auto: boolean;
  auto_rule: Json | null;
  is_active: boolean;
  show_on_website: boolean;
  sort_order: number;
  supplier_id: string | null;
}

export const useAddons = () => {
  const queryClient = useQueryClient();

  const query = useQuery<Addon[]>({
    queryKey: ["addons"],
    queryFn: async () => {
      // Use server-side safe RPC that strips cost for viewer/customer roles
      const { data: safeRows, error: safeErr } = await (supabase.rpc as any)("get_addons_safe");
      if (safeErr) throw safeErr;
      if (!safeRows || (safeRows as any[]).length === 0) return [];
      const safeMap = new Map((safeRows as any[]).map((r: any) => [r.id, r.cost]));
      const { data, error } = await (supabase.from("addons") as any)
        .select("*, supplier:suppliers(id, name)")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data as any[]).map((a) => ({
        ...a,
        cost: safeMap.has(a.id) ? safeMap.get(a.id) : a.cost,
        supplier_id: a.supplier_id ?? null,
        supplier_name: a.supplier?.name ?? null,
      })) as Addon[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (form: AddonFormData) => {
      const { data, error } = await (supabase.from("addons") as any)
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
      const { error } = await (supabase.from("addons") as any)
        .update(form as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addons"] }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase.from("addons") as any)
        .update({ is_active } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addons"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("addons") as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addons"] }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (addon: Addon) => {
      const form: AddonFormData = {
        name: `${addon.name} (Copy)`,
        sku: "",
        category: addon.category,
        description: addon.description,
        cost: addon.cost,
        price: addon.price,
        is_auto: addon.is_auto,
        auto_rule: addon.auto_rule,
        is_active: addon.is_active,
        show_on_website: addon.show_on_website,
        sort_order: addon.sort_order,
        supplier_id: addon.supplier_id,
      };
      const { data, error } = await (supabase.from("addons") as any)
        .insert(form as any)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addons"] }),
  });

  return { ...query, createMutation, updateMutation, toggleActiveMutation, deleteMutation, duplicateMutation };
};
