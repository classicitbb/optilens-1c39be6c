import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { CartItem } from "@/hooks/useCart";

export interface CartDraftRow {
  id: string;
  user_id: string;
  name: string;
  note: string | null;
  items: CartItem[];
  total_items: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = ["cart-drafts"] as const;

const stripDbFields = (item: CartItem) => ({
  product_id: item.product_id,
  product_name: item.product_name,
  product_price: item.product_price,
  product_type: item.product_type,
  variant_id: item.variant_id ?? null,
  variant_label: item.variant_label ?? null,
  variant_sku: item.variant_sku ?? null,
  variant_opc_code: item.variant_opc_code ?? null,
  variant_metadata: item.variant_metadata ?? {},
  quantity: item.quantity,
});

export const useCartDrafts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return [] as CartDraftRow[];
      const { data, error } = await (supabase as any)
        .from("cart_drafts")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CartDraftRow[];
    },
  });

  const createDraft = useMutation({
    mutationFn: async (payload: { name: string; note?: string; items: CartItem[] }) => {
      if (!user) throw new Error("Sign in to save drafts.");
      const snapshotItems = payload.items.map(stripDbFields);
      const total_items = snapshotItems.reduce((sum, i) => sum + i.quantity, 0);
      const total_amount = snapshotItems.reduce((sum, i) => sum + i.product_price * i.quantity, 0);
      const { data, error } = await (supabase as any)
        .from("cart_drafts")
        .insert([{
          user_id: user.id,
          name: payload.name,
          note: payload.note ?? null,
          items: snapshotItems,
          total_items,
          total_amount,
        }])
        .select()
        .single();
      if (error) throw error;
      return data as CartDraftRow;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const renameDraft = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await (supabase as any)
        .from("cart_drafts")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteDraft = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("cart_drafts")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return {
    drafts: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    createDraft,
    renameDraft,
    deleteDraft,
  };
};
