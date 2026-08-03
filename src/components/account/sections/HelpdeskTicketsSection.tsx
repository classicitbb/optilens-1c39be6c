import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { LifeBuoy, Plus, ChevronRight, Phone, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { COMPANY_CONTACT } from "@/config/companyContact";

// Other pages (e.g. a failed checkout payment) can deep-link here with
// router state to prefill a new ticket — see CheckoutPage.tsx's "Contact us"
// on the declined/error screen.
interface HelpdeskPrefillState {
  prefillTitle?: string;
  prefillDescription?: string;
}

const HelpdeskTicketsSection = () => {
  const { identity, emulation, effectiveUserId } = usePortalIdentity();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const prefill = (location.state as HelpdeskPrefillState | null) ?? null;
  const [title, setTitle] = useState(prefill?.prefillTitle ?? "");
  const [description, setDescription] = useState(prefill?.prefillDescription ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  // Apply a fresh prefill if the user navigates here again with new state
  // (e.g. a second failed payment) without a full page reload.
  useEffect(() => {
    if (prefill?.prefillTitle) setTitle(prefill.prefillTitle);
    if (prefill?.prefillDescription) setDescription(prefill.prefillDescription);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);
  const { data: tickets = [] } = useQuery({
    queryKey: ["customer-helpdesk", effectiveUserId, identity?.crmContactId],
    enabled: !!user,
    queryFn: async () => {
      let query = (supabase as any)
        .from("helpdesk_tickets")
        .select("id,ticket_number,title,description,source_channel,created_at,closed_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (identity?.crmContactId) {
        query = query.eq("partner_contact_id", identity.crmContactId);
      } else {
        query = query.eq("owner_user_id", effectiveUserId ?? user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Array<{ id: string; ticket_number: string; title: string; description: string; source_channel: string; created_at: string; closed_at: string | null }>;
    },
  });

  const createTicket = async () => {
    if (!user || !canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await (supabase as any).from("helpdesk_tickets").insert({
        ticket_number: `PTL-${Date.now().toString().slice(-8)}`,
        title: title.trim(),
        description: description.trim(),
        source_channel: "portal",
        owner_user_id: user.id,
        partner_contact_id: identity?.crmContactId ?? null,
        priority: 1,
        opened_at: new Date().toISOString(),
      });
      if (error) {
        toast({ title: "Error", description: error.message || "Failed to create helpdesk ticket.", variant: "destructive" });
        return;
      }
      setTitle("");
      setDescription("");
      await queryClient.invalidateQueries({ queryKey: ["customer-helpdesk", effectiveUserId, identity?.crmContactId] });
      toast({ title: "Ticket created", description: "Your support ticket has been submitted." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <LifeBuoy className="h-5 w-5" />
          Helpdesk Tickets
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>Create tickets and follow updates from support.</span>
          <span className="text-muted-foreground/60">·</span>
          <a
            href={COMPANY_CONTACT.phoneHref}
            className="inline-flex items-center gap-1 text-secondary underline underline-offset-2 hover:text-secondary/80"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {COMPANY_CONTACT.phoneDisplay}
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void createTicket();
          }}
        >
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Start a support request</h3>
              <p className="text-sm text-muted-foreground">Tell us what happened and our team will follow up.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div className="space-y-1.5">
              <Label htmlFor="helpdesk-ticket-title">Subject</Label>
              <Input
                id="helpdesk-ticket-title"
                name="ticket-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Briefly summarize the issue…"
                autoComplete="off"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="helpdesk-ticket-description">Details</Label>
              <Textarea
                id="helpdesk-ticket-description"
                name="ticket-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What do you need help with? Include any useful order or product details…"
                className="min-h-24 resize-y"
                required
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit || !!emulation || isSubmitting} title={emulation ? "Ticket creation is disabled while emulating a customer" : undefined}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
              {isSubmitting ? "Creating…" : "Create ticket"}
            </Button>
          </div>
        </form>
        <div className="space-y-2">
          {!tickets.length ? <p className="text-sm text-muted-foreground">No tickets yet.</p> : null}
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              className="w-full rounded-lg border p-3 text-sm text-left hover:bg-muted/40 transition-colors flex items-center justify-between gap-2"
              onClick={() => navigate(`/profile/helpdesk/${ticket.id}`)}
            >
              <div>
                <p className="font-medium">{ticket.ticket_number} · {ticket.title}</p>
                <p className="text-muted-foreground">{ticket.closed_at ? "Closed" : "Open"} · {new Date(ticket.created_at).toLocaleString()}</p>
              </div>
              <ChevronRight size={14} className="shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default HelpdeskTicketsSection;
