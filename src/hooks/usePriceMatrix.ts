import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PriceMatrixRow {
  id: number;
  category: string;
  index_1_50: number | null;
  index_1_53: number | null;
  index_1_59: number | null;
  index_1_60: number | null;
  index_1_67: number | null;
  index_1_74: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export const INDEX_COLUMNS = [
  { key: "index_1_50" as const, label: "1.50" },
  { key: "index_1_53" as const, label: "Trivex" },
  { key: "index_1_59" as const, label: "1.59" },
  { key: "index_1_60" as const, label: "1.60" },
  { key: "index_1_67" as const, label: "1.67" },
  { key: "index_1_74" as const, label: "1.74" },
];

export const usePriceMatrix = () => {
  const queryClient = useQueryClient();

  const query = useQuery<PriceMatrixRow[]>({
    queryKey: ["price-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("price_matrix")
        .select("*")
        .order("id");
      if (error) throw error;
      return data as PriceMatrixRow[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (rows: PriceMatrixRow[]) => {
      const updates = rows.map((row) => ({
        id: row.id,
        category: row.category,
        index_1_50: row.index_1_50,
        index_1_53: row.index_1_53,
        index_1_59: row.index_1_59,
        index_1_60: row.index_1_60,
        index_1_67: row.index_1_67,
        index_1_74: row.index_1_74,
        updated_at: new Date().toISOString(),
      }));

      for (const u of updates) {
        const { error } = await supabase
          .from("price_matrix")
          .update(u as any)
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["price-matrix"] }),
  });

  return { ...query, saveMutation };
};
