import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { FileSignature, Plus, Loader2, MessageSquareText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

const QuoteFormSection = () => {
  const { user } = useAuth();
  const { emulation, identity } = usePortalIdentity();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [customerName, setCustomerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Lazy initializer: seeds once from an "Add to Rx" navigation off the
  // pricelist page (state.prefillNote), then behaves as a normal textarea.
  const [notes, setNotes] = useState(() => (location.state as { prefillNote?: string } | null)?.prefillNote ?? "");
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; number: string } | null>(null);
  const canSubmit = customerName.trim().length > 0 && notes.trim().length > 0;
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

  const submitQuote = async () => {
    if (!user || !canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase.rpc as any)("submit_customer_quote_request", {
        p_customer_name: customerName.trim(),
        p_request_details: notes.trim(),
        p_account_id: activeCustomerId,
      });
      if (error) {
        toast({ title: "Error", description: error.message || "Failed to submit quote request.", variant: "destructive" });
        return;
      }
      const result = Array.isArray(data) ? data[0] : data;
      setSubmittedTicket({ id: result.ticket_id, number: result.ticket_number });
      setCustomerName("");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["customer-quotes", emulation?.userId ?? user.id] });
      toast({ title: "Quote request submitted", description: `Helpdesk ticket ${result.ticket_number} was created for replies.` });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <FileSignature className="h-5 w-5" />
          Quote Requests
        </CardTitle>
        <CardDescription>Submit quote requests and track their status.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submitQuote();
          }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Start a quote request</h3>
              <p className="text-sm text-muted-foreground">Share the customer and product details so we can prepare pricing.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="quote-customer-name">Customer or business</Label>
              <Input
                id="quote-customer-name"
                name="customer-name"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                placeholder="Enter a customer or business name…"
                autoComplete="organization"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quote-request-details">Request details</Label>
              <Textarea
                id="quote-request-details"
                name="request-details"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Tell us what products and quantities you need…"
                className="min-h-24 resize-y"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit || !!emulation || isSubmitting} title={emulation ? "Submitting is disabled while emulating a customer" : undefined}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? "Submitting…" : "Submit quote request"}
            </Button>
          </div>
        </form>
        {submittedTicket ? (
          <div className="flex flex-col gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Request sent and locked</p>
              <p className="text-sm text-muted-foreground">Use Helpdesk ticket {submittedTicket.number} for corrections, questions, and replies.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/profile/helpdesk/${submittedTicket.id}`)}>
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              View conversation
            </Button>
          </div>
        ) : null}
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
