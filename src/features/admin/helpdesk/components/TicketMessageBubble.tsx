import { format } from "date-fns";
import { Lock, Mail, User } from "lucide-react";
import type { HelpdeskTicketMessage } from "../hooks/useHelpdeskMessages";

interface TicketMessageBubbleProps {
  message: HelpdeskTicketMessage;
}

export const TicketMessageBubble = ({ message }: TicketMessageBubbleProps) => {
  const time = format(new Date(message.sent_at), "MMM d, h:mm a");
  const senderLabel = message.sender_name ?? message.sender_email ?? "Unknown";

  if (message.direction === "internal_note") {
    return (
      <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
        <div className="flex items-center gap-2 mb-1.5 text-xs text-amber-400">
          <Lock size={11} />
          <span className="font-medium">{senderLabel}</span>
          <span className="opacity-60">Internal note · {time}</span>
        </div>
        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{message.body}</p>
      </div>
    );
  }

  const isOutbound = message.direction === "outbound";

  return (
    <div className={`flex flex-col gap-1 ${isOutbound ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
          isOutbound
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground border border-border"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.body}</p>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
        {isOutbound ? <User size={10} /> : <Mail size={10} />}
        <span>{senderLabel}</span>
        <span>·</span>
        <span>{time}</span>
      </div>
    </div>
  );
};
