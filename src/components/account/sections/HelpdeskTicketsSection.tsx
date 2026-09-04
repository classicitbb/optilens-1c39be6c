import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { LifeBuoy, MessageCircle, ChevronRight, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { COMPANY_CONTACT } from "@/config/companyContact";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";

// Other pages (e.g. a failed checkout payment) can deep-link here with
// router state to prefill a new ticket — see CheckoutPage.tsx's "Contact us"
// on the declined/error screen.
interface HelpdeskPrefillState {
  prefillTitle?: string;
  prefillDescription?: string;
}

const HelpdeskTicketsSection = () => {
  const { identity, emulation, portalSessionEmulation, effectiveUserId } = usePortalIdentity();
  // Read-only identity preview only: a real "signed in as" emulation session
  // (portalSessionEmulation) is a genuine customer auth session and gets full
  // write access, same as the customer signing in themselves.
  const submissionDisabled = !!emulation && !portalSessionEmulation;
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { openAssistant } = useCompanionAssistant();
  const prefill = (location.state as HelpdeskPrefillState | null) ?? null;

  // Apply a fresh prefill if the user navigates here again with new state
  // (e.g. a second failed payment) without a full page reload.
  useEffect(() => {
    if (!prefill?.prefillTitle && !prefill?.prefillDescription) return;
    openAssistant({ profile: "portal_support", formKind: "portal_support", formValues: { issueType: prefill.prefillTitle ?? "", summary: prefill.prefillDescription ?? "" } });
     
  }, [location.state, openAssistant, prefill?.prefillDescription, prefill?.prefillTitle]);
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
        <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h3 className="font-semibold">Start a support request</h3><p className="mt-1 text-sm text-muted-foreground">The assistant opens a spacious, editable form with your signed-in account context.</p></div>
          <Button type="button" className="shrink-0 gap-2" disabled={submissionDisabled} title={submissionDisabled ? "Submitting is disabled while previewing a customer read-only" : undefined} onClick={() => openAssistant({ profile: "portal_support", formKind: "portal_support" })}><MessageCircle className="h-4 w-4" />Request support</Button>
        </div>
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
