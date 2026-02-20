import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MatrixAllocation {
  id: number;
  pricelist_version_id: number | null;
  category: string;
  material_index: string;
  treatment_type: string;
  lens_id: string | null;
  allocated_price_bbd: number | null;
  is_active: boolean | null;
  updated_at: string | null;
}

export const TREATMENT_TYPES = [
  "clear",
  "transitions",
  "photochromic",
  "polarized",
  "bluefilter",
] as const;

export type TreatmentType = typeof TREATMENT_TYPES[number];

// Material columns for Spec 1.2
export const MATERIAL_COLUMNS = [
  { key: "1.50", label: "1.50" },
  { key: "POLY", label: "POLY" },
  { key: "1.60", label: "1.60" },
  { key: "1.67", label: "1.67" },
  { key: "1.74", label: "1.74" },
] as const;

export type MaterialKey = typeof MATERIAL_COLUMNS[number]["key"];

export const useMatrixAllocations = (versionId: number | null) => {
  const queryClient = useQueryClient();

  const query = useQuery<MatrixAllocation[]>({
    queryKey: ["matrix-allocations", versionId],
    queryFn: async () => {
      if (!versionId) return [];
      const { data, error } = await supabase
        .from("matrix_allocations")
        .select("*")
        .eq("pricelist_version_id", versionId)
        .order("id");
      if (error) throw error;
      return (data ?? []) as MatrixAllocation[];
    },
    enabled: !!versionId,
  });

  const upsertMutation = useMutation({
    mutationFn: async (record: {
      category: string;
      material_index: string;
      treatment_type: string;
      lens_id: string | null;
      allocated_price_bbd: number | null;
    }) => {
      if (!versionId) throw new Error("No version selected");

      // Try to find existing record
      const { data: existing } = await supabase
        .from("matrix_allocations")
        .select("id")
        .eq("pricelist_version_id", versionId)
        .eq("category", record.category)
        .eq("material_index", record.material_index)
        .eq("treatment_type", record.treatment_type)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("matrix_allocations")
          .update({
            lens_id: record.lens_id,
            allocated_price_bbd: record.allocated_price_bbd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("matrix_allocations")
          .insert({
            pricelist_version_id: versionId,
            category: record.category,
            material_index: record.material_index,
            treatment_type: record.treatment_type,
            lens_id: record.lens_id,
            allocated_price_bbd: record.allocated_price_bbd,
            is_active: true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["matrix-allocations", versionId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from("matrix_allocations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["matrix-allocations", versionId] }),
  });

  return { ...query, upsertMutation, deleteMutation };
};
