import { Link } from "react-router";
import { parseContactEmails } from "@/lib/contactEmails";
import { getEmailBridgeUrl } from "@/lib/emailBridge";
import { EmailHistoryList } from "./CrmContactPanel";
import { useEmailHistory } from "./useEmail";

// Contact dialog tab: every company email to or from this contact's
// addresses, read live from the mail bridge. Nothing is copied into the CRM.
export function ContactEmailHistory({ email }: { email: string | null | undefined }) {
  const addresses = parseContactEmails(email ?? "").map((value) => value.toLowerCase());
  const history = useEmailHistory(addresses);

  if (!addresses.length) return <p className="text-xs text-muted-foreground">Add an email address to this contact to see their email history.</p>;
  if (!getEmailBridgeUrl()) return <p className="text-xs text-muted-foreground">Email isn't connected yet. <Link to="/admin/email" className="underline">Open Email</Link> for details.</p>;
  if (history.isLoading) return <p className="text-xs text-muted-foreground">Loading email history…</p>;
  if (history.isError) return <p className="text-xs text-destructive">{history.error instanceof Error ? history.error.message : "Email history is unavailable."}</p>;

  const items = history.data ?? [];
  const received = items.filter((item) => item.direction === "received").length;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {items.length ? `${received} received and ${items.length - received} sent in the last 90 days, matched on ${addresses.join(", ")}.` : null}
      </p>
      <EmailHistoryList items={items} />
    </div>
  );
}
