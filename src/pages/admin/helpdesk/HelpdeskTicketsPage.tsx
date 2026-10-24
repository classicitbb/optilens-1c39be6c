import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { Ticket, Plus } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useHelpdeskTickets } from "@/features/admin/helpdesk/hooks/useHelpdeskTickets";
import { useAssignHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useAssignHelpdeskTicket";
import { useUpdateHelpdeskTicketStage } from "@/features/admin/helpdesk/hooks/useUpdateHelpdeskTicketStage";
import { useArchiveHelpdeskTicket, useUpdateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";
import { useHelpdeskTicketAlerts } from "@/features/admin/helpdesk/hooks/useHelpdeskTicketAlerts";
import { normalizeSlaBadgeStatus } from "@/features/admin/helpdesk/utils/normalization";
import { supabase } from "@/integrations/supabase/client";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useOpenTicket } from "@/features/admin/helpdesk/components/HelpdeskTicketDialog";
import CreateHelpdeskTicketDialog from "@/features/admin/helpdesk/components/CreateHelpdeskTicketDialog";


interface TeamOption { id: string; name: string; }
interface StageOption { id: string; name: string; is_closed: boolean; }
interface TicketTypeOption { id: string; name: string; }
interface PriorityOption { level: number; label: string; color: string; }

const EMPTY_TEAMS: TeamOption[] = [];
const EMPTY_STAGES: StageOption[] = [];
const EMPTY_TICKET_TYPES: TicketTypeOption[] = [];
const EMPTY_PRIORITIES: PriorityOption[] = [];

const HelpdeskTicketsPage = () => {
  const { user } = useAuth();
  const openTicket = useOpenTicket();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  const canViewTickets = canView("helpdesk");
  const canEditTickets = canEditFeature("helpdesk");

  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<string>("all");
  const [onlyOpen, setOnlyOpen] = useState(true);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  // Edit dialog state
  const [editTicket, setEditTicket] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "1", team_id: "", contactId: "", ticket_type_id: "" });

  const { data: teams = EMPTY_TEAMS } = useQuery({
    queryKey: ["helpdesk", "teams", "options"],
    enabled: canViewTickets,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_teams").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as TeamOption[];
    },
  });

  const { data: stages = EMPTY_STAGES } = useQuery({
    queryKey: ["helpdesk", "stages", "options", teamId],
    enabled: canViewTickets,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_stages").select("id,name,is_closed").order("sequence");
      if (error) throw error;
      return (data ?? []) as StageOption[];
    },
  });

  const { data: ticketTypes = EMPTY_TICKET_TYPES } = useQuery({
    queryKey: ["helpdesk", "ticket-types", "options"],
    enabled: canViewTickets,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_types").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as TicketTypeOption[];
    },
  });

  const { data: priorities = EMPTY_PRIORITIES } = useQuery({
    queryKey: ["helpdesk", "priorities"],
    enabled: canViewTickets,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_priorities").select("level,label,color").eq("is_active", true).order("level");
      if (error) throw error;
      return (data ?? []) as PriorityOption[];
    },
  });

  const ticketQuery = useHelpdeskTickets({ search, onlyOpen, teamId: teamId === "all" ? undefined : teamId });
  const assignTicket = useAssignHelpdeskTicket();
  const updateStage = useUpdateHelpdeskTicketStage();
  const archiveTicket = useArchiveHelpdeskTicket();
  const updateTicket = useUpdateHelpdeskTicket();

  const { alertingTicketIds, markTicketOpened } = useHelpdeskTicketAlerts(ticketQuery.data ?? []);

  const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s.name])), [stages]);
  const closedStage = useMemo(() => stages.find(s => s.is_closed), [stages]);

  const getPrioLabel = (level: number) => priorities.find(p => p.level === level)?.label ?? "Normal";
  const getPrioColor = (level: number) => priorities.find(p => p.level === level)?.color ?? "#6b7280";

  useEffect(() => {
    if (searchParams.get("createTicket") === "1" && canEditTickets) {
      setCreateDialogOpen(true);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("createTicket");
      setSearchParams(nextParams, { replace: true });
    }
  }, [canEditTickets, searchParams, setSearchParams]);

  const openEdit = (ticket: any) => {
    setEditTicket(ticket);
    setEditForm({ title: ticket.title, description: ticket.description || "", priority: String(ticket.priority), team_id: ticket.team_id || "", contactId: ticket.partner_contact_id || "", ticket_type_id: ticket.ticket_type_id || "" });
  };

  const saveEdit = () => {
    if (!editTicket) return;
    updateTicket.mutate({ id: editTicket.id, title: editForm.title.trim(), description: editForm.description.trim(), priority: Number(editForm.priority), team_id: editForm.team_id || null, partner_contact_id: editForm.contactId || null, ticket_type_id: editForm.ticket_type_id || null });
    setEditTicket(null);
  };

  if (!canViewTickets) {
    return <p className="text-sm text-muted-foreground">You do not have access to Helpdesk tickets.</p>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Helpdesk Tickets" icon={Ticket}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket number or title" className="h-8 w-full sm:w-72 text-xs" />
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="h-8 w-full sm:w-44 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All teams</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOnlyOpen((p) => !p)}>
            {onlyOpen ? "Showing Open" : "Showing All"}
          </Button>
          {canEditTickets && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New Ticket
            </Button>
          )}
        </div>
      </AdminPageHeader>

      <CreateHelpdeskTicketDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Ticket Queue <Badge variant="outline">{ticketQuery.data?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ticketQuery.isLoading && <p className="text-xs text-muted-foreground">Loading tickets…</p>}
          {ticketQuery.isError && (
            <div className="space-y-2">
              <p className="text-xs text-destructive">Unable to load tickets. {(ticketQuery.error as Error)?.message}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => ticketQuery.refetch()}>Retry</Button>
            </div>
          )}
          {!ticketQuery.isLoading && !ticketQuery.isError && (ticketQuery.data?.length ?? 0) === 0 && (
            <p className="text-xs text-muted-foreground">No tickets found. Create one to get started.</p>
          )}
          {!ticketQuery.isLoading && !ticketQuery.isError && (ticketQuery.data?.length ?? 0) > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden md:table-cell">Contact</TableHead>
                    <TableHead className="hidden md:table-cell">Team</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="hidden md:table-cell">SLA</TableHead>
                    <TableHead className="hidden md:table-cell">Due Date</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead className="hidden lg:table-cell">Owner</TableHead>
                    <TableHead className="hidden lg:table-cell">Updated</TableHead>
                    {canEditTickets && <TableHead className="w-24">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ticketQuery.data?.map((ticket) => {
                    const slaStatus = normalizeSlaBadgeStatus({ deadline: ticket.deadline, closedAt: ticket.closed_at });
                    const prioColor = getPrioColor(ticket.priority);
                    const isAlerting = alertingTicketIds.has(ticket.id);
                    return (
                      <TableRow
                        key={ticket.id}
                        className={cn("cursor-pointer hover:bg-muted/40", isAlerting && "animate-unstaged-row-flash")}
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('[data-no-row-click]')) return;
                          markTicketOpened(ticket.id);
                          openTicket(ticket.id);
                        }}
                        style={{ borderLeft: `3px solid ${prioColor}` }}
                      >
                        <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ticket.ticket_type?.name ?? "—"}</TableCell>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs">{ticket.partner_contact?.name ?? "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">{ticket.team?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] px-1 py-0" style={{ borderColor: prioColor, color: prioColor }}>{getPrioLabel(ticket.priority)}</Badge>
                        </TableCell>
                        <TableCell className="capitalize hidden md:table-cell">{slaStatus.replace("_", " ")}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                          {ticket.deadline ? new Date(ticket.deadline).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell data-no-row-click>
                          {canEditTickets ? (
                            <Select value={ticket.stage_id ?? "__none"} onValueChange={(v) => { if (v !== "__none" && v !== ticket.stage_id) updateStage.mutate({ ticketId: ticket.id, stageId: v, actorUserId: user?.id }); }}>
                              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none" className="text-xs">Unstaged</SelectItem>
                                {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (stageMap.get(ticket.stage_id ?? "") ?? "Unstaged")}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell" data-no-row-click>
                          {canEditTickets && user ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => assignTicket.mutate({ ticketId: ticket.id, ownerUserId: ticket.owner_user_id ? null : user.id, actorUserId: user.id })}>
                              {ticket.owner_user_id ? "Unassign" : "Assign to me"}
                            </Button>
                          ) : (ticket.owner_user_id ? "Assigned" : "Unassigned")}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{new Date(ticket.updated_at).toLocaleString()}</TableCell>
                        {canEditTickets && (
                          <TableCell data-no-row-click>
                            {closedStage && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 text-xs">Archive</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Archive ticket {ticket.ticket_number}?</AlertDialogTitle>
                                    <AlertDialogDescription>This will move the ticket to the "{closedStage.name}" stage.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => archiveTicket.mutate({ ticketId: ticket.id, closedStageId: closedStage.id })}>Archive</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit ticket dialog */}
      <Dialog open={!!editTicket} onOpenChange={(open) => { if (!open) setEditTicket(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={editForm.ticket_type_id || "__none"} onValueChange={(v) => { const typeId = v === "__none" ? "" : v; const typeName = ticketTypes.find(t => t.id === typeId)?.name; setEditForm((p) => ({ ...p, ticket_type_id: typeId, description: !p.description.trim() && typeName ? typeName : p.description })); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ticket Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No type</SelectItem>
                {ticketTypes.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="h-8 text-xs" />
            <Textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="text-xs min-h-[80px]" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={editForm.priority} onValueChange={(v) => setEditForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => <SelectItem key={p.level} value={String(p.level)} className="text-xs">{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={editForm.team_id || "__none"} onValueChange={(v) => setEditForm((p) => ({ ...p, team_id: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">No team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <ContactPickerSelect
              value={editForm.contactId}
              onValueChange={(v) => setEditForm((p) => ({ ...p, contactId: v }))}
              placeholder="Assign contact"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditTicket(null)}>Cancel</Button>
            <Button size="sm" onClick={saveEdit} disabled={updateTicket.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelpdeskTicketsPage;
