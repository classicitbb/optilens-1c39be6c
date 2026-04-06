import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useHelpdeskTicketDetail } from "@/features/admin/helpdesk/hooks/useHelpdeskTicketDetail";
import { TicketTimeline } from "@/features/admin/helpdesk/components/TicketTimeline";
import { TicketReplyComposer } from "@/features/admin/helpdesk/components/TicketReplyComposer";
import { TicketDetailSidebar } from "@/features/admin/helpdesk/components/TicketDetailSidebar";
import { normalizeHelpdeskPriorityLabel } from "@/features/admin/helpdesk/utils/normalization";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const useTicketSlaStatus = (ticketId: string | undefined) =>
  useQuery({
    queryKey: ["helpdesk-ticket-sla-status", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_sla_status")
        .select("deadline_at,status,policy_id")
        .eq("ticket_id", ticketId)
        .eq("status", "in_progress")
        .order("deadline_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as { deadline_at: string; status: string; policy_id: string } | null;
    },
  });

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

  const { data: ticket, isLoading, error } = useHelpdeskTicketDetail(id);
  const { data: slaStatus } = useTicketSlaStatus(id);

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
        <button className="underline" onClick={() => navigate("/admin/helpdesk/tickets")}>
          Back to tickets
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start gap-3 px-6 py-4 border-b border-border">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-8 w-8 p-0 mt-0.5"
          onClick={() => navigate("/admin/helpdesk/tickets")}
        >
          <ArrowLeft size={15} />
        </Button>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
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
          <h1 className="text-lg font-semibold leading-tight truncate">{ticket.title}</h1>
          {ticket.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
          )}
        </div>
      </div>

      {/* Body: timeline + sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: conversation */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6">
            <TicketTimeline ticketId={ticket.id} />
          </div>
          <div className="px-6 pb-4">
            <TicketReplyComposer ticketId={ticket.id} />
          </div>
        </div>

        {/* Right: sidebar */}
        <div className="w-72 shrink-0 overflow-y-auto border-l border-border">
          <TicketDetailSidebar
            ticket={ticket}
            slaDeadlineAt={slaStatus?.deadline_at ?? null}
          />
        </div>
      </div>
    </div>
  );
};

export default HelpdeskTicketDetailPage;
