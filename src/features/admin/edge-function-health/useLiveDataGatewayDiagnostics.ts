import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LiveDataGatewayAgent = {
  agent_name: string;
  agent_version: string | null;
  capabilities: string[];
  connected_at: string;
  last_seen_at: string;
  last_error: string | null;
};

export type LiveDataGatewayRequestLogEntry = {
  id: number;
  action: string;
  operation: string | null;
  status_code: number;
  latency_ms: number;
  created_at: string;
};

export const AGENT_ONLINE_MS = 90_000;
const REQUEST_LOG_LIMIT = 50;
const LIVE_DATA_GATEWAY_DIAGNOSTICS_QUERY_KEY = ["live-data-gateway-diagnostics"] as const;

export function useLiveDataGatewayDiagnostics() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: LIVE_DATA_GATEWAY_DIAGNOSTICS_QUERY_KEY,
    queryFn: async () => {
      const [agentResult, logResult] = await Promise.all([
        (supabase as any)
          .from("live_data_gateway_agents")
          .select("agent_name,agent_version,capabilities,connected_at,last_seen_at,last_error")
          .order("last_seen_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from("live_data_gateway_request_log")
          .select("id,action,operation,status_code,latency_ms,created_at")
          .order("created_at", { ascending: false })
          .limit(REQUEST_LOG_LIMIT),
      ]);
      if (agentResult.error) throw agentResult.error;
      if (logResult.error) throw logResult.error;
      return {
        agent: (agentResult.data ?? null) as LiveDataGatewayAgent | null,
        requestLog: (logResult.data ?? []) as LiveDataGatewayRequestLogEntry[],
      };
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("live-data-gateway-diagnostics")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_data_gateway_agents" }, () => {
        void queryClient.invalidateQueries({ queryKey: LIVE_DATA_GATEWAY_DIAGNOSTICS_QUERY_KEY });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_data_gateway_request_log" }, () => {
        void queryClient.invalidateQueries({ queryKey: LIVE_DATA_GATEWAY_DIAGNOSTICS_QUERY_KEY });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
