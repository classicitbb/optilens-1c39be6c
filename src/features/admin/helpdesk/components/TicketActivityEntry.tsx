import { formatDistanceToNow } from "date-fns";
import type { HelpdeskTicketEvent } from "../hooks/useHelpdeskTicketTimeline";

interface TicketActivityEntryProps {
  event: HelpdeskTicketEvent;
}

const humanizeEvent = (event: HelpdeskTicketEvent): string => {
  const p = event.payload as Record<string, unknown>;

  switch (event.event_type) {
    case "ticket_created":
      return "Ticket created";
    case "ticket_closed_by_customer":
      return "Customer closed this ticket";
    case "stage_updated": {
      const prev = (p.previous_stage_name as string) ?? "—";
      const next = (p.next_stage_name as string) ?? "—";
      return `Stage changed from "${prev}" to "${next}"`;
    }
    case "ticket_assigned": {
      const to = (p.assigned_to_user_id as string) ?? "someone";
      return `Ticket assigned to ${to}`;
    }
    case "ticket_unassigned":
      return "Ticket unassigned";
    case "reply_sent":
      return "Reply sent to customer";
    case "customer_reply":
      return "Customer replied";
    default:
      return event.event_type.replace(/_/g, " ");
  }
};

export const TicketActivityEntry = ({ event }: TicketActivityEntryProps) => {
  const timeAgo = formatDistanceToNow(new Date(event.created_at), { addSuffix: true });
  const label = humanizeEvent(event);

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground py-1">
      <div className="flex-1 h-px bg-border" />
      <span className="shrink-0 whitespace-nowrap">{label} · {timeAgo}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
};
