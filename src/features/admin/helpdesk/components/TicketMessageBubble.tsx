import { format } from "date-fns";
import { Lock, Mail, User } from "lucide-react";
import { RichMarkdown } from "@/components/content/RichMarkdown";
import { HelpdeskImageAttachments } from "@/components/account/HelpdeskImageAttachments";
import { HelpdeskMessageAuthorControls, RETRACTED_MESSAGE_LABEL } from "@/components/account/HelpdeskMessageActions";
import { useAuth } from "@/contexts/AuthContext";
import type { HelpdeskAttachment } from "@/lib/helpdeskAttachments";
import type { HelpdeskTicketMessage } from "../hooks/useHelpdeskMessages";

interface TicketMessageBubbleProps {
  message: HelpdeskTicketMessage;
  attachments?: HelpdeskAttachment[];
}

export const TicketMessageBubble = ({ message, attachments = [] }: TicketMessageBubbleProps) => {
  const { user } = useAuth();
  const retracted = !!message.retracted_at;
  const canChange = !retracted && !!user && message.sender_user_id === user.id;
  const time = format(new Date(message.sent_at), "MMM d, h:mm a");
  const senderLabel = message.sender_name ?? message.sender_email ?? "Unknown";
  const files = attachments.length && !retracted
    ? <div className="mt-2"><HelpdeskImageAttachments ticketId={message.ticket_id} attachments={attachments} onFilesChange={() => undefined} disabled readOnly /></div>
    : null;

  const timeLabel = message.edited_at && !retracted ? `${time} · edited` : time;
  const retractedNotice = <p className="text-sm italic opacity-70">{RETRACTED_MESSAGE_LABEL}</p>;

  if (message.direction === "internal_note") {
    return (
      <HelpdeskMessageAuthorControls ticketId={message.ticket_id} messageId={message.id} body={message.body} audience="your team">
        {({ editor, actions }) => (
          <div className="w-full rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 mb-1.5 text-xs text-amber-400">
              <Lock size={11} />
              <span className="font-medium">{senderLabel}</span>
              <span className="opacity-60">Internal note · {timeLabel}</span>
              {canChange ? <span className="ml-auto text-muted-foreground">{actions}</span> : null}
            </div>
            {canChange && editor ? editor : (
              <div className="text-foreground/80">
                {retracted ? retractedNotice : <RichMarkdown content={message.body} />}
              </div>
            )}
            {files}
          </div>
        )}
      </HelpdeskMessageAuthorControls>
    );
  }

  const isOutbound = message.direction === "outbound";

  return (
    <HelpdeskMessageAuthorControls ticketId={message.ticket_id} messageId={message.id} body={message.body} audience="the customer">
      {({ editor, actions }) => (
        <div className={`flex w-full flex-col gap-1 ${isOutbound ? "items-end" : "items-start"}`}>
          {canChange && editor ? editor : (
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 ${
                isOutbound
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground border border-border"
              }`}
            >
              <div className="text-inherit">
                {retracted ? retractedNotice : <RichMarkdown content={message.body} tone={isOutbound ? "user" : "assistant"} />}
              </div>
              {files}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1">
            {isOutbound ? <User size={10} /> : <Mail size={10} />}
            <span>{senderLabel}</span>
            <span>·</span>
            <span>{timeLabel}</span>
            {canChange ? <><span>·</span>{actions}</> : null}
          </div>
        </div>
      )}
    </HelpdeskMessageAuthorControls>
  );
};
