import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getOperatorAttentionItems, isOperatorAttentionSnoozed, type AttentionTask, type AttentionTicket } from "./operatorAttention";
import { playAlertJingle } from "@/features/admin/helpdesk/hooks/useHelpdeskTicketAlerts";
import { useAuth } from "@/contexts/AuthContext";

const SOUND_WINDOW_MS = 60_000;
const SOUND_INTERVAL_MS = 6_000;
const CHECK_INTERVAL_MS = 30_000;
export const useOperatorAttentionAlerts = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());
  const [pendingSnoozedUntil, setPendingSnoozedUntil] = useState<number | null>(null);
  const alertStartedAt = useRef<Map<string, number>>(new Map());
  const soundedAt = useRef<Map<string, number>>(new Map());

  const snoozeQuery = useQuery<number | null>({
    queryKey: ["operator-attention-snooze", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("operator_attention_snoozes")
        .select("snoozed_until")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const until = data?.snoozed_until ? Date.parse(data.snoozed_until) : NaN;
      return Number.isFinite(until) && until > Date.now() ? until : null;
    },
    refetchInterval: CHECK_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const persistedSnoozedUntil = snoozeQuery.data ?? null;
  const snoozedUntil = pendingSnoozedUntil ?? persistedSnoozedUntil;
  const snoozeMutation = useMutation({
    mutationFn: async (until: number) => {
      if (!user) throw new Error("Sign in to snooze attention alerts.");
      const { error } = await (supabase as any)
        .from("operator_attention_snoozes")
        .upsert(
          { user_id: user.id, snoozed_until: new Date(until).toISOString() },
          { onConflict: "user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      setPendingSnoozedUntil(null);
      queryClient.invalidateQueries({ queryKey: ["operator-attention-snooze", user?.id] });
    },
    onError: () => setPendingSnoozedUntil(null),
  });

  const ticketsQuery = useQuery({
    queryKey: ["operator-attention-helpdesk-tickets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_tickets")
        .select("id,ticket_number,title,stage_id,deadline,closed_at,stage:helpdesk_ticket_stages(name,is_closed)")
        .is("closed_at", null)
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AttentionTicket[];
    },
    refetchInterval: CHECK_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const tasksQuery = useQuery({
    queryKey: ["operator-attention-crm-tasks"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("activities")
        .select("id,activity_type,due_at,status")
        .not("status", "in", "(completed,cancelled)")
        .not("due_at", "is", null)
        .limit(300);
      if (error) throw error;
      return (data ?? []) as AttentionTask[];
    },
    refetchInterval: CHECK_INTERVAL_MS,
    refetchIntervalInBackground: false,
  });

  const items = useMemo(
    () => getOperatorAttentionItems({ tickets: ticketsQuery.data ?? [], tasks: tasksQuery.data ?? [], now }),
    [now, tasksQuery.data, ticketsQuery.data],
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const activeIds = new Set(items.map((item) => item.id));
    for (const id of alertStartedAt.current.keys()) {
      if (!activeIds.has(id)) {
        alertStartedAt.current.delete(id);
        soundedAt.current.delete(id);
      }
    }

    if (isOperatorAttentionSnoozed(snoozedUntil, now)) return;

    for (const item of items) {
      const startedAt = alertStartedAt.current.get(item.id) ?? now;
      alertStartedAt.current.set(item.id, startedAt);
      const lastSoundAt = soundedAt.current.get(item.id);
      if (now - startedAt < SOUND_WINDOW_MS && (!lastSoundAt || now - lastSoundAt >= SOUND_INTERVAL_MS)) {
        playAlertJingle();
        soundedAt.current.set(item.id, now);
      }
    }
  }, [items, now, snoozedUntil]);

  const snooze = (durationMs: number) => {
    const until = Date.now() + durationMs;
    setPendingSnoozedUntil(until);
    snoozeMutation.mutate(until);
  };

  return {
    items,
    isLoading: ticketsQuery.isLoading || tasksQuery.isLoading,
    isSnoozed: isOperatorAttentionSnoozed(snoozedUntil, now),
    snooze,
  };
};
