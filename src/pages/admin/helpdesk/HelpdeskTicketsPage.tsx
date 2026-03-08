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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useHelpdeskTickets } from "@/features/admin/helpdesk/hooks/useHelpdeskTickets";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import { useAssignHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useAssignHelpdeskTicket";
import { useUpdateHelpdeskTicketStage } from "@/features/admin/helpdesk/hooks/useUpdateHelpdeskTicketStage";
import { useDeleteHelpdeskTicket, useUpdateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";
import { normalizeHelpdeskPriorityLabel, normalizeSlaBadgeStatus } from "@/features/admin/helpdesk/utils/normalization";
import { supabase } from "@/integrations/supabase/client";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";

interface TeamOption { id: string; name: string; }
interface StageOption { id: string; name: string; is_closed: boolean; }
interface TicketTypeOption { id: string; name: string; }

const HelpdeskTicketsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canViewTickets = canView("helpdesk");
  const canEditTickets = canEditFeature("helpdesk");

  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<string>("all");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", teamId: "", stageId: "", priority: "1", contactId: "", ticketTypeId: "" });

  // Edit dialog state
  const [editTicket, setEditTicket] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "1", team_id: "", contactId: "", ticket_type_id: "" });

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
      const { data, error } = await (supabase as any).from("helpdesk_ticket_stages").select("id,name,is_closed").order("sequence");
      if (error) throw error;
      return (data ?? []) as StageOption[];
    },
  });

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ["helpdesk", "ticket-types", "options"],
    enabled: canViewTickets,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_types").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as TicketTypeOption[];
    },
  });

  const ticketQuery = useHelpdeskTickets({ search, onlyOpen, teamId: teamId === "all" ? undefined : teamId });
  const createTicket = useCreateHelpdeskTicket();
  const assignTicket = useAssignHelpdeskTicket();
  const updateStage = useUpdateHelpdeskTicketStage();
  const deleteTicket = useDeleteHelpdeskTicket();
  const updateTicket = useUpdateHelpdeskTicket();

  const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s.name])), [stages]);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast({ title: "Ticket title is required", variant: "destructive" }); return; }
    try {
      await createTicket.mutateAsync({ title: form.title, description: form.description, teamId: form.teamId || null, stageId: form.stageId || null, priority: Number(form.priority), ownerUserId: user?.id ?? null, partnerContactId: form.contactId || null, ticketTypeId: form.ticketTypeId || null, sourceChannel: "manual" });
      setForm({ title: "", description: "", teamId: "", stageId: "", priority: "1", contactId: "", ticketTypeId: "" });
      toast({ title: "Ticket created" });
    } catch (error) {
      toast({ title: "Unable to create ticket", description: (error as Error).message, variant: "destructive" });
    }
  };

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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search ticket number or title" className="h-8 w-72 text-xs" />
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All teams</SelectItem>
              {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOnlyOpen((p) => !p)}>
            {onlyOpen ? "Showing Open" : "Showing All"}
          </Button>
        </div>
      </AdminPageHeader>

      {canEditTickets && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Create Ticket</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end">
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="h-8 text-xs md:col-span-2" />
            <Input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="h-8 text-xs md:col-span-2" />
            <Select value={form.ticketTypeId || "__none"} onValueChange={(v) => { const typeId = v === "__none" ? "" : v; const typeName = ticketTypes.find(t => t.id === typeId)?.name; setForm((p) => ({ ...p, ticketTypeId: typeId, description: !p.description.trim() && typeName ? typeName : p.description })); }}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No type</SelectItem>
                {ticketTypes.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <ContactPickerSelect value={form.contactId} onValueChange={(v) => setForm((p) => ({ ...p, contactId: v }))} placeholder="Contact" />
            <Select value={form.teamId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, teamId: v === "__none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No team</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={String(l)} className="text-xs">{normalizeHelpdeskPriorityLabel(l)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.stageId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, stageId: v === "__none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Initial stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No stage</SelectItem>
                {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={createTicket.isPending}>Create</Button>
          </CardContent>
        </Card>
      )}

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
                  {canEditTickets && <TableHead className="w-28">Actions</TableHead>}
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
                          <Select value={ticket.stage_id ?? "__none"} onValueChange={(v) => { if (v !== "__none" && v !== ticket.stage_id) updateStage.mutate({ ticketId: ticket.id, stageId: v, actorUserId: user?.id }); }}>
                            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none" className="text-xs">Unstaged</SelectItem>
                              {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (stageMap.get(ticket.stage_id ?? "") ?? "Unstaged")}
                      </TableCell>
                      <TableCell>
                        {canEditTickets && user ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => assignTicket.mutate({ ticketId: ticket.id, ownerUserId: ticket.owner_user_id ? null : user.id, actorUserId: user.id })}>
                            {ticket.owner_user_id ? "Unassign" : "Assign to me"}
                          </Button>
                        ) : (ticket.owner_user_id ? "Assigned" : "Unassigned")}
                      </TableCell>
                      <TableCell>{new Date(ticket.updated_at).toLocaleString()}</TableCell>
                      {canEditTickets && (
                        <TableCell className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(ticket)}>Edit</Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete ticket {ticket.ticket_number}?</AlertDialogTitle>
                                  <AlertDialogDescription>This will permanently remove the ticket and all associated events.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTicket.mutate(ticket.id)}>Delete</AlertDialogAction>
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
          )}
        </CardContent>
      </Card>

      {/* Edit ticket dialog */}
      <Dialog open={!!editTicket} onOpenChange={(open) => { if (!open) setEditTicket(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="h-8 text-xs" />
            <Textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="text-xs min-h-[80px]" />
            <div className="grid grid-cols-3 gap-2">
              <Select value={editForm.priority} onValueChange={(v) => setEditForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={String(l)} className="text-xs">{normalizeHelpdeskPriorityLabel(l)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={editForm.team_id || "__none"} onValueChange={(v) => setEditForm((p) => ({ ...p, team_id: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">No team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={editForm.ticket_type_id || "__none"} onValueChange={(v) => { const typeId = v === "__none" ? "" : v; const typeName = ticketTypes.find(t => t.id === typeId)?.name; setEditForm((p) => ({ ...p, ticket_type_id: typeId, description: !p.description.trim() && typeName ? typeName : p.description })); }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">No type</SelectItem>
                  {ticketTypes.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
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
