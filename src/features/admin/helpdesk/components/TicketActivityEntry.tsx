import { formatDistanceToNow } from "date-fns";
import type { HelpdeskTicketEvent } from "../hooks/useHelpdeskTicketTimeline";
import { useHelpdeskStages } from "../hooks/useHelpdeskStages";

interface TicketActivityEntryProps {
  event: HelpdeskTicketEvent;
}

const humanizeEvent = (
  event: HelpdeskTicketEvent,
  stageNames: Record<string, string>,
): string => {
  const p = (event.payload ?? {}) as Record<string, unknown>;
  const stageName = (nameKey: string, idKey: string) => {
    const explicit = p[nameKey] as string | undefined;
    if (explicit) return explicit;
    const id = p[idKey] as string | undefined;
    if (!id) return "Unassigned";
    return stageNames[id] ?? "Unknown stage";
  };

  switch (event.event_type) {
    case "ticket_created":
      return "Ticket created";
    case "ticket_closed_by_customer":
      return "Customer closed this ticket";
    case "stage_updated": {
      const prev = stageName("previous_stage_name", "previous_stage_id");
      const next = stageName("next_stage_name", "next_stage_id");
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
