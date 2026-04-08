import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useUpdateHelpdeskTicketStage } from "../hooks/useUpdateHelpdeskTicketStage";
import { useUpdateHelpdeskTicket } from "../hooks/useHelpdeskMutations";
import { useHelpdeskStages } from "../hooks/useHelpdeskStages";
import { helpdeskTicketQueryKeys } from "../hooks/useHelpdeskTickets";
import { normalizeHelpdeskPriorityLabel } from "../utils/normalization";
import { SlaStatusBadge } from "./SlaStatusBadge";
import { WatcherManager } from "./WatcherManager";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import {
  useHelpdeskTicketSlaStatuses,
  useHelpdeskTeamSlaPolicies,
  useAssignHelpdeskSlaPolicy,
  useRemoveHelpdeskSlaPolicy,
} from "../hooks/useHelpdeskTicketSla";
import { format } from "date-fns";
import type { HelpdeskTicketDetail } from "../hooks/useHelpdeskTicketDetail";

interface TicketDetailSidebarProps {
  ticket: HelpdeskTicketDetail;
}

const priorities = [0, 1, 2, 3, 4, 5] as const;

const SLA_STATUS_LABEL: Record<string, string> = {
  in_progress: "Active",
  reached: "Reached",
  failed: "Failed",
};

const SLA_STATUS_COLOR: Record<string, string> = {
  reached: "text-emerald-500",
  failed: "text-red-500",
  in_progress: "text-muted-foreground",
};

export const TicketDetailSidebar = ({ ticket }: TicketDetailSidebarProps) => {
  const qc = useQueryClient();
  const updateStage = useUpdateHelpdeskTicketStage();
  const updateTicket = useUpdateHelpdeskTicket();
  const { data: stages = [], isLoading: areStagesLoading } = useHelpdeskStages();

  // SLA data
  const { data: slaStatuses = [], isLoading: areSlaLoading } = useHelpdeskTicketSlaStatuses(ticket.id);
  const { data: teamPolicies = [] } = useHelpdeskTeamSlaPolicies(ticket.team_id);
  const assignSla = useAssignHelpdeskSlaPolicy();
  const removeSla = useRemoveHelpdeskSlaPolicy();

  // Policies not yet applied
  const appliedPolicyIds = new Set(slaStatuses.map((s) => s.policy_id));
  const unappliedPolicies = teamPolicies.filter((p) => !appliedPolicyIds.has(p.id));

  // Local deadline state (YYYY-MM-DD) synced from ticket prop
  const [deadlineLocal, setDeadlineLocal] = useState(() =>
    ticket.deadline ? new Date(ticket.deadline).toISOString().slice(0, 10) : ""
  );

  useEffect(() => {
    setDeadlineLocal(ticket.deadline ? new Date(ticket.deadline).toISOString().slice(0, 10) : "");
  }, [ticket.id, ticket.deadline]);

  const handleStageChange = (stageId: string) => {
    updateStage.mutate({ ticketId: ticket.id, stageId });
  };

  const handlePriorityChange = (value: string) => {
    updateTicket.mutate({ id: ticket.id, priority: Number(value) });
    qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.detail(ticket.id) });
  };

  const handleContactChange = (contactId: string) => {
    updateTicket.mutate({ id: ticket.id, partner_contact_id: contactId || null });
    qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.detail(ticket.id) });
  };

  const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDeadlineLocal(val);
    const iso = val ? new Date(val + "T00:00:00").toISOString() : null;
    updateTicket.mutate({ id: ticket.id, deadline: iso });
    qc.invalidateQueries({ queryKey: helpdeskTicketQueryKeys.detail(ticket.id) });
  };

  const handleAssignPolicy = (policyId: string) => {
    const policy = teamPolicies.find((p) => p.id === policyId);
    if (!policy) return;
    assignSla.mutate({
      ticketId: ticket.id,
      policyId,
      targetHours: policy.target_hours,
      openedAt: ticket.opened_at,
    });
  };

  return (
    <aside className="flex flex-col gap-5 p-4 border-l border-border bg-card h-full overflow-y-auto">
      {/* Contact */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Contact</Label>
        <ContactPickerSelect
          value={ticket.partner_contact_id ?? ""}
          onValueChange={handleContactChange}
          placeholder="Assign contact"
        />
        {ticket.partner_contact?.email && (
          <span className="text-xs text-muted-foreground block truncate">{ticket.partner_contact.email}</span>
        )}
      </div>

      <Separator />

      {/* Stage */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Stage</Label>
        <Select value={ticket.stage_id ?? undefined} onValueChange={handleStageChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder={areStagesLoading ? "Loading stages..." : "Select stage"} />
          </SelectTrigger>
          <SelectContent>
            {!areStagesLoading && stages.length === 0 && (
              <SelectItem value="__no_stages" disabled className="text-sm">
                No stages available
              </SelectItem>
            )}
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

      {/* Due Date */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Due Date</Label>
        <Input
          type="date"
          value={deadlineLocal}
          onChange={handleDeadlineChange}
          className="h-8 text-sm"
        />
      </div>

      <Separator />

      {/* SLA */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">SLA Policies</Label>

        {areSlaLoading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : slaStatuses.length === 0 ? (
          <p className="text-xs text-muted-foreground">No SLA policies active</p>
        ) : (
          <div className="space-y-2">
            {slaStatuses.map((sla) => (
              <div
                key={sla.id}
                className="rounded-md border border-border p-2 space-y-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-medium truncate">{sla.policy.name}</span>
                  <button
                    onClick={() => removeSla.mutate({ slaStatusId: sla.id, ticketId: ticket.id })}
                    className="shrink-0 h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Remove this SLA policy"
                    disabled={removeSla.isPending}
                  >
                    <X size={11} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <SlaStatusBadge
                    deadlineAt={sla.deadline_at}
                    closedAt={ticket.closed_at}
                    slaPausedAt={ticket.sla_paused_at}
                    slaPausedDurationSeconds={ticket.sla_paused_duration_seconds}
                  />
                  {sla.status !== "in_progress" && (
                    <span className={`text-xs font-medium ${SLA_STATUS_COLOR[sla.status] ?? ""}`}>
                      {SLA_STATUS_LABEL[sla.status] ?? sla.status}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  ⏱ {format(new Date(sla.deadline_at), "MMM d, yyyy h:mm a")}
                </span>
                {sla.reached_at && (
                  <span className="text-xs text-emerald-500 block">
                    Reached {format(new Date(sla.reached_at), "MMM d, h:mm a")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Assign additional policy */}
        {unappliedPolicies.length > 0 && (
          <Select
            value=""
            onValueChange={handleAssignPolicy}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Apply a policy…" />
            </SelectTrigger>
            <SelectContent>
              {unappliedPolicies.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.name} ({p.target_hours}h)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {ticket.sla_paused_at && (
          <span className="text-xs text-muted-foreground">SLA paused (on hold)</span>
        )}
        {ticket.first_response_at && (
          <span className="text-xs text-muted-foreground">
            First response: {format(new Date(ticket.first_response_at), "MMM d, h:mm a")}
          </span>
        )}
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
