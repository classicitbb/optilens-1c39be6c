import { useParams, useNavigate, useLocation } from "react-router";
import { ArrowLeft, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHelpdeskTicketDetail } from "@/features/admin/helpdesk/hooks/useHelpdeskTicketDetail";
import { TicketTimeline } from "@/features/admin/helpdesk/components/TicketTimeline";
import { TicketReplyComposer } from "@/features/admin/helpdesk/components/TicketReplyComposer";
import { TicketDetailSidebar } from "@/features/admin/helpdesk/components/TicketDetailSidebar";
import { normalizeHelpdeskPriorityLabel } from "@/features/admin/helpdesk/utils/normalization";

const priorityColors: Record<number, string> = {
  0: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  1: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  2: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  3: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  4: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  5: "bg-red-500/15 text-red-400 border-red-500/30",
};

const HelpdeskTicketDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Return to wherever the user navigated from
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/admin/helpdesk/tickets";

  const { data: ticket, isLoading, error } = useHelpdeskTicketDetail(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Loading ticket…</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Ticket not found.{" "}
        <button className="underline" onClick={() => navigate(returnTo)}>
          Back to tickets
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="mt-0.5 h-8 w-8 shrink-0 p-0"
            onClick={() => navigate(returnTo)}
          >
            <ArrowLeft size={15} />
          </Button>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{ticket.ticket_number}</span>
              {ticket.stage && (
                <Badge variant="secondary" className="text-xs">
                  {ticket.stage.name}
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${priorityColors[ticket.priority] ?? priorityColors[1]}`}
              >
                {normalizeHelpdeskPriorityLabel(ticket.priority)}
              </Badge>
            </div>
            <h1 className="truncate text-lg font-semibold leading-tight">{ticket.title}</h1>
            {/* Contact / customer */}
            {ticket.partner_contact && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <User size={13} className="shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {ticket.partner_contact.name}
                  {ticket.partner_contact.email && (
                    <span className="ml-1.5 text-xs">· {ticket.partner_contact.email}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Conversation */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <TicketTimeline ticket={ticket} />
          </div>
          <div className="px-6 pb-4">
            <TicketReplyComposer ticketId={ticket.id} />
          </div>
        </div>
      </div>

      {/* Details run alongside the ticket header, from the top of the page. */}
      <div className="w-72 shrink-0 overflow-hidden">
        <TicketDetailSidebar ticket={ticket} />
      </div>
    </div>
  );
};

export default HelpdeskTicketDetailPage;
