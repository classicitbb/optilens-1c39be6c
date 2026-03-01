import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHelpdeskTickets } from "@/features/admin/helpdesk/hooks/useHelpdeskTickets";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import { useAssignHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useAssignHelpdeskTicket";
import { useUpdateHelpdeskTicketStage } from "@/features/admin/helpdesk/hooks/useUpdateHelpdeskTicketStage";
import { normalizeHelpdeskPriorityLabel, normalizeSlaBadgeStatus } from "@/features/admin/helpdesk/utils/normalization";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useAuth } from "@/contexts/AuthContext";

interface TeamOption {
  id: string;
  name: string;
}

interface StageOption {
  id: string;
  name: string;
  is_closed: boolean;
}

const HelpdeskTicketsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const canViewTickets = canView("helpdesk");
  const canEditTickets = canEditFeature("helpdesk");

  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<string>("all");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", teamId: "", stageId: "", priority: "1" });

  const { data: teams = [] } = useQuery({
    queryKey: ["helpdesk", "teams", "options"],
    enabled: canViewTickets,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_teams").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as TeamOption[];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["helpdesk", "stages", "options", teamId],
    enabled: canViewTickets,
    queryFn: async () => {
      let query = (supabase as any).from("helpdesk_ticket_stages").select("id,name,is_closed").order("sequence");
      // Stages are global (not team-specific), so no team filter needed
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as StageOption[];
    },
  });

  const ticketQuery = useHelpdeskTickets({ search, onlyOpen, teamId: teamId === "all" ? undefined : teamId });
  const createTicket = useCreateHelpdeskTicket();
  const assignTicket = useAssignHelpdeskTicket();
  const updateStage = useUpdateHelpdeskTicketStage();

  const stageMap = useMemo(() => new Map(stages.map((stage) => [stage.id, stage.name])), [stages]);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast({ title: "Ticket title is required", variant: "destructive" });
      return;
    }

    try {
      await createTicket.mutateAsync({
        title: form.title,
        description: form.description,
        teamId: form.teamId || null,
        stageId: form.stageId || null,
        priority: Number(form.priority),
        ownerUserId: user?.id ?? null,
        sourceChannel: "manual",
      });
      setForm({ title: "", description: "", teamId: "", stageId: "", priority: "1" });
      toast({ title: "Ticket created" });
    } catch (error) {
      toast({ title: "Unable to create ticket", description: (error as Error).message, variant: "destructive" });
    }
  };

  if (!canViewTickets) {
    return <p className="text-sm text-muted-foreground">You do not have access to Helpdesk tickets.</p>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Helpdesk Tickets" icon={Ticket}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticket number or title" className="h-8 w-72 text-xs" />
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id} className="text-xs">{team.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOnlyOpen((prev) => !prev)}>
            {onlyOpen ? "Showing Open" : "Showing All"}
          </Button>
        </div>
      </AdminPageHeader>

      {canEditTickets ? (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Create Ticket</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <Input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} placeholder="Title" className="h-8 text-xs md:col-span-2" />
            <Input value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} placeholder="Description" className="h-8 text-xs md:col-span-2" />
            <Select value={form.teamId || "__none"} onValueChange={(value) => setForm((prev) => ({ ...prev, teamId: value === "__none" ? "" : value }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No team</SelectItem>
                {teams.map((team) => <SelectItem key={team.id} value={team.id} className="text-xs">{team.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.priority} onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((level) => <SelectItem key={level} value={String(level)} className="text-xs">{normalizeHelpdeskPriorityLabel(level)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.stageId || "__none"} onValueChange={(value) => setForm((prev) => ({ ...prev, stageId: value === "__none" ? "" : value }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Initial stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No stage</SelectItem>
                {stages.map((stage) => <SelectItem key={stage.id} value={stage.id} className="text-xs">{stage.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={createTicket.isPending}>Create</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Ticket Queue
            <Badge variant="outline">{ticketQuery.data?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketQuery.isLoading ? <p className="text-xs text-muted-foreground">Loading tickets…</p> : null}
          {ticketQuery.isError ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">Unable to load tickets. {(ticketQuery.error as Error)?.message}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => ticketQuery.refetch()}>Retry</Button>
            </div>
          ) : null}

          {!ticketQuery.isLoading && !ticketQuery.isError && (ticketQuery.data?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">No tickets found. Create one to get started.</p>
          ) : null}

          {!ticketQuery.isLoading && !ticketQuery.isError && (ticketQuery.data?.length ?? 0) > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketQuery.data?.map((ticket) => {
                  const slaStatus = normalizeSlaBadgeStatus({ deadline: ticket.deadline, closedAt: ticket.closed_at });
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
                      <TableCell>{ticket.title}</TableCell>
                      <TableCell>{ticket.team?.name ?? "—"}</TableCell>
                      <TableCell>{normalizeHelpdeskPriorityLabel(ticket.priority)}</TableCell>
                      <TableCell className="capitalize">{slaStatus.replace("_", " ")}</TableCell>
                      <TableCell>
                        {canEditTickets ? (
                          <Select
                            value={ticket.stage_id ?? "__none"}
                            onValueChange={(value) => {
                              if (value === "__none" || value === ticket.stage_id) return;
                              updateStage.mutate({ ticketId: ticket.id, stageId: value, actorUserId: user?.id });
                            }}
                          >
                            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none" className="text-xs">Unstaged</SelectItem>
                              {stages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id} className="text-xs">{stage.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          stageMap.get(ticket.stage_id ?? "") ?? "Unstaged"
                        )}
                      </TableCell>
                      <TableCell>
                        {canEditTickets && user ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => assignTicket.mutate({ ticketId: ticket.id, ownerUserId: ticket.owner_user_id ? null : user.id, actorUserId: user.id })}
                          >
                            {ticket.owner_user_id ? "Unassign" : "Assign to me"}
                          </Button>
                        ) : (ticket.owner_user_id ? "Assigned" : "Unassigned")}
                      </TableCell>
                      <TableCell>{new Date(ticket.updated_at).toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpdeskTicketsPage;
