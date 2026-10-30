import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TourProgressRow {
  tour_id: string;
  seen_at: string | null;
  completed_at: string | null;
}

const db = supabase as any;

/**
 * Per-user tour progress. It only decides whether a tour launches by itself on a first visit;
 * replays from the help panel or the Training hub ignore it.
 */
export const useTourProgress = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["user_tour_progress", user?.id];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await db.from("user_tour_progress").select("tour_id, seen_at, completed_at");
      if (error) throw error;
      return (data ?? []) as TourProgressRow[];
    },
    enabled: !!user,
    // A missing table (migration not applied yet) must not retry or auto-launch tours.
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const record = useCallback(
    async (tourId: string, patch: { seen_at?: string; completed_at?: string; last_step?: number }) => {
      if (!user) return;
      const { error } = await db
        .from("user_tour_progress")
        .upsert({ user_id: user.id, tour_id: tourId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id,tour_id" });
      if (error) console.warn("Could not save tour progress", error);
      else qc.invalidateQueries({ queryKey: ["user_tour_progress", user.id] });
    },
    [qc, user],
  );

  return {
    progress: query.data,
    /** True only once progress has loaded, so a failed load never counts as "not seen". */
    isLoaded: query.isSuccess,
    record,
  };
};
