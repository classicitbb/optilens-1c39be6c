import { format } from "date-fns";
import { Mail } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { HelpdeskTicketDetail } from "../hooks/useHelpdeskTicketDetail";

interface TicketOpeningMessageProps {
  ticket: HelpdeskTicketDetail;
}

const assistantContextMarker = "Assistant context:";

const contextLabels: Record<string, string> = {
  route: "Page",
  assistantProfile: "Assistant mode",
  audience: "Intended for",
  accountAccessStatus: "Customer access",
  accountCustomer: "Customer account",
  market: "Market",
  issueType: "Request subject",
  productTopic: "Product or topic",
  taskContext: "Started from",
};

const friendlyValues: Record<string, string> = {
  portal_support: "Customer portal support",
  customer_support: "Customer support",
  general_search: "General website help",
  retailer_help: "Retailer help",
  dispenser: "Dispensing professional",
  approved_customer: "Approved customer",
  policy_help: "Policy help",
};

const friendlyRoutes: Record<string, string> = {
  "/profile": "My Account",
  "/profile/orders": "My Account › Orders",
  "/profile/helpdesk": "My Account › Support requests",
};

const humanize = (value: string) =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const describeRoute = (route: string) => {
  const [pathname, suffix = ""] = route.split(/(?=[?#])/u, 2);
  return `${friendlyRoutes[pathname] ?? pathname}${suffix}`;
};

const describeValue = (key: string, value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (key === "route" && typeof value === "string") return describeRoute(value);
  if (typeof value === "string") return friendlyValues[value] ?? (value.includes("_") ? humanize(value) : value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    if (value.every((item) => typeof item === "string")) return value.map(humanize).join(", ");
    return `${value.length} ${value.length === 1 ? "item" : "items"} attached`;
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([nestedKey, nestedValue]) => {
        const description = describeValue(nestedKey, nestedValue);
        return description ? `${contextLabels[nestedKey] ?? humanize(nestedKey)}: ${description}` : null;
      })
      .filter(Boolean)
      .join(" · ");
  }
  return String(value);
};

interface AssistantContextDetailsProps {
  context: unknown;
}

const AssistantContextDetails = ({ context }: AssistantContextDetailsProps) => {
  if (!context || typeof context !== "object" || Array.isArray(context)) {
    return <p className="mt-2 text-sm leading-6 text-foreground/80">{String(context)}</p>;
  }

  const contextRecord = context as Record<string, unknown>;
  const details = Object.entries(contextRecord)
    .filter(([key]) => key !== "previousResults")
    .map(([key, value]) => ({
      key,
      label: contextLabels[key] ?? humanize(key),
      value: describeValue(key, value),
    }))
    .filter((detail): detail is { key: string; label: string; value: string } => Boolean(detail.value));
  const previousResults = Array.isArray(contextRecord.previousResults) ? contextRecord.previousResults : [];

  return (
    <div className="mt-2 space-y-3 text-sm">
      {details.length ? (
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {details.map((detail) => (
            <div key={detail.key}>
              <dt className="text-xs font-medium text-muted-foreground">{detail.label}</dt>
              <dd className="mt-0.5 leading-5 text-foreground/90">{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div>
        <p className="text-xs font-medium text-muted-foreground">Earlier assistant answers</p>
        <p className="mt-0.5 leading-5 text-foreground/90">
          {previousResults.length
            ? `${previousResults.length} earlier ${previousResults.length === 1 ? "answer is" : "answers are"} attached to this request.`
            : "No earlier assistant answers."}
        </p>
      </div>
    </div>
  );
};

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
        context: JSON.parse(rawContext.slice(0, end + 1)) as unknown,
        trailingDetails: rawContext.slice(end + 1).trim() || null,
      };
    } catch {
      // Continue looking for the end of the JSON payload.
    }
  }

  try {
    return { body, context: JSON.parse(rawContext) as unknown, trailingDetails: null };
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
            <p className="text-sm font-semibold text-foreground">Request details</p>
            <AssistantContextDetails context={context} />
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
