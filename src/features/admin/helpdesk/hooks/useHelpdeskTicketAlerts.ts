import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Shared visual "needs attention" state for helpdesk tickets, used by both the
 * Overview board and Tickets list. Global sound and banner alerting lives in the
 * admin layout so it is not duplicated when either page is open.
 *
 * A ticket is visually marked while either is true:
 *  - it's unstaged and not handled yet
 *  - its deadline has passed and it hasn't been closed yet
 */

interface AlertableTicket {
  id: string;
  stage_id: string | null;
  stage?: { is_closed: boolean } | null;
  deadline?: string | null;
  closed_at?: string | null;
}

const OVERDUE_CHECK_INTERVAL_MS = 30000;

export { playAlertSound as playAlertJingle } from "@/features/admin/notifications/alertSound";

export const useHelpdeskTicketAlerts = (tickets: AlertableTicket[]) => {
  const markTicketOpened = useCallback((_ticketId: string) => undefined, []);

  // Ticks so a ticket starts alerting the moment its deadline passes, without needing a refetch.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), OVERDUE_CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  const alertingTicketIds = useMemo(() => {
    const ids = new Set<string>();
    tickets.forEach((t) => {
      // Unstaged tickets keep flashing until the workflow reaches a closed stage.
      const isUnstagedAlert = !t.stage_id && !t.stage?.is_closed && !t.closed_at;
      // Overdue tickets flash regardless of stage/response, until closed.
      const isOverdueAlert = !!t.deadline && !t.closed_at && new Date(t.deadline).getTime() <= now;
      if (isUnstagedAlert || isOverdueAlert) ids.add(t.id);
    });
    return ids;
  }, [tickets, now]);

  return { alertingTicketIds, markTicketOpened };
};
