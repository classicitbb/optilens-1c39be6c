import { useHelpdeskMessages } from "../hooks/useHelpdeskMessages";
import { useHelpdeskTicketTimeline } from "../hooks/useHelpdeskTicketTimeline";
import type { HelpdeskTicketMessage } from "../hooks/useHelpdeskMessages";
import type { HelpdeskTicketEvent } from "../hooks/useHelpdeskTicketTimeline";
import { TicketMessageBubble } from "./TicketMessageBubble";
import { TicketActivityEntry } from "./TicketActivityEntry";
import { TicketOpeningMessage } from "./TicketOpeningMessage";
import { useLiveHelpdeskTicketUpdates } from "../hooks/useLiveHelpdeskUpdates";
import { useScrollToLatestMessage } from "../hooks/useScrollToLatestMessage";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  useLiveHelpdeskTicketUpdates(ticketId);
  const { data: messages = [], isLoading: loadingMessages } = useHelpdeskMessages(ticketId);
  const { data: events = [], isLoading: loadingEvents } = useHelpdeskTicketTimeline(ticketId);

  const isLoading = loadingMessages || loadingEvents;

  const items: TimelineItem[] = [
    { kind: "opening" as const, ts: new Date(ticket.created_at).getTime(), data: ticket },
    ...messages.map((m) => ({ kind: "message" as const, ts: new Date(m.sent_at).getTime(), data: m })),
    ...events.map((e) => ({ kind: "activity" as const, ts: new Date(e.created_at).getTime(), data: e })),
  ].sort((a, b) => a.ts - b.ts || (a.kind === "opening" ? -1 : b.kind === "opening" ? 1 : 0));

  const latest = items[items.length - 1];
  // A message from anyone else reads from its first line down; your own send
  // just needs the thread to sit at the bottom.
  const latestIsIncoming = latest?.kind === "message" && latest.data.sender_user_id !== user?.id;
  const latestRef = useScrollToLatestMessage(
    isLoading ? undefined : `${latest?.kind}-${latest?.ts}-${items.length}`,
    latestIsIncoming ? "start" : "end",
  );

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
      {items.map((item, index) => {
        const isLatest = index === items.length - 1;
        const content =
          item.kind === "opening" ? (
            <TicketOpeningMessage ticket={item.data} />
          ) : item.kind === "message" ? (
            <TicketMessageBubble message={item.data} />
          ) : (
            <TicketActivityEntry event={item.data} />
          );
        return (
          <div key={`${item.kind}-${item.data.id}`} ref={isLatest ? latestRef : undefined}>
            {content}
          </div>
        );
      })}
    </div>
  );
};
