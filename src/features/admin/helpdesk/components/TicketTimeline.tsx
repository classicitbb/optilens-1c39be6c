import { useHelpdeskMessages } from "../hooks/useHelpdeskMessages";
import { useHelpdeskTicketTimeline } from "../hooks/useHelpdeskTicketTimeline";
import type { HelpdeskTicketMessage } from "../hooks/useHelpdeskMessages";
import type { HelpdeskTicketEvent } from "../hooks/useHelpdeskTicketTimeline";
import { TicketMessageBubble } from "./TicketMessageBubble";
import { TicketActivityEntry } from "./TicketActivityEntry";
import { Loader2 } from "lucide-react";

type TimelineItem =
  | { kind: "message"; ts: number; data: HelpdeskTicketMessage }
  | { kind: "activity"; ts: number; data: HelpdeskTicketEvent };

interface TicketTimelineProps {
  ticketId: string;
}

export const TicketTimeline = ({ ticketId }: TicketTimelineProps) => {
  const { data: messages = [], isLoading: loadingMessages } = useHelpdeskMessages(ticketId);
  const { data: events = [], isLoading: loadingEvents } = useHelpdeskTicketTimeline(ticketId);

  const isLoading = loadingMessages || loadingEvents;

  const items: TimelineItem[] = [
    ...messages.map((m) => ({ kind: "message" as const, ts: new Date(m.sent_at).getTime(), data: m })),
    ...events.map((e) => ({ kind: "activity" as const, ts: new Date(e.created_at).getTime(), data: e })),
  ].sort((a, b) => a.ts - b.ts);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 size={18} className="animate-spin mr-2" />
        <span className="text-sm">Loading conversation…</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No messages yet. Use the composer below to reply or add a note.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {items.map((item) => {
        if (item.kind === "message") {
          return <TicketMessageBubble key={`msg-${item.data.id}`} message={item.data} />;
        }
        return <TicketActivityEntry key={`evt-${item.data.id}`} event={item.data} />;
      })}
    </div>
  );
};
