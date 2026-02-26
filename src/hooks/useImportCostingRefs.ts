import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ChargeType {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShipmentType {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useChargeTypes = () => {
  const qc = useQueryClient();

  const query = useQuery<ChargeType[]>({
    queryKey: ["charge_types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("charge_types")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ChargeType[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (item: Partial<ChargeType> & { name: string }) => {
      if (item.id) {
        const { id, ...rest } = item;
        const { error } = await (supabase as any).from("charge_types").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("charge_types").insert(item);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["charge_types"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("charge_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["charge_types"] }),
  });

  return { ...query, upsertMutation, deleteMutation };
};

export const useShipmentTypes = () => {
  const qc = useQueryClient();

  const query = useQuery<ShipmentType[]>({
    queryKey: ["shipment_types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shipment_types")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ShipmentType[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (item: Partial<ShipmentType> & { name: string; code: string }) => {
      if (item.id) {
        const { id, ...rest } = item;
        const { error } = await (supabase as any).from("shipment_types").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("shipment_types").insert(item);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipment_types"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("shipment_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shipment_types"] }),
  });

  return { ...query, upsertMutation, deleteMutation };
};
