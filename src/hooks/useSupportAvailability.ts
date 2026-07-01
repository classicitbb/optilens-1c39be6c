import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSupportAvailability = () => {
  const query = useQuery({
    queryKey: ["support-availability"],
    queryFn: async () => {
      const recentCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as any)
        .from("user_presence")
        .select("user_id", { count: "exact" })
        .in("role_scope", ["admin", "staff"])
        .gte("last_heartbeat_at", recentCutoff)
        .neq("status", "offline");
      if (error) throw error;
      return { onlineSupportCount: data?.length ?? 0 };
    },
    refetchInterval: 90_000,
    refetchIntervalInBackground: false,
  });

  return {
    ...query,
    onlineSupportCount: query.data?.onlineSupportCount ?? 0,
    hasAvailableSupport: (query.data?.onlineSupportCount ?? 0) > 0,
  };
};
