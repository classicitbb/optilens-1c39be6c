import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { MessageCircle, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { COMPANY_CONTACT } from "@/config/companyContact";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import { AccountListTable, type AccountListColumn } from "@/components/account/AccountListTable";

const formatDate = (s: string) => new Date(s).toLocaleString();

interface TicketRow {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  source_channel: string;
  created_at: string;
  closed_at: string | null;
}

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
  const { data: tickets = [], isLoading } = useQuery<TicketRow[]>({
    queryKey: ["customer-helpdesk", effectiveUserId, identity?.crmContactId],
    enabled: !!user,
    queryFn: async () => {
      let query = (supabase as any)
        .from("helpdesk_tickets")
        .select("id,ticket_number,title,description,source_channel,created_at,closed_at")
        .order("created_at", { ascending: false })
        .limit(20);

      // Own contact tickets plus account-wide tickets of the companies this
      // login belongs to (also covers staff viewing as the customer).
      const viewerId = effectiveUserId ?? user.id;
      const { data: contactIds, error: contactIdsError } = await (supabase.rpc as any)("helpdesk_visible_contact_ids", { p_user_id: viewerId });
      if (contactIdsError) throw contactIdsError;
      const visibleContactIds = ((contactIds ?? []) as Array<string | { helpdesk_visible_contact_ids: string }>)
        .map((row) => (typeof row === "string" ? row : row.helpdesk_visible_contact_ids))
        .filter(Boolean);
      query = visibleContactIds.length
        ? query.or(`owner_user_id.eq.${viewerId},partner_contact_id.in.(${visibleContactIds.join(",")})`)
        : query.eq("owner_user_id", viewerId);

      const { data, error } = await query;
      if (error) throw error;
      return data as TicketRow[];
    },
  });

  const columns: AccountListColumn<TicketRow>[] = [
    {
      key: "name",
      label: "Ticket",
      sortValue: (t) => t.ticket_number,
      className: "max-w-sm px-4 py-3",
      render: (t) => (
        <>
          <p className="truncate font-medium" title={`${t.ticket_number} · ${t.title}`}>{t.ticket_number} · {t.title}</p>
          {t.description ? <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{t.description}</p> : null}
        </>
      ),
    },
    { key: "type", label: "Type", sortValue: (t) => t.source_channel ?? "", className: "px-4 py-3 capitalize text-muted-foreground", render: (t) => (t.source_channel ?? "").replace(/_/g, " ").toLowerCase() || "Support" },
    { key: "status", label: "Status", sortValue: (t) => (t.closed_at ? "Closed" : "Open"), render: (t) => <Badge variant={t.closed_at ? "outline" : "secondary"} className="text-[10px]">{t.closed_at ? "Closed" : "Open"}</Badge> },
    { key: "updated", label: "Opened", sortValue: (t) => new Date(t.created_at).getTime(), className: "whitespace-nowrap px-4 py-3 text-muted-foreground", render: (t) => formatDate(t.created_at) },
  ];

  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h1 className="text-2xl text-foreground">Helpdesk Tickets</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>Create tickets and follow updates from support.</span>
          <span className="text-muted-foreground/60">·</span>
          <a
            href={COMPANY_CONTACT.phoneHref}
            className="inline-flex items-center gap-1 text-secondary underline underline-offset-2 hover:text-secondary/80"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {COMPANY_CONTACT.phoneDisplay}
          </a>
        </p>
      </div>
      <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="font-semibold">Start a support request</h3><p className="mt-1 text-sm text-muted-foreground">The assistant opens a spacious, editable form with your signed-in account context.</p></div>
        <Button type="button" className="shrink-0 gap-2" disabled={submissionDisabled} title={submissionDisabled ? "Submitting is disabled while previewing a customer read-only" : undefined} onClick={() => openAssistant({ profile: "portal_support", formKind: "portal_support" })}><MessageCircle className="h-4 w-4" />Request support</Button>
      </div>
      <AccountListTable
        columns={columns}
        rows={tickets}
        rowKey={(t) => t.id}
        isLoading={isLoading}
        empty="No tickets yet."
        defaultSort={{ key: "updated", dir: "desc" }}
        preview={(t) => <p className="whitespace-pre-wrap text-sm text-foreground">{t.description || "No description was added to this ticket."}</p>}
        actions={(t) => <Button variant="outline" size="sm" onClick={() => navigate(`/profile/helpdesk/${t.id}`)}>Open</Button>}
      />
    </div>
  );
};

export default HelpdeskTicketsSection;
