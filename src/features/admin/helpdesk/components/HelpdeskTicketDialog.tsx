import { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Loader2, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useHelpdeskTicketDetail } from "../hooks/useHelpdeskTicketDetail";
import { TicketTimeline } from "./TicketTimeline";
import { TicketReplyComposer } from "./TicketReplyComposer";
import { TicketDetailSidebar } from "./TicketDetailSidebar";
import { normalizeHelpdeskPriorityLabel } from "../utils/normalization";
import { TICKET_PARAM } from "../ticketLinks";


/** Opens a ticket in the editor modal, keeping the current page's other search params. */
export const useOpenTicket = () => {
  const [, setSearchParams] = useSearchParams();
  return useCallback((ticketId: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set(TICKET_PARAM, ticketId);
      return next;
    });
  }, [setSearchParams]);
};

const priorityColors: Record<number, string> = {
  0: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  1: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  2: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  3: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  4: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  5: "bg-red-500/15 text-red-400 border-red-500/30",
};

const TicketEditor = ({ ticketId, onClose }: { ticketId: string; onClose: () => void }) => {
  const navigate = useNavigate();
  const { data: ticket, isLoading, error } = useHelpdeskTicketDetail(ticketId);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        <DialogTitle className="sr-only">Loading ticket</DialogTitle>
        <Loader2 size={20} className="animate-spin mr-2" />
        <span className="text-sm">Loading ticket…</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
        <DialogTitle className="sr-only">Ticket not found</DialogTitle>
        Ticket not found.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-border px-6 py-4">
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
            <DialogTitle className="truncate text-lg font-semibold leading-tight">{ticket.title}</DialogTitle>
            <DialogDescription className="sr-only">Helpdesk ticket {ticket.ticket_number}</DialogDescription>
            {/* Contact / customer */}
            {ticket.partner_contact && (
              <div className="mt-0.5 flex items-center gap-1.5">
                <User size={13} className="shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  className="text-left text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => navigate(`/admin/crm/contacts?contact=${encodeURIComponent(ticket.partner_contact!.id)}`)}
                  title="Open contact"
                >
                  {ticket.partner_contact.name}
                  {ticket.partner_contact.email && (
                    <span className="ml-1.5 text-xs">· {ticket.partner_contact.email}</span>
                  )}
                </button>
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

      {/* Details run alongside the ticket header, from the top of the modal. */}
      <div className="relative w-72 shrink-0 overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 z-10 h-8 w-8 p-0"
          onClick={onClose}
          aria-label="Close ticket"
        >
          <X size={15} />
        </Button>
        <TicketDetailSidebar ticket={ticket} />
      </div>
    </div>
  );
};

/**
 * Ticket editor as a modal, mounted once in AdminLayout. Any admin page opens it
 * by adding `?ticket=<id>` to its own URL (see `ticketHref`), so ticket references
 * open in place instead of routing to Helpdesk first.
 */
const HelpdeskTicketDialog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketId = searchParams.get(TICKET_PARAM);

  const close = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete(TICKET_PARAM);
      return next;
    });
  };

  return (
    <Dialog open={!!ticketId} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="flex h-[90vh] max-w-6xl gap-0 overflow-hidden p-0">
        {ticketId && <TicketEditor key={ticketId} ticketId={ticketId} onClose={close} />}
      </DialogContent>
    </Dialog>
  );
};

export default HelpdeskTicketDialog;
