import { useLocation, useNavigate } from "react-router";
import { FileSignature, MessageCircle, MessageSquareText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

const QuoteFormSection = () => {
  const { user } = useAuth();
  const { emulation, identity } = usePortalIdentity();
  const location = useLocation();
  const navigate = useNavigate();
  const { openAssistant } = useCompanionAssistant();
  const activeCustomerId = typeof identity?.crmCustomerId === "number" ? identity.crmCustomerId : null;
  const { data: quotes = [], isLoading } = useQuery({
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileSignature className="h-5 w-5" />
          Quote Requests
        </CardTitle>
        <CardDescription>Start quote requests in the assistant and track their status here.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div><p className="text-sm font-semibold text-foreground">Start a quote request</p><p className="text-sm text-muted-foreground">The assistant collects the customer and product details, then asks you to confirm before submitting.</p></div>
          <Button type="button" onClick={() => openAssistant({ formKind: "quote_request", formValues: { summary: (location.state as { prefillNote?: string } | null)?.prefillNote ?? "" } })} disabled={!!emulation} title={emulation ? "Submitting is disabled while emulating a customer" : undefined}><MessageCircle className="mr-2 h-4 w-4" />Request a quote</Button>
        </div>
        <div className="space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading quote requests…</p> : null}
          {!isLoading && !quotes.length ? <p className="text-sm text-muted-foreground">No quote requests yet.</p> : null}
          {quotes.map((quote) => (
            <div key={quote.id} className="space-y-3 rounded-lg border p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">{quote.quote_number} · {quote.customer_name || "Quote request"}</p>
                  <p className="text-muted-foreground">{quote.status} · {new Date(quote.created_at).toLocaleString()}</p>
                </div>
                {quote.ticket ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/profile/helpdesk/${quote.ticket.id}`)}>
                    <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                    View conversation
                  </Button>
                ) : null}
              </div>
              {quote.notes_customer ? <p className="whitespace-pre-wrap text-foreground">{quote.notes_customer}</p> : null}
              {quote.ticket ? (
                <p className="text-xs text-muted-foreground">
                  Helpdesk {quote.ticket.ticket_number} · {quote.ticket.closed_at || quote.ticket.stage?.is_closed ? "Closed" : quote.ticket.stage?.name || "Open"}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Legacy request · No Helpdesk conversation</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuoteFormSection;
