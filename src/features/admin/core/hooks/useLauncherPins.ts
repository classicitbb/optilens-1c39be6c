import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const QUERY_KEY = ["user-launcher-pins"] as const;

// One user's own sidebar pages pinned to the app launcher (user_launcher_pins).
// Routes are admin sidebar routes; callers ignore pins that no longer resolve.
export const useLauncherPins = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery<string[]>({
    queryKey: QUERY_KEY,
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("user_launcher_pins")
        .select("route")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) throw error;
      return ((data ?? []) as { route: string }[]).map((row) => row.route);
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ route, pinned }: { route: string; pinned: boolean }) => {
      if (!user) throw new Error("Sign in to pin pages.");
      const table = (supabase as any).from("user_launcher_pins");
      const { error } = pinned
        ? await table.delete().eq("user_id", user.id).eq("route", route)
        : await table.insert({ user_id: user.id, route });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: () => toast({ title: "Couldn't update launcher pins", variant: "destructive" }),
  });

  const pinnedRoutes = query.data ?? [];
  const isPinned = (route: string) => pinnedRoutes.includes(route);
  const toggle = (route: string) => togglePin.mutate({ route, pinned: isPinned(route) });

  return { pinnedRoutes, isPinned, toggle };
};
