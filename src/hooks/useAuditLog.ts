import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: string;
  user_id: string;
  created_at: string;
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  change_summary: Record<string, any> | null;
  reason: string | null;
}

interface LogChangeInput {
  table_name: string;
  record_id: string;
  action: "create" | "update" | "delete";
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  change_summary?: Record<string, any> | null;
  reason?: string | null;
}

export const useAuditLog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const logMutation = useMutation({
    mutationFn: async (input: LogChangeInput) => {
      if (!user) return;
      const { error } = await (supabase.from("audit_log") as any).insert({
        table_name: input.table_name,
        record_id: input.record_id,
        action: input.action,
        user_id: user.id,
        old_data: input.old_data ?? null,
        new_data: input.new_data ?? null,
        change_summary: input.change_summary ?? null,
        reason: input.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit_log"] });
    },
  });

  const logChange = (input: LogChangeInput) => {
    // Fire-and-forget
    logMutation.mutate(input);
  };

  return { logChange };
};

/** Build a change_summary for pricing-related updates */
export const buildPricingSummary = (
  oldData: Record<string, any>,
  newData: Record<string, any>
): Record<string, any> => {
  const summary: Record<string, any> = {};
  const priceField = "sell_price" in newData ? "sell_price" : "price";
  const costField = "base_price" in newData ? "base_price" : null;

  if (oldData[priceField] !== newData[priceField]) {
    summary[priceField] = { old: oldData[priceField], new: newData[priceField] };
  }
  if (costField && oldData[costField] !== newData[costField]) {
    summary[costField] = { old: oldData[costField], new: newData[costField] };
  }

  // Compute margin delta if sell_price changed
  if (priceField === "sell_price" && costField) {
    const oldMargin = oldData[priceField] > 0 ? (oldData[priceField] - oldData[costField]) / oldData[priceField] : 0;
    const newMargin = newData[priceField] > 0 ? (newData[priceField] - newData[costField]) / newData[priceField] : 0;
    summary.margin_delta = +(newMargin - oldMargin).toFixed(4);
  }

  return summary;
};

export interface AuditLogFilters {
  table_name?: string;
  table_names?: string[];
  limit?: number;
  offset?: number;
}

export const useAuditLogQuery = (filters: AuditLogFilters) => {
  return useQuery<AuditLogEntry[]>({
    queryKey: ["audit_log", filters],
    staleTime: 0,
    refetchOnMount: "always" as const,
    queryFn: async () => {
      let query = (supabase.from("audit_log") as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filters.limit ?? 100);

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit ?? 100) - 1);
      }

      if (filters.table_names && filters.table_names.length > 0) {
        query = query.in("table_name", filters.table_names);
      } else if (filters.table_name) {
        query = query.eq("table_name", filters.table_name);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as AuditLogEntry[];
    },
  });
};
