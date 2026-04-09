import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferenceItem {
  id: string;
  name: string;
  abbrev: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const VALID_TABLES = ["suppliers", "brands", "materials", "mftypes", "lenstypes", "lens_options", "finishtypes", "supply_categories"] as const;
export type ReferenceTable = (typeof VALID_TABLES)[number];

function isValidTable(t: string): t is ReferenceTable {
  return (VALID_TABLES as readonly string[]).includes(t);
}

export const useReferenceData = (table: string, enabled = true) => {
  const queryClient = useQueryClient();
  const safeTable = isValidTable(table) ? table : null;

  const query = useQuery<ReferenceItem[]>({
    queryKey: ["reference-data", safeTable],
    queryFn: async () => {
      if (!safeTable) throw new Error("Invalid table");
      const { data, error } = await (supabase
        .from(safeTable) as any)
        .select("*")
        .order("name");
      if (error) throw error;
      return data as ReferenceItem[];
    },
    enabled: !!safeTable && enabled,
  });

  const createMutation = useMutation({
    mutationFn: async (values: { name: string; abbrev?: string; code?: string }) => {
      if (!safeTable) throw new Error("Invalid table");
      const { data, error } = await supabase
        .from(safeTable)
        .insert(values as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reference-data", safeTable] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<ReferenceItem, "name" | "abbrev" | "code" | "is_active">> }) => {
      if (!safeTable) throw new Error("Invalid table");
      const { data, error } = await (supabase
        .from(safeTable) as any)
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reference-data", safeTable] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!safeTable) throw new Error("Invalid table");
      const { error } = await (supabase
        .from(safeTable) as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reference-data", safeTable] }),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Pick<ReferenceItem, "is_active">> }) => {
      if (!safeTable) throw new Error("Invalid table");
      const { error } = await (supabase
        .from(safeTable) as any)
        .update(updates as any)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reference-data", safeTable] }),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!safeTable) throw new Error("Invalid table");
      const { error } = await (supabase
        .from(safeTable) as any)
        .delete()
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reference-data", safeTable] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation, bulkUpdateMutation, bulkDeleteMutation };
};
