import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getOperatorAttentionItems, isOperatorAttentionSnoozed, type AttentionTask, type AttentionTicket } from "./operatorAttention";
import { playAlertJingle } from "@/features/admin/helpdesk/hooks/useHelpdeskTicketAlerts";

const SOUND_WINDOW_MS = 60_000;
const SOUND_INTERVAL_MS = 6_000;
const CHECK_INTERVAL_MS = 30_000;
const SNOOZE_STORAGE_KEY = "operator-attention-snoozed-until";

const readSnoozedUntil = () => {
  try {
    const value = Number(window.localStorage.getItem(SNOOZE_STORAGE_KEY));
    return Number.isFinite(value) && value > Date.now() ? value : null;
  } catch {
    return null;
  }
};

export const useOperatorAttentionAlerts = () => {
  const [now, setNow] = useState(() => Date.now());
  const [snoozedUntil, setSnoozedUntil] = useState(readSnoozedUntil);
  const alertStartedAt = useRef<Map<string, number>>(new Map());
  const soundedAt = useRef<Map<string, number>>(new Map());

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
        .neq("status", "completed")
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
    setSnoozedUntil(until);
    try {
      window.localStorage.setItem(SNOOZE_STORAGE_KEY, String(until));
    } catch {
      // The in-memory timer still provides snooze when browser storage is unavailable.
    }
  };

  return {
    items,
    isLoading: ticketsQuery.isLoading || tasksQuery.isLoading,
    isSnoozed: isOperatorAttentionSnoozed(snoozedUntil, now),
    snooze,
  };
};
