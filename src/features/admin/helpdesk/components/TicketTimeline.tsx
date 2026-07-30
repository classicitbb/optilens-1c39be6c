import { useHelpdeskMessages } from "../hooks/useHelpdeskMessages";
import { useHelpdeskTicketTimeline } from "../hooks/useHelpdeskTicketTimeline";
import type { HelpdeskTicketMessage } from "../hooks/useHelpdeskMessages";
import type { HelpdeskTicketEvent } from "../hooks/useHelpdeskTicketTimeline";
import { TicketMessageBubble } from "./TicketMessageBubble";
import { TicketActivityEntry } from "./TicketActivityEntry";
import { TicketOpeningMessage } from "./TicketOpeningMessage";
import { Loader2 } from "lucide-react";
import type { HelpdeskTicketDetail } from "../hooks/useHelpdeskTicketDetail";

type TimelineItem =
  | { kind: "opening"; ts: number; data: HelpdeskTicketDetail }
  | { kind: "message"; ts: number; data: HelpdeskTicketMessage }
  | { kind: "activity"; ts: number; data: HelpdeskTicketEvent };

interface TicketTimelineProps {
  ticket: HelpdeskTicketDetail;
}

export const TicketTimeline = ({ ticket }: TicketTimelineProps) => {
  const ticketId = ticket.id;
  const { data: messages = [], isLoading: loadingMessages } = useHelpdeskMessages(ticketId);
  const { data: events = [], isLoading: loadingEvents } = useHelpdeskTicketTimeline(ticketId);

  const isLoading = loadingMessages || loadingEvents;

  const items: TimelineItem[] = [
    { kind: "opening", ts: new Date(ticket.created_at).getTime(), data: ticket },
    ...messages.map((m) => ({ kind: "message" as const, ts: new Date(m.sent_at).getTime(), data: m })),
    ...events.map((e) => ({ kind: "activity" as const, ts: new Date(e.created_at).getTime(), data: e })),
  ].sort((a, b) => a.ts - b.ts || (a.kind === "opening" ? -1 : b.kind === "opening" ? 1 : 0));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 size={18} className="animate-spin mr-2" />
        <span className="text-sm">Loading conversation…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {items.map((item) => {
        if (item.kind === "opening") {
          return <TicketOpeningMessage key={`opening-${item.data.id}`} ticket={item.data} />;
        }
        if (item.kind === "message") {
          return <TicketMessageBubble key={`msg-${item.data.id}`} message={item.data} />;
        }
        return <TicketActivityEntry key={`evt-${item.data.id}`} event={item.data} />;
      })}
    </div>
  );
};
