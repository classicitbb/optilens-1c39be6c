import { useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useUpdateHelpdeskTicketStage } from "../hooks/useUpdateHelpdeskTicketStage";
import { useUpdateHelpdeskTicket } from "../hooks/useHelpdeskMutations";
import { useHelpdeskStages } from "../hooks/useHelpdeskStages";
import { helpdeskTicketQueryKeys } from "../hooks/useHelpdeskTickets";
import { normalizeHelpdeskPriorityLabel } from "../utils/normalization";
import { SlaStatusBadge } from "./SlaStatusBadge";
import { WatcherManager } from "./WatcherManager";
import { format } from "date-fns";
import type { HelpdeskTicketDetail } from "../hooks/useHelpdeskTicketDetail";

interface TicketDetailSidebarProps {
  ticket: HelpdeskTicketDetail;
  slaDeadlineAt?: string | null;
}

const priorities = [0, 1, 2, 3, 4, 5] as const;

export const TicketDetailSidebar = ({ ticket, slaDeadlineAt }: TicketDetailSidebarProps) => {
  const qc = useQueryClient();
  const updateStage = useUpdateHelpdeskTicketStage();
  const updateTicket = useUpdateHelpdeskTicket();
  const { data: stages = [] } = useHelpdeskStages(ticket.team_id ?? undefined);

  const handleStageChange = (stageId: string) => {
    updateStage.mutate({ ticketId: ticket.id, stageId });
  };

  const handlePriorityChange = (value: string) => {
    updateTicket.mutate({ id: ticket.id, priority: Number(value) });
    qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.detail(ticket.id) });
  };

  return (
    <aside className="flex flex-col gap-5 p-4 border-l border-border bg-card h-full overflow-y-auto">
      {/* Stage */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Stage</Label>
        <Select value={ticket.stage_id ?? undefined} onValueChange={handleStageChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select stage" />
          </SelectTrigger>
          <SelectContent>
            {stages.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-sm">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Priority</Label>
        <Select value={String(ticket.priority)} onValueChange={handlePriorityChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorities.map((p) => (
              <SelectItem key={p} value={String(p)} className="text-sm">
                {normalizeHelpdeskPriorityLabel(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* SLA */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">SLA</Label>
        <div className="flex flex-col gap-1.5">
          <SlaStatusBadge
            deadlineAt={slaDeadlineAt}
            closedAt={ticket.closed_at}
            slaPausedAt={ticket.sla_paused_at}
            slaPausedDurationSeconds={ticket.sla_paused_duration_seconds}
          />
          {ticket.sla_paused_at && (
            <span className="text-xs text-muted-foreground">SLA paused (on hold)</span>
          )}
          {ticket.first_response_at && (
            <span className="text-xs text-muted-foreground">
              First response: {format(new Date(ticket.first_response_at), "MMM d, h:mm a")}
            </span>
          )}
          {slaDeadlineAt && (
            <span className="text-xs text-muted-foreground">
              Due: {format(new Date(slaDeadlineAt), "MMM d, h:mm a")}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Source */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Source</Label>
        <span className="text-sm capitalize">{ticket.source_channel.replace(/_/g, " ")}</span>
      </div>

      {ticket.customer_email && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Customer email</Label>
          <span className="text-sm break-all">{ticket.customer_email}</span>
        </div>
      )}

      <Separator />

      {/* Watchers */}
      <WatcherManager ticketId={ticket.id} />
    </aside>
  );
};
