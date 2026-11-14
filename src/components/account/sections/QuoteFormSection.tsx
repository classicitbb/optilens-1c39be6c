import { useLocation, useNavigate } from "react-router";
import { MessageCircle, MessageSquareText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { AccountListTable, type AccountListColumn } from "@/components/account/AccountListTable";

const formatDate = (s: string) => new Date(s).toLocaleString();
const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase();

interface QuoteRow {
  id: string;
  quote_number: string;
  status: string;
  quote_type: string;
  created_at: string;
  customer_name: string;
  notes_customer: string | null;
  account_id: number | null;
  helpdesk_ticket_id: string | null;
  ticket: { id: string; ticket_number: string; closed_at: string | null; stage?: { name: string; is_closed: boolean } | null } | null;
}

const QuoteFormSection = () => {
  const { user } = useAuth();
  const { emulation, portalSessionEmulation, identity } = usePortalIdentity();
  // Read-only identity preview only: a real "signed in as" emulation session
  // (portalSessionEmulation) is a genuine customer auth session and gets full
  // write access, same as the customer signing in themselves.
  const submissionDisabled = !!emulation && !portalSessionEmulation;
  const location = useLocation();
  const navigate = useNavigate();
  const { openAssistant } = useCompanionAssistant();
  const activeCustomerId = typeof identity?.crmCustomerId === "number" ? identity.crmCustomerId : null;
  const { data: quotes = [], isLoading } = useQuery<QuoteRow[]>({
    queryKey: ["customer-quotes", emulation?.userId ?? user?.id, activeCustomerId],
    enabled: !!user,
    queryFn: async () => {
      // The quotes_customer view is bound to the signed-in user server-side;
      // under admin emulation read the base table (admin RLS) for the target.
      // Older quotes predate account_id (see 20260731010000_rx_order_form_schema.sql)
      // so a NULL account_id still shows under whichever account is active,
      // rather than silently disappearing from every account's list.
      const { data, error } = emulation
        ? await (supabase as any)
            .from("quotes")
            .select("id,quote_number,status,quote_type,created_at,customer_name,notes_customer,account_id,helpdesk_ticket_id")
            .eq("created_by", emulation.userId)
            .order("created_at", { ascending: false })
            .limit(20)
        : await (supabase as any)
            .from("quotes_customer")
            .select("id,quote_number,status,quote_type,created_at,customer_name,notes_customer,account_id,helpdesk_ticket_id")
            .order("created_at", { ascending: false })
            .limit(20);
      if (error) throw error;
      const rows = data as Array<{
        id: string;
        quote_number: string;
        status: string;
        quote_type: string;
        created_at: string;
        customer_name: string;
        notes_customer: string | null;
        account_id: number | null;
        helpdesk_ticket_id: string | null;
      }>;
      const scopedRows = activeCustomerId ? rows.filter((quote) => quote.account_id === null || quote.account_id === activeCustomerId) : rows;
      const ticketIds = scopedRows.flatMap((quote) => quote.helpdesk_ticket_id ? [quote.helpdesk_ticket_id] : []);
      if (!ticketIds.length) return scopedRows.map((quote) => ({ ...quote, ticket: null }));

      const { data: tickets, error: ticketError } = await (supabase as any)
        .from("helpdesk_tickets")
        .select("id,ticket_number,closed_at,stage:helpdesk_ticket_stages(name,is_closed)")
        .in("id", ticketIds);
      if (ticketError) throw ticketError;
      const ticketsById = new Map((tickets ?? []).map((ticket: any) => [ticket.id, ticket]));
      return scopedRows.map((quote) => ({ ...quote, ticket: quote.helpdesk_ticket_id ? ticketsById.get(quote.helpdesk_ticket_id) ?? null : null }));
    },
  });

  const columns: AccountListColumn<QuoteRow>[] = [
    {
      key: "name",
      label: "Request",
      sortValue: (q) => q.quote_number,
      className: "max-w-sm px-4 py-3",
      render: (q) => (
        <>
          <p className="truncate font-medium">{q.quote_number} · {q.customer_name || "Quote request"}</p>
          {q.notes_customer ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{q.notes_customer}</p> : null}
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {q.ticket
              ? `Helpdesk ${q.ticket.ticket_number} · ${q.ticket.closed_at || q.ticket.stage?.is_closed ? "Closed" : q.ticket.stage?.name || "Open"}`
              : "Legacy request · No Helpdesk conversation"}
          </p>
        </>
      ),
    },
    { key: "type", label: "Type", sortValue: (q) => q.quote_type, className: "px-4 py-3 capitalize text-muted-foreground", render: (q) => humanize(q.quote_type) },
    { key: "status", label: "Status", sortValue: (q) => q.status, render: (q) => <Badge variant="secondary" className="capitalize text-[10px]">{humanize(q.status)}</Badge> },
    { key: "updated", label: "Requested", sortValue: (q) => new Date(q.created_at).getTime(), className: "whitespace-nowrap px-4 py-3 text-muted-foreground", render: (q) => formatDate(q.created_at) },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl text-foreground">Quote Requests</h1>
        <p className="text-sm text-muted-foreground">Start quote requests in the assistant and track their status here.</p>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><p className="text-sm font-semibold text-foreground">Start a quote request</p><p className="text-sm text-muted-foreground">The assistant uses this signed-in account, lets you edit the quote title and details, then asks you to confirm before submitting.</p></div>
        <Button type="button" onClick={() => openAssistant({ formKind: "quote_request", formValues: { summary: (location.state as { prefillNote?: string } | null)?.prefillNote ?? "" } })} disabled={submissionDisabled} title={submissionDisabled ? "Submitting is disabled while previewing a customer read-only" : undefined}><MessageCircle className="mr-2 h-4 w-4" />Request a quote</Button>
      </div>
      <AccountListTable
        columns={columns}
        rows={quotes}
        rowKey={(q) => q.id}
        isLoading={isLoading}
        empty="No quote requests yet."
        defaultSort={{ key: "updated", dir: "desc" }}
        preview={(q) => <p className="whitespace-pre-wrap text-sm text-foreground">{q.notes_customer || "No details were added to this request."}</p>}
        actions={(q) => q.ticket ? (
          <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/profile/helpdesk/${q.ticket!.id}`)}>
            <MessageSquareText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            View conversation
          </Button>
        ) : null}
      />
    </div>
  );
};

export default QuoteFormSection;
