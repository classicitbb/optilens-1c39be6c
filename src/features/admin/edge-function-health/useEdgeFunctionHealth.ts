import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EdgeFunctionHealth = {
  function_name: string;
  is_healthy: boolean;
  last_error: string | null;
  checked_at: string;
  consecutive_failures: number;
  last_healthy_at: string | null;
  last_failure_at: string | null;
};

export type EdgeFunctionHealthRun = {
  id: string;
  source: "deployment" | "scheduled" | "manual";
  release_sha: string | null;
  is_healthy: boolean;
  function_count: number;
  failed_count: number;
  created_at: string;
};

const EDGE_FUNCTION_HEALTH_QUERY_KEY = ["edge-function-health"] as const;

export function useEdgeFunctionHealth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: EDGE_FUNCTION_HEALTH_QUERY_KEY,
    queryFn: async () => {
      const [healthResult, latestRunResult] = await Promise.all([
        (supabase as any)
          .from("edge_function_health")
          .select("function_name,is_healthy,last_error,checked_at,consecutive_failures,last_healthy_at,last_failure_at")
          .order("function_name"),
        (supabase as any)
          .from("edge_function_health_runs")
          .select("id,source,release_sha,is_healthy,function_count,failed_count,created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (healthResult.error) throw healthResult.error;
      if (latestRunResult.error) throw latestRunResult.error;
      return {
        functions: (healthResult.data ?? []) as EdgeFunctionHealth[],
        latestRun: (latestRunResult.data ?? null) as EdgeFunctionHealthRun | null,
      };
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("edge-function-health-status")
      .on("postgres_changes", { event: "*", schema: "public", table: "edge_function_health" }, () => {
        void queryClient.invalidateQueries({ queryKey: EDGE_FUNCTION_HEALTH_QUERY_KEY });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
