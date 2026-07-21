import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Shared "needs attention" alerting for helpdesk tickets, used by both the Overview
 * board and the Tickets list so opening a ticket in either place is remembered
 * everywhere, and only one alert loop / chime runs regardless of how many pages are open.
 *
 * A ticket alerts (flashes + chimes) while either is true:
 *  - it's unstaged and hasn't been opened AND replied to yet
 *  - its deadline has passed and it hasn't been closed yet
 */

interface AlertableTicket {
  id: string;
  stage_id: string | null;
  first_response_at?: string | null;
  deadline?: string | null;
  closed_at?: string | null;
}

const OPENED_TICKETS_STORAGE_KEY = "helpdesk-unstaged-opened-ticket-ids";
const CHIME_INTERVAL_MS = 6000;
const OVERDUE_CHECK_INTERVAL_MS = 30000;

const loadOpenedTicketIds = (): Set<string> => {
  try {
    const raw = window.localStorage.getItem(OPENED_TICKETS_STORAGE_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const saveOpenedTicketIds = (ids: Set<string>) => {
  try {
    window.localStorage.setItem(OPENED_TICKETS_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage failures (private browsing, quota, etc.)
  }
};

// A short three-note ascending alert chime, synthesized so no audio asset is needed.
export const playAlertJingle = () => {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const notes = [660, 880, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.16;
      const end = start + 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), (notes.length * 0.16 + 0.3) * 1000);
  } catch {
    // ignore audio failures (autoplay restrictions, unsupported browser, etc.)
  }
};

export const useHelpdeskTicketAlerts = (tickets: AlertableTicket[]) => {
  const [openedTicketIds, setOpenedTicketIds] = useState<Set<string>>(() => loadOpenedTicketIds());

  const markTicketOpened = useCallback((ticketId: string) => {
    setOpenedTicketIds((prev) => {
      if (prev.has(ticketId)) return prev;
      const next = new Set(prev);
      next.add(ticketId);
      saveOpenedTicketIds(next);
      return next;
    });
  }, []);

  // Ticks so a ticket starts alerting the moment its deadline passes, without needing a refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), OVERDUE_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  const alertingTicketIds = useMemo(() => {
    const ids = new Set<string>();
    tickets.forEach((t) => {
      // Unstaged tickets keep flashing + chiming until they've been opened AND replied to.
      const isUnstagedAlert = !t.stage_id && (!openedTicketIds.has(t.id) || !t.first_response_at);
      // Overdue tickets flash regardless of stage/response, until closed.
      const isOverdueAlert = !!t.deadline && !t.closed_at && new Date(t.deadline).getTime() <= now;
      if (isUnstagedAlert || isOverdueAlert) ids.add(t.id);
    });
    return ids;
  }, [tickets, openedTicketIds, now]);

  const seenAlertIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    const hasNewAlert = [...alertingTicketIds].some((id) => !seenAlertIds.current.has(id));
    if (hasNewAlert) playAlertJingle();
    seenAlertIds.current = new Set(alertingTicketIds);
  }, [alertingTicketIds]);

  // Keep chiming, on a short loop, until every alerting ticket has been resolved.
  const hasActiveAlerts = alertingTicketIds.size > 0;
  useEffect(() => {
    if (!hasActiveAlerts) return;
    const interval = window.setInterval(() => playAlertJingle(), CHIME_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [hasActiveAlerts]);

  return { alertingTicketIds, markTicketOpened };
};
