import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferenceItem {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const VALID_TABLES = ["suppliers", "brands", "materials", "mftypes", "lenstypes", "lens_options"] as const;
export type ReferenceTable = (typeof VALID_TABLES)[number];

function isValidTable(t: string): t is ReferenceTable {
  return (VALID_TABLES as readonly string[]).includes(t);
}

export const useReferenceData = (table: string) => {
  const queryClient = useQueryClient();
  const safeTable = isValidTable(table) ? table : null;

  const query = useQuery<ReferenceItem[]>({
    queryKey: ["reference-data", safeTable],
    queryFn: async () => {
      if (!safeTable) throw new Error("Invalid table");
      const { data, error } = await supabase
        .from(safeTable)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as ReferenceItem[];
    },
    enabled: !!safeTable,
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!safeTable) throw new Error("Invalid table");
      const { data, error } = await supabase
        .from(safeTable)
        .insert({ name } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reference-data", safeTable] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<ReferenceItem, "name" | "is_active">> }) => {
      if (!safeTable) throw new Error("Invalid table");
      const { data, error } = await supabase
        .from(safeTable)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reference-data", safeTable] }),
  });

  return { ...query, createMutation, updateMutation };
};
