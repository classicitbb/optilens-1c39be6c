import { format } from "date-fns";
import { Mail } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { HelpdeskTicketDetail } from "../hooks/useHelpdeskTicketDetail";

interface TicketOpeningMessageProps {
  ticket: HelpdeskTicketDetail;
}

const assistantContextMarker = "Assistant context:";

const splitAssistantContext = (description: string) => {
  const markerIndex = description.indexOf(assistantContextMarker);
  if (markerIndex === -1) return { body: description.trim(), context: null, trailingDetails: null };

  const body = description.slice(0, markerIndex).trim();
  const rawContext = description.slice(markerIndex + assistantContextMarker.length).trim();

  if (!rawContext) return { body, context: null, trailingDetails: null };

  // Assistant requests sometimes append fields (for example, a phone number)
  // after the JSON context. Parse the longest valid JSON prefix, preserving
  // that appended information as ordinary rich text below it.
  for (let end = rawContext.lastIndexOf("}"); end >= 0; end = rawContext.lastIndexOf("}", end - 1)) {
    try {
      return {
        body,
        context: JSON.stringify(JSON.parse(rawContext.slice(0, end + 1)), null, 2),
        trailingDetails: rawContext.slice(end + 1).trim() || null,
      };
    } catch {
      // Continue looking for the end of the JSON payload.
    }
  }

  try {
    return { body, context: JSON.stringify(JSON.parse(rawContext), null, 2), trailingDetails: null };
  } catch {
    return { body, context: rawContext, trailingDetails: null };
  }
};

/** The original ticket request is a conversation item, not header metadata. */
export const TicketOpeningMessage = ({ ticket }: TicketOpeningMessageProps) => {
  const time = format(new Date(ticket.created_at), "MMM d, h:mm a");
  const senderLabel = ticket.partner_contact?.name ?? ticket.customer_email ?? "Customer";
  const { body, context, trailingDetails } = splitAssistantContext(ticket.description ?? "");

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[80%] rounded-xl border border-border bg-muted px-4 py-3 text-foreground">
        <p className="text-sm font-semibold leading-6">{ticket.title}</p>
        {body && (
          <div className="prose prose-sm mt-2 max-w-none leading-6 text-foreground [&_p]:my-0 [&_ul]:my-2 [&_ol]:my-2">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        )}
        {context && (
          <div className="mt-3 rounded-md border border-border/70 bg-background/60 p-3">
            <p className="text-xs font-medium text-muted-foreground">Assistant context</p>
            <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-foreground/80">
              {context}
            </pre>
          </div>
        )}
        {trailingDetails && (
          <div className="prose prose-sm mt-3 max-w-none leading-6 text-foreground [&_p]:my-0 [&_ul]:my-2 [&_ol]:my-2">
            <ReactMarkdown>{trailingDetails}</ReactMarkdown>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <Mail size={10} />
        <span>{senderLabel}</span>
        <span>·</span>
        <span>{time}</span>
      </div>
    </div>
  );
};
