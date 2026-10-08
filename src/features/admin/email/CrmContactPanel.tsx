import { Link } from "react-router";
import { ArrowDownLeft, ArrowUpRight, CalendarCheck, ExternalLink, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { parseContactEmails } from "@/lib/contactEmails";
import type { EmailHistoryItem } from "@/lib/emailBridge";
import { useCrmContactByEmail, useEmailHistory } from "./useEmail";
import { formatEmailDate } from "./format";

export function CrmContactPanel({ address, name }: { address: string | null; name: string | null }) {
  const { data: matches = [], isLoading } = useCrmContactByEmail(address);
  const contact = matches[0];
  const addresses = contact?.email ? parseContactEmails(contact.email).map((value) => value.toLowerCase()) : address ? [address] : [];
  const { data: history = [] } = useEmailHistory(addresses);

  if (!address) return null;
  if (isLoading) return <p className="text-xs text-[hsl(var(--admin-muted-fg))]">Looking up {address} in the CRM…</p>;

  return (
    <div className="space-y-4 text-sm">
      {contact ? (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--admin-muted-fg))]">CRM contact</h3>
          <div>
            <div className="font-semibold">{contact.business_name || contact.name}</div>
            {contact.business_name && contact.name !== contact.business_name ? <div className="text-xs text-[hsl(var(--admin-muted-fg))]">{contact.name}</div> : null}
          </div>
          <div className="flex flex-wrap gap-1">
            {contact.is_customer ? <Badge variant="secondary">Customer</Badge> : <Badge variant="outline">Not a customer</Badge>}
            {contact.linked_customer_id ? <Badge variant="outline" className="font-mono">Account #{contact.linked_customer_id}</Badge> : null}
          </div>
          {contact.phone ? <div className="text-xs">{contact.phone}</div> : null}
          <div className="flex flex-col gap-1.5 pt-1">
            <Button asChild size="sm" variant="outline" className="justify-start">
              <Link to={`/admin/crm/contacts?contact=${contact.id}&tab=email`}><ExternalLink className="mr-1 h-4 w-4" /> Open in CRM</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="justify-start">
              <Link to="/admin/crm/activities?create=1"><CalendarCheck className="mr-1 h-4 w-4" /> Create task</Link>
            </Button>
          </div>
          {matches.length > 1 ? <p className="text-xs text-[hsl(var(--admin-muted-fg))]">{matches.length - 1} more contact{matches.length > 2 ? "s" : ""} share this address.</p> : null}
        </section>
      ) : (
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--admin-muted-fg))]">Not in CRM</h3>
          <p className="text-xs text-[hsl(var(--admin-muted-fg))]">{name ? `${name} (${address})` : address} doesn't match a contact, so these emails don't show on anyone's history yet.</p>
          <Button asChild size="sm" variant="outline" className="justify-start">
            <Link to="/admin/crm/contacts"><UserPlus className="mr-1 h-4 w-4" /> Add in CRM Contacts</Link>
          </Button>
        </section>
      )}
      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--admin-muted-fg))]">Email history</h3>
        <EmailHistoryList items={history.slice(0, 8)} />
      </section>
    </div>
  );
}

export function EmailHistoryList({ items }: { items: EmailHistoryItem[] }) {
  if (!items.length) return <p className="text-xs text-[hsl(var(--admin-muted-fg))]">No emails in the last 90 days.</p>;
  return (
    <ol className="space-y-2 border-l border-[hsl(var(--admin-border))] pl-3">
      {items.map((item) => (
        <li key={item.message_id} className="text-xs">
          <div className="flex items-center gap-1 text-[hsl(var(--admin-muted-fg))]">
            {item.direction === "received" ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
            {item.direction === "received" ? "Received" : "Sent"} · {formatEmailDate(item.sent_at)}
          </div>
          <Link to={`/admin/email?message=${item.message_id}&folder=${item.folder_id}`} className="line-clamp-2 hover:underline">
            {item.subject || "(no subject)"}
          </Link>
        </li>
      ))}
    </ol>
  );
}
