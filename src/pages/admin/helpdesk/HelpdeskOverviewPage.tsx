import { useMemo, useState, useCallback, useRef, useEffect, DragEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { LayoutDashboard, List, Kanban, Maximize2, Minimize2, Star, Pencil, ChevronRight, ChevronDown, Plus, Clock3 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeHelpdeskPriorityLabel } from "@/features/admin/helpdesk/utils/normalization";
import { useUpdateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";
import { useUpdateHelpdeskTicketStage } from "@/features/admin/helpdesk/hooks/useUpdateHelpdeskTicketStage";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface OverviewTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  priority: number;
  owner_user_id: string | null;
  partner_contact_id: string | null;
  stage_id: string | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  deadline: string | null;
  stage: {id: string;name: string;sequence: number;is_closed: boolean;is_folded: boolean;} | null;
  team: {id: string;name: string;} | null;
  partner_contact: {id: string;name: string;email: string | null;phone: string | null;} | null;
}

interface PriorityOption {
  level: number;
  label: string;
}

interface StageColumn {
  id: string;
  name: string;
  sequence: number;
  is_closed: boolean;
  is_folded: boolean;
  tickets: OverviewTicket[];
}

type ViewMode = "kanban" | "list";

const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-muted text-muted-foreground",
  1: "bg-muted text-muted-foreground",
  2: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  3: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  4: "bg-red-500/15 text-red-700 dark:text-red-400",
  5: "bg-red-600/20 text-red-800 dark:text-red-300"
};

const AVATAR_COLORS = [
"bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600",
"bg-rose-600", "bg-cyan-600", "bg-pink-600", "bg-teal-600",
"bg-indigo-600", "bg-lime-600", "bg-orange-600", "bg-fuchsia-600"];


const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitial = (name: string) => (name || "?")[0].toUpperCase();

const PriorityStars = ({ priority }: {priority: number;}) => {
  if (priority <= 1) return null;
  return (
    <div className="flex gap-px">
      {Array.from({ length: Math.min(priority, 5) }).map((_, i) =>
      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
      )}
    </div>);

};

/* ═══════════════════ Edit Dialog ═══════════════════ */
const TicketEditDialog = ({
  ticket,
  open,
  onClose,
  stages,
  teams






}: {ticket: OverviewTicket | null;open: boolean;onClose: () => void;stages: {id: string;name: string;}[];teams: {id: string;name: string;}[];}) => {
  const updateTicket = useUpdateHelpdeskTicket();
  const updateStage = useUpdateHelpdeskTicketStage();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", priority: "1", team_id: "", stage_id: "", partner_contact_id: "" });

  // Sync form when ticket changes
  const lastId = useRef<string | null>(null);
  if (ticket && ticket.id !== lastId.current) {
    lastId.current = ticket.id;
    setForm({
      title: ticket.title,
      description: ticket.description || "",
      priority: String(ticket.priority),
      team_id: ticket.team_id || "",
      stage_id: ticket.stage_id || "",
      partner_contact_id: ticket.partner_contact_id || ""
    });
  }
  if (!ticket && lastId.current) lastId.current = null;

  const save = async () => {
    if (!ticket) return;
    await updateTicket.mutateAsync({
      id: ticket.id,
      title: form.title.trim(),
      description: form.description.trim(),
      priority: Number(form.priority),
      team_id: form.team_id || null,
      partner_contact_id: form.partner_contact_id || null
    });
    if (form.stage_id !== (ticket.stage_id || "") && form.stage_id) {
      await updateStage.mutateAsync({
        ticketId: ticket.id,
        stageId: form.stage_id,
        actorUserId: user?.id
      });
    }
    qc.invalidateQueries({ queryKey: ["helpdesk-overview-tickets"] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {if (!o) onClose();}}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Ticket {ticket?.ticket_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Title" className="h-8 text-xs" />
          <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className="text-xs min-h-[80px]" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[0, 1, 2, 3, 4, 5].map((l) => <SelectItem key={l} value={String(l)} className="text-xs">{normalizeHelpdeskPriorityLabel(l)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.team_id || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, team_id: v === "__none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No team</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.stage_id || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, stage_id: v === "__none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">Unstaged</SelectItem>
                {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <ContactPickerSelect
              value={form.partner_contact_id}
              onValueChange={(v) => setForm((p) => ({ ...p, partner_contact_id: v }))}
              placeholder="Assign contact" />
            
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={updateTicket.isPending || updateStage.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>);

};

const StageCreateTicketPopover = ({
  stageName,
  teams,
  priorities,
  ticketTypes,
  canCreate,
  isCreating,
  onCreate,
}: {
  stageName: string;
  teams: { id: string; name: string }[];
  priorities: PriorityOption[];
  ticketTypes: { id: string; name: string }[];
  canCreate: boolean;
  isCreating: boolean;
  onCreate: (payload: { title: string; description: string; teamId?: string | null; priority: number; contactId?: string | null; ticketTypeId?: string | null }) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    teamId: "",
    priority: "1",
    contactId: "",
    ticketTypeId: "",
  });

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    await onCreate({
      title: form.title,
      description: form.description,
      teamId: form.teamId || null,
      priority: Number(form.priority),
      contactId: form.contactId || null,
      ticketTypeId: form.ticketTypeId || null,
    });
    setForm({
      title: "",
      description: "",
      teamId: "",
      priority: "1",
      contactId: "",
      ticketTypeId: "",
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-primary hover:text-primary"
          disabled={!canCreate}
          title={`Create ticket in ${stageName}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} collisionPadding={12} className="w-[520px] max-w-[calc(100vw-1rem)] p-4">
        <div className="space-y-2" onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleCreate();
          }
        }} role="form">
          <p className="text-sm font-semibold text-center">Create Ticket</p>
          <div className="space-y-2">
            <Select
              value={form.ticketTypeId || "__none"}
              onValueChange={(v) => {
                const typeId = v === "__none" ? "" : v;
                const typeName = ticketTypes.find((type) => type.id === typeId)?.name;
                setForm((prev) => ({
                  ...prev,
                  ticketTypeId: typeId,
                  title: !prev.title.trim() && typeName ? typeName : prev.title,
                  description: !prev.description.trim() && typeName ? typeName : prev.description,
                }));
              }}
            >
              <SelectTrigger className="h-8 text-xs focus:ring-2 focus:ring-primary"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No type</SelectItem>
                {ticketTypes.map((type) => <SelectItem key={type.id} value={type.id} className="text-xs">{type.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Title"
              className="h-8 text-xs focus:ring-2 focus:ring-primary"
            />
            <Textarea
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description"
              className="text-xs min-h-[96px] focus:ring-2 focus:ring-primary"
            />
            <ContactPickerSelect
              value={form.contactId || null}
              onValueChange={(value) => setForm((prev) => ({ ...prev, contactId: value || "" }))}
              placeholder="Contact"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select value={form.teamId || "__none"} onValueChange={(v) => setForm((prev) => ({ ...prev, teamId: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs focus:ring-2 focus:ring-primary"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">No team</SelectItem>
                  {teams.map((team) => <SelectItem key={team.id} value={team.id} className="text-xs">{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.priority} onValueChange={(v) => setForm((prev) => ({ ...prev, priority: v }))}>
                <SelectTrigger className="h-8 text-xs focus:ring-2 focus:ring-primary"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => <SelectItem key={priority.level} value={String(priority.level)} className="text-xs">{priority.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="h-9 w-full text-xs" onClick={() => void handleCreate()} disabled={isCreating || !form.title.trim()}>
              Create Ticket
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

/* ═══════════════════ Main Page ═══════════════════ */
const HelpdeskOverviewPage = () => {
  const { canView, canEditFeature } = useRolePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canViewHelpdesk = canView("helpdesk");
  const canEdit = canEditFeature("helpdesk");

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editTicket, setEditTicket] = useState<OverviewTicket | null>(null);
  const [activeNow, setActiveNow] = useState(() => new Date());
  const navigate = useNavigate();
  const handleOpenTicket = useCallback((t: OverviewTicket) => navigate(`/admin/helpdesk/tickets/${t.id}`, { state: { returnTo: "/admin/helpdesk/overview" } }), [navigate]);

  const updateStage = useUpdateHelpdeskTicketStage();
  const createTicket = useCreateHelpdeskTicket();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-overview-tickets"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).
      from("helpdesk_tickets").
      select("id,ticket_number,title,description,priority,owner_user_id,partner_contact_id,stage_id,team_id,created_at,updated_at,closed_at,deadline,stage:helpdesk_ticket_stages(id,name,sequence,is_closed,is_folded),team:helpdesk_teams(id,name),partner_contact:contacts!helpdesk_tickets_partner_contact_id_fkey(id,name,email,phone)").
      order("created_at", { ascending: false }).
      limit(500);
      if (error) throw error;
      return (data ?? []) as OverviewTicket[];
    },
    refetchInterval: 30000
  });

  const ticketIds = useMemo(() => tickets.map((ticket) => ticket.id), [tickets]);
  const { data: creatorEvents = [] } = useQuery({
    queryKey: ["helpdesk-overview-ticket-creators", ticketIds],
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_events")
        .select("ticket_id,actor_user_id,created_at")
        .eq("event_type", "ticket_created")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as { ticket_id: string; actor_user_id: string | null; created_at: string }[];
    },
  });

  const creatorMap = useMemo(() => {
    const map = new Map<string, string | null>();
    creatorEvents.forEach((event) => {
      if (!map.has(event.ticket_id)) {
        map.set(event.ticket_id, event.actor_user_id ?? null);
      }
    });
    return map;
  }, [creatorEvents]);

  const profileIds = useMemo(
    () => [
      ...new Set(
        [
          ...tickets.map((ticket) => ticket.owner_user_id),
          ...tickets.map((ticket) => creatorMap.get(ticket.id) ?? null),
          user?.id ?? null,
        ].filter(Boolean) as string[],
      ),
    ],
    [tickets, creatorMap, user?.id],
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["helpdesk-overview-profiles", profileIds],
    enabled: profileIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("user_id,display_name").in("user_id", profileIds);
      if (error) throw error;
      return (data ?? []) as { user_id: string; display_name: string | null }[];
    },
  });
  const profileMap = useMemo(() => new Map(profiles.map((p) => [p.user_id, p])), [profiles]);

  const { data: stages = [] } = useQuery({
    queryKey: ["helpdesk-overview-stages"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_stages").select("id,name,sequence,is_closed,is_folded").order("sequence");
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["helpdesk-overview-teams"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_teams").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    }
  });

  const { data: priorities = [] } = useQuery({
    queryKey: ["helpdesk-overview-priorities"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_priorities").select("level,label").eq("is_active", true).order("level");
      if (error) throw error;
      return (data ?? []) as PriorityOption[];
    }
  });

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ["helpdesk-overview-ticket-types"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_types").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    }
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tickets.filter((t) => {
      if (teamFilter !== "all" && t.team_id !== teamFilter) return false;
      if (s && !t.title.toLowerCase().includes(s) && !t.ticket_number.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [tickets, search, teamFilter]);

  const stageColumns: StageColumn[] = useMemo(() => {
    const cols: StageColumn[] = stages.map((s: any) => ({ ...s, tickets: filtered.filter((t) => t.stage_id === s.id) }));
    const unstaged = filtered.filter((t) => !t.stage_id);
    if (unstaged.length > 0) {
      cols.unshift({ id: "__unstaged", name: "Unstaged", sequence: -1, is_closed: false, is_folded: false, tickets: unstaged });
    }
    return cols;
  }, [stages, filtered]);

  const getOwnerName = useCallback((ticket: OverviewTicket) => {
    if (!ticket.owner_user_id) return null;
    const p = profileMap.get(ticket.owner_user_id);
    return p?.display_name || ticket.owner_user_id.slice(0, 6);
  }, [profileMap]);

  const getCreatorName = useCallback((ticket: OverviewTicket) => {
    const creatorId = creatorMap.get(ticket.id);
    if (!creatorId) return "Unknown";
    const profile = profileMap.get(creatorId);
    return profile?.display_name || creatorId.slice(0, 6);
  }, [creatorMap, profileMap]);

  useEffect(() => {
    const interval = window.setInterval(() => setActiveNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const handleCreateInStage = useCallback(async (stageId: string, payload: { title: string; description: string; teamId?: string | null; priority: number; contactId?: string | null; ticketTypeId?: string | null; }) => {
    try {
      await createTicket.mutateAsync({
        title: payload.title,
        description: payload.description,
        teamId: payload.teamId ?? null,
        stageId,
        priority: payload.priority,
        ownerUserId: user?.id,
        partnerContactId: payload.contactId ?? null,
        ticketTypeId: payload.ticketTypeId ?? null,
        sourceChannel: "manual",
      });
      qc.invalidateQueries({ queryKey: ["helpdesk-overview-tickets"] });
      toast({ title: "Ticket created", description: `Created in stage ${stages.find((stage: any) => stage.id === stageId)?.name ?? ""}` });
    } catch (err) {
      toast({ title: "Ticket creation failed", description: (err as Error).message, variant: "destructive" });
      throw err;
    }
  }, [createTicket, user?.id, qc, toast, stages]);

  const handleDrop = useCallback(async (ticketId: string, targetStageId: string) => {
    if (targetStageId === "__unstaged") return;
    try {
      await updateStage.mutateAsync({ ticketId, stageId: targetStageId, actorUserId: user?.id });
      qc.invalidateQueries({ queryKey: ["helpdesk-overview-tickets"] });
    } catch (err) {
      toast({ title: "Stage change failed", description: (err as Error).message, variant: "destructive" });
    }
  }, [updateStage, user, qc, toast]);

  const handleListStageChange = useCallback(async (ticketId: string, newStageId: string) => {
    if (newStageId === "__none") return;
    try {
      await updateStage.mutateAsync({ ticketId, stageId: newStageId, actorUserId: user?.id });
      qc.invalidateQueries({ queryKey: ["helpdesk-overview-tickets"] });
    } catch (err) {
      toast({ title: "Stage change failed", description: (err as Error).message, variant: "destructive" });
    }
  }, [updateStage, user, qc, toast]);

  if (!canViewHelpdesk) {
    return <p className="text-sm text-muted-foreground p-4">You do not have access to the Helpdesk.</p>;
  }

  const containerClass = isFullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "flex flex-col h-full";

  return (
    <div className={containerClass}>
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <AdminPageHeader title="Helpdesk Overview" icon={LayoutDashboard} />
          <Badge variant="outline" className="text-xs">{filtered.length} tickets</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tickets…" className="h-8 w-56 text-xs" />
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All teams</SelectItem>
              {teams.map((t: any) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button size="sm" variant={viewMode === "kanban" ? "default" : "ghost"} className="h-8 rounded-none gap-1.5 text-xs px-3" onClick={() => setViewMode("kanban")}>
              <Kanban className="h-3.5 w-3.5" /> Board
            </Button>
            <Button size="sm" variant={viewMode === "list" ? "default" : "ghost"} className="h-8 rounded-none gap-1.5 text-xs px-3" onClick={() => setViewMode("list")}>
              <List className="h-3.5 w-3.5" /> List
            </Button>
          </div>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsFullscreen((f) => !f)} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center gap-2 shrink-0">
        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{activeNow.toLocaleString()}</span>
      </div>

      {/* Content */}
      {isLoading ?
      <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading tickets…</p>
        </div> :
      viewMode === "kanban" ?
      <KanbanView columns={stageColumns} getOwnerName={getOwnerName} getCreatorName={getCreatorName} onDrop={canEdit ? handleDrop : undefined} onEdit={handleOpenTicket} canCreate={canEdit} isCreating={createTicket.isPending} onCreateInStage={handleCreateInStage} teams={teams} priorities={priorities} ticketTypes={ticketTypes} /> :

      <ListView columns={stageColumns} getOwnerName={getOwnerName} stages={stages} canEdit={canEdit} onStageChange={handleListStageChange} onEdit={handleOpenTicket} />
      }

      {/* Edit dialog */}
      <TicketEditDialog ticket={editTicket} open={!!editTicket} onClose={() => setEditTicket(null)} stages={stages} teams={teams} />
    </div>);

};

/* ═══════════════════ Kanban View ═══════════════════ */
const KanbanView = ({
  columns,
  getOwnerName,
  getCreatorName,
  onDrop,
  onEdit,
  canCreate,
  isCreating,
  onCreateInStage,
  teams,
  priorities,
  ticketTypes,
}: {
  columns: StageColumn[];
  getOwnerName: (t: OverviewTicket) => string | null;
  getCreatorName: (t: OverviewTicket) => string;
  onDrop?: (ticketId: string, stageId: string) => void;
  onEdit?: (t: OverviewTicket) => void;
  canCreate: boolean;
  isCreating: boolean;
  onCreateInStage: (stageId: string, payload: { title: string; description: string; teamId?: string | null; priority: number; contactId?: string | null; ticketTypeId?: string | null; }) => Promise<void>;
  teams: { id: string; name: string }[];
  priorities: PriorityOption[];
  ticketTypes: { id: string; name: string }[];
}) => {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Collapsed columns state — initialise from is_closed / is_folded
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    columns.forEach((c) => { if (c.is_closed || c.is_folded) initial.add(c.id); });
    return initial;
  });

  // Keep in sync when columns change (e.g. new stages added)
  useEffect(() => {
    setCollapsedCols((prev) => {
      const next = new Set(prev);
      columns.forEach((c) => {
        if ((c.is_closed || c.is_folded) && !prev.has(c.id) && prev.size === 0) {
          // Only auto-collapse on first load; afterwards user controls it
        }
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns.length]);

  const toggleCollapse = (colId: string) => {
    setCollapsedCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      return next;
    });
  };

  const handleDragStart = (e: DragEvent, ticketId: string) => {
    e.dataTransfer.setData("text/plain", ticketId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCol(colId);
  };

  const handleDragLeave = () => setDragOverCol(null);

  const handleDropOnCol = (e: DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(null);
    const ticketId = e.dataTransfer.getData("text/plain");
    if (ticketId && onDrop) onDrop(ticketId, colId);
  };

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="flex gap-3 p-4 min-h-0 h-full">
        {columns.map((col) => {
          const isCollapsed = collapsedCols.has(col.id);

          return (
            <div
              key={col.id}
              className={cn(
                "flex flex-col shrink-0 rounded-lg transition-colors",
                isCollapsed ? "min-w-[56px] max-w-[56px]" : "min-w-[320px] max-w-[420px] flex-1",
                dragOverCol === col.id && "bg-primary/5 ring-2 ring-primary/30"
              )}
              onDragOver={onDrop ? (e) => handleDragOver(e, col.id) : undefined}
              onDragLeave={onDrop ? handleDragLeave : undefined}
              onDrop={onDrop ? (e) => handleDropOnCol(e, col.id) : undefined}>

              {isCollapsed ? (
                /* ── Collapsed column ── */
                <div className="flex flex-col items-center gap-2 py-2 h-full">
                  <button
                    onClick={() => toggleCollapse(col.id)}
                    className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title={`Expand ${col.name}`}>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-bold text-muted-foreground [writing-mode:vertical-lr] rotate-180 select-none tracking-wide">
                    {col.name}
                  </span>
                  <Badge variant="secondary" className="text-[9px] font-mono px-1">{col.tickets.length}</Badge>
                  {/* Drop zone strip */}
                  <div className={cn(
                    "flex-1 w-full rounded-md border-2 border-dashed transition-colors",
                    dragOverCol === col.id ? "border-primary/50 bg-primary/10" : "border-transparent"
                  )} />
                </div>
              ) : (
                /* ── Expanded column ── */
                <>
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      {(col.is_closed || col.is_folded) && (
                        <button
                          onClick={() => toggleCollapse(col.id)}
                          className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title={`Collapse ${col.name}`}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <h3 className="font-semibold text-foreground text-lg">{col.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {canCreate && col.name.toLowerCase() === "new" && col.id !== "__unstaged" && (
                        <StageCreateTicketPopover
                          stageName={col.name}
                          teams={teams}
                          priorities={priorities}
                          ticketTypes={ticketTypes}
                          canCreate={canCreate}
                          isCreating={isCreating}
                          onCreate={(payload) => onCreateInStage(col.id, payload)}
                        />
                      )}
                      <Badge variant="secondary" className="text-[10px] font-mono">{col.tickets.length}</Badge>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-muted mx-3 mb-3 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", col.is_closed ? "bg-emerald-500" : col.is_folded ? "bg-muted-foreground" : "bg-primary")}
                      style={{ width: col.tickets.length > 0 ? "100%" : "0%" }} />
                  </div>

                  {/* Cards */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 px-3 pb-4">
                      {col.tickets.map((ticket) => {
                        const owner = getOwnerName(ticket);
                        return (
                          <div
                            key={ticket.id}
                            draggable={!!onDrop}
                            onDragStart={onDrop ? (e) => handleDragStart(e, ticket.id) : undefined}
                            onClick={() => onEdit?.(ticket)}
                            className={cn(
                              "rounded-lg border border-border bg-card p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow group",
                              onDrop && "cursor-grab active:cursor-grabbing",
                              onEdit && "cursor-pointer"
                            )}>
                            {/* Title row */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                                {ticket.title}
                                <span className="text-muted-foreground font-normal"> (#{ticket.ticket_number})</span>
                              </p>
                              <div className="flex items-center gap-1 shrink-0">
                                {owner &&
                                  <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white", getAvatarColor(owner))} title={owner}>
                                    {getInitial(owner)}
                                  </div>
                                }
                              </div>
                            </div>

                            {/* Contact info */}
                            {ticket.partner_contact && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", getAvatarColor(ticket.partner_contact.name))}>
                                  {getInitial(ticket.partner_contact.name)}
                                </div>
                                <span className="truncate font-medium">{ticket.partner_contact.name}</span>
                                {ticket.partner_contact.email && <span className="truncate hidden sm:inline text-xs">· {ticket.partner_contact.email}</span>}
                              </div>
                            )}

                            {/* Bottom row */}
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <PriorityStars priority={ticket.priority} />
                                  {ticket.priority > 1 && (
                                    <span className="text-xs font-medium" style={{ color: ["","","#b45309","#c2410c","#dc2626","#991b1b"][ticket.priority] }}>
                                      {["Low","Normal","Medium","High","Urgent","Critical"][ticket.priority]}
                                    </span>
                                  )}
                                </div>
                                {ticket.deadline && <span className="text-sm text-muted-foreground">⏱ {new Date(ticket.deadline).toLocaleDateString()}</span>}
                              </div>
                              <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                                <span className="truncate">Support team: {ticket.team?.name ?? "Unassigned"}</span>
                                <span className="truncate">Created by: {getCreatorName(ticket)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {col.tickets.length === 0 &&
                        <p className="text-xs text-muted-foreground text-center py-6">No tickets</p>
                      }
                    </div>
                  </ScrollArea>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════ List View ═══════════════════ */
const ListView = ({
  columns,
  getOwnerName,
  stages,
  canEdit,
  onStageChange,
  onEdit







}: {columns: StageColumn[];getOwnerName: (t: OverviewTicket) => string | null;stages: {id: string;name: string;is_closed?: boolean;is_folded?: boolean;}[];canEdit: boolean;onStageChange: (ticketId: string, stageId: string) => void;onEdit?: (t: OverviewTicket) => void;}) =>
<ScrollArea className="flex-1">
    <div className="p-4 space-y-4">
      {columns.map((col) =>
    <div key={col.id}>
          {/* Stage group header */}
          <div className="flex items-center gap-2 py-2 border-b border-border mb-1">
            <span className={cn("h-2 w-2 rounded-full", col.is_closed ? "bg-emerald-500" : col.is_folded ? "bg-muted-foreground" : "bg-primary")} />
            <h3 className="text-sm font-semibold text-foreground">{col.name}</h3>
            <Badge variant="secondary" className="text-[10px]">{col.tickets.length}</Badge>
          </div>

          {col.tickets.length > 0 ?
      <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 px-2 font-medium w-20">ID</th>
                  <th className="text-left py-1.5 px-2 font-medium">Priority</th>
                  <th className="text-left py-1.5 px-2 font-medium text-2xl">Name</th>
                  <th className="text-left py-1.5 px-2 font-medium">Contact</th>
                  <th className="text-left py-1.5 px-2 font-medium">Assigned to</th>
                  <th className="text-left py-1.5 px-2 font-medium">SLA Deadline</th>
                  <th className="text-left py-1.5 px-2 font-medium">Stage</th>
                  {canEdit && <th className="text-left py-1.5 px-2 font-medium w-12"></th>}
                </tr>
              </thead>
              <tbody>
                {col.tickets.map((ticket) => {
            const owner = getOwnerName(ticket);
            return (
              <tr key={ticket.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{ticket.ticket_number}</td>
                      <td className="py-2 px-2"><PriorityStars priority={ticket.priority} /></td>
                      <td className="py-2 px-2 font-medium text-foreground">{ticket.title}</td>
                      <td className="py-2 px-2 text-xs text-foreground">
                        {ticket.partner_contact?.name ?? <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-2 px-2">
                        {owner ?
                  <div className="flex items-center gap-1.5">
                            <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0", getAvatarColor(owner))}>
                              {getInitial(owner)}
                            </div>
                            <span className="text-xs text-foreground">{owner}</span>
                          </div> :

                  <span className="text-xs text-muted-foreground">—</span>
                  }
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {ticket.deadline ? <span className="flex items-center gap-1">⏱ {new Date(ticket.deadline).toLocaleDateString()}</span> : "—"}
                      </td>
                      <td className="py-2 px-2">
                        {canEdit ?
                  <Select
                    value={ticket.stage_id ?? "__none"}
                    onValueChange={(v) => {if (v !== "__none" && v !== ticket.stage_id) onStageChange(ticket.id, v);}}>
                    
                            <SelectTrigger className="h-7 w-36 text-[10px]"><SelectValue placeholder="Stage" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none" className="text-xs">Unstaged</SelectItem>
                              {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                            </SelectContent>
                          </Select> :

                  <Badge variant="outline" className={cn("text-[10px]", col.is_closed && "border-emerald-500/50 text-emerald-600")}>
                            {col.name}
                          </Badge>
                  }
                      </td>
                      {canEdit &&
                <td className="py-2 px-2">
                          <button
                    onClick={() => onEdit?.(ticket)}
                    className="h-7 w-7 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Edit ticket">
                    
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                }
                    </tr>);

          })}
              </tbody>
            </table> :

      <p className="text-xs text-muted-foreground py-2 px-2">No tickets in this stage.</p>
      }
        </div>
    )}
    </div>
  </ScrollArea>;


export default HelpdeskOverviewPage;
