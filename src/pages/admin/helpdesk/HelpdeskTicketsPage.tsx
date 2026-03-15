import { useMemo, useState, useRef, useCallback, useEffect, KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useHelpdeskTickets } from "@/features/admin/helpdesk/hooks/useHelpdeskTickets";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import { useAssignHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useAssignHelpdeskTicket";
import { useUpdateHelpdeskTicketStage } from "@/features/admin/helpdesk/hooks/useUpdateHelpdeskTicketStage";
import { useArchiveHelpdeskTicket, useUpdateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";
import { normalizeSlaBadgeStatus } from "@/features/admin/helpdesk/utils/normalization";
import { supabase } from "@/integrations/supabase/client";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface TeamOption { id: string; name: string; }
interface StageOption { id: string; name: string; is_closed: boolean; }
interface TicketTypeOption { id: string; name: string; }
interface PriorityOption { level: number; label: string; color: string; }

// ── localStorage helpers for "last two consistent creations" ──
const STORAGE_KEY = "helpdesk_create_history";

interface CreateSnapshot {
  teamId: string;
  stageId: string;
  priority: string;
  ticketTypeId: string;
}

function loadHistory(): CreateSnapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CreateSnapshot[]).slice(0, 2) : [];
  } catch { return []; }
}

function pushHistory(snapshot: CreateSnapshot) {
  const hist = loadHistory();
  hist.unshift(snapshot);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hist.slice(0, 2)));
}

/** If the last two creations share the same value for a field, return it. */
function consistentDefault(field: keyof CreateSnapshot): string | undefined {
  const hist = loadHistory();
  if (hist.length < 2) return hist[0]?.[field] || undefined;
  return hist[0][field] === hist[1][field] ? hist[0][field] || undefined : undefined;
}

const HelpdeskTicketsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const isMobile = useIsMobile();
  const canViewTickets = canView("helpdesk");
  const canEditTickets = canEditFeature("helpdesk");

  const [search, setSearch] = useState("");
  const [teamId, setTeamId] = useState<string>("all");
  const [onlyOpen, setOnlyOpen] = useState(true);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", teamId: "", stageId: "", priority: "1", contactId: "", ticketTypeId: "" });

  // Edit dialog state
  const [editTicket, setEditTicket] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priority: "1", team_id: "", contactId: "", ticket_type_id: "" });

  // Refs for sequential keyboard navigation inside popover
  const fieldRefs = useRef<(HTMLElement | null)[]>([]);
  const FIELD_COUNT = 8; // title, description, type, contact, team, priority, stage, submit

  const setFieldRef = useCallback((index: number) => (el: HTMLElement | null) => { fieldRefs.current[index] = el; }, []);

  const focusNext = useCallback((currentIndex: number) => {
    for (let i = currentIndex + 1; i < FIELD_COUNT; i++) {
      const el = fieldRefs.current[i];
      if (el) { el.focus(); return; }
    }
    // If at the end, focus submit
    fieldRefs.current[FIELD_COUNT - 1]?.focus();
  }, []);

  const handleFieldKeyDown = useCallback((index: number) => (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (index === FIELD_COUNT - 1) {
        // On submit button, trigger create
        handleCreate();
      } else {
        focusNext(index);
      }
    }
  }, []);

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

  const { data: priorities = [] } = useQuery({
    queryKey: ["helpdesk", "priorities"],
    enabled: canViewTickets,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_priorities").select("level,label,color").eq("is_active", true).order("level");
      if (error) throw error;
      return (data ?? []) as PriorityOption[];
    },
  });

  const ticketQuery = useHelpdeskTickets({ search, onlyOpen, teamId: teamId === "all" ? undefined : teamId });
  const createTicket = useCreateHelpdeskTicket();
  const assignTicket = useAssignHelpdeskTicket();
  const updateStage = useUpdateHelpdeskTicketStage();
  const archiveTicket = useArchiveHelpdeskTicket();
  const updateTicket = useUpdateHelpdeskTicket();

  const stageMap = useMemo(() => new Map(stages.map((s) => [s.id, s.name])), [stages]);
  const closedStage = useMemo(() => stages.find(s => s.is_closed), [stages]);

  const getPrioLabel = (level: number) => priorities.find(p => p.level === level)?.label ?? "Normal";
  const getPrioColor = (level: number) => priorities.find(p => p.level === level)?.color ?? "#6b7280";

  // ── Auto-fill defaults when popover opens ──
  const initFormDefaults = useCallback(() => {
    const defaultStage = stages.find(s => !s.is_closed)?.id ?? "";
    const defaultPriority = priorities.length > 0 ? String(priorities[0].level) : "1";

    setForm({
      title: "",
      description: "",
      teamId: consistentDefault("teamId") ?? "",
      stageId: consistentDefault("stageId") ?? defaultStage,
      priority: consistentDefault("priority") ?? defaultPriority,
      contactId: "",
      ticketTypeId: consistentDefault("ticketTypeId") ?? "",
    });
  }, [stages, priorities]);

  useEffect(() => {
    if (popoverOpen) {
      initFormDefaults();
      // Focus title field after popover animation
      setTimeout(() => fieldRefs.current[0]?.focus(), 80);
    }
  }, [popoverOpen, initFormDefaults]);

  const handleCreate = async () => {
    if (!form.title.trim()) { toast({ title: "Ticket title is required", variant: "destructive" }); return; }
    try {
      await createTicket.mutateAsync({
        title: form.title,
        description: form.description,
        teamId: form.teamId || null,
        stageId: form.stageId || null,
        priority: Number(form.priority),
        ownerUserId: user?.id ?? null,
        partnerContactId: form.contactId || null,
        ticketTypeId: form.ticketTypeId || null,
        sourceChannel: "manual",
      });
      // Save to history for smart defaults
      pushHistory({ teamId: form.teamId, stageId: form.stageId, priority: form.priority, ticketTypeId: form.ticketTypeId });
      toast({ title: "Ticket created" });
      setPopoverOpen(false);
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
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button size="sm" className="h-8 text-xs gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  New Ticket
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-80 p-0"
                align="end"
                sideOffset={8}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Create Ticket</p>

                  {/* 0: Title */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Title *</Label>
                    <Input
                      ref={setFieldRef(0) as any}
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Ticket title"
                      className="h-8 text-xs"
                      onKeyDown={handleFieldKeyDown(0) as any}
                    />
                  </div>

                  {/* 1: Description */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input
                      ref={setFieldRef(1) as any}
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Brief description"
                      className="h-8 text-xs"
                      onKeyDown={handleFieldKeyDown(1) as any}
                    />
                  </div>

                  {/* 2: Ticket Type */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Type</Label>
                    <Select
                      value={form.ticketTypeId || "__none"}
                      onValueChange={(v) => {
                        const typeId = v === "__none" ? "" : v;
                        const typeName = ticketTypes.find(t => t.id === typeId)?.name;
                        setForm((p) => ({ ...p, ticketTypeId: typeId, description: !p.description.trim() && typeName ? typeName : p.description }));
                        setTimeout(() => focusNext(2), 50);
                      }}
                    >
                      <SelectTrigger ref={setFieldRef(2) as any} className="h-8 text-xs" onKeyDown={handleFieldKeyDown(2) as any}>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none" className="text-xs">No type</SelectItem>
                        {ticketTypes.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3: Contact */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Contact</Label>
                    <div ref={setFieldRef(3)} tabIndex={-1} onKeyDown={handleFieldKeyDown(3) as any}>
                      <ContactPickerSelect value={form.contactId} onValueChange={(v) => { setForm((p) => ({ ...p, contactId: v })); setTimeout(() => focusNext(3), 50); }} placeholder="Contact" />
                    </div>
                  </div>

                  {/* 4: Team */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Team</Label>
                    <Select value={form.teamId || "__none"} onValueChange={(v) => { setForm((p) => ({ ...p, teamId: v === "__none" ? "" : v })); setTimeout(() => focusNext(4), 50); }}>
                      <SelectTrigger ref={setFieldRef(4) as any} className="h-8 text-xs" onKeyDown={handleFieldKeyDown(4) as any}>
                        <SelectValue placeholder="Team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none" className="text-xs">No team</SelectItem>
                        {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 5: Priority */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => { setForm((p) => ({ ...p, priority: v })); setTimeout(() => focusNext(5), 50); }}>
                      <SelectTrigger ref={setFieldRef(5) as any} className="h-8 text-xs" onKeyDown={handleFieldKeyDown(5) as any}>
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) => <SelectItem key={p.level} value={String(p.level)} className="text-xs">{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 6: Stage */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Initial Stage</Label>
                    <Select value={form.stageId || "__none"} onValueChange={(v) => { setForm((p) => ({ ...p, stageId: v === "__none" ? "" : v })); setTimeout(() => focusNext(6), 50); }}>
                      <SelectTrigger ref={setFieldRef(6) as any} className="h-8 text-xs" onKeyDown={handleFieldKeyDown(6) as any}>
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none" className="text-xs">No stage</SelectItem>
                        {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 7: Submit */}
                  <Button
                    ref={setFieldRef(7) as any}
                    size="sm"
                    className="w-full h-9 text-xs"
                    onClick={handleCreate}
                    onKeyDown={handleFieldKeyDown(7) as any}
                    disabled={createTicket.isPending}
                  >
                    {createTicket.isPending ? "Creating…" : "Create Ticket"}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </AdminPageHeader>

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
                    <TableHead className="hidden md:table-cell">Team</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="hidden md:table-cell">SLA</TableHead>
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
                    return (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('[data-no-row-click]')) return;
                          openEdit(ticket);
                        }}
                        style={{ borderLeft: `3px solid ${prioColor}` }}
                      >
                        <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ticket.ticket_type?.name ?? "—"}</TableCell>
                        <TableCell className="font-medium">{ticket.title}</TableCell>
                        <TableCell className="hidden md:table-cell">{ticket.team?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] px-1 py-0" style={{ borderColor: prioColor, color: prioColor }}>{getPrioLabel(ticket.priority)}</Badge>
                        </TableCell>
                        <TableCell className="capitalize hidden md:table-cell">{slaStatus.replace("_", " ")}</TableCell>
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
