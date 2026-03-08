import { useMemo, useState, useCallback, useRef, useEffect, DragEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, List, Kanban, Maximize2, Minimize2, Star, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";
import { useUpdateHelpdeskTicketStage } from "@/features/admin/helpdesk/hooks/useUpdateHelpdeskTicketStage";
import ContactPickerSelect from "@/components/admin/ContactPickerSelect";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface PriorityConfig { level: number; label: string; color: string; }

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
  ticket_type_id: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  deadline: string | null;
  stage: { id: string; name: string; sequence: number; is_closed: boolean; is_folded: boolean } | null;
  team: { id: string; name: string } | null;
  contact: { id: string; name: string; is_company: boolean } | null;
  ticket_type: { id: string; name: string } | null;
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

const AVATAR_COLORS = [
  "bg-blue-600", "bg-emerald-600", "bg-violet-600", "bg-amber-600",
  "bg-rose-600", "bg-cyan-600", "bg-pink-600", "bg-teal-600",
  "bg-indigo-600", "bg-lime-600", "bg-orange-600", "bg-fuchsia-600",
];

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitial = (name: string) => (name || "?")[0].toUpperCase();

const getPriorityLabel = (priority: number, priorities: PriorityConfig[]) => {
  const p = priorities.find(pr => pr.level === priority);
  return p?.label ?? (priority <= 1 ? "Normal" : `P${priority}`);
};

const getPriorityColor = (priority: number, priorities: PriorityConfig[]) => {
  const p = priorities.find(pr => pr.level === priority);
  return p?.color ?? "#6b7280";
};

const PriorityStars = ({ priority }: { priority: number }) => {
  if (priority <= 1) return null;
  return (
    <div className="flex gap-px">
      {Array.from({ length: Math.min(priority, 5) }).map((_, i) => (
        <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
      ))}
    </div>
  );
};

/* ═══════════════════ Edit Dialog ═══════════════════ */
const TicketEditDialog = ({
  ticket, open, onClose, stages, teams, ticketTypes, priorities,
}: {
  ticket: OverviewTicket | null;
  open: boolean;
  onClose: () => void;
  stages: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  ticketTypes: { id: string; name: string }[];
  priorities: PriorityConfig[];
}) => {
  const updateTicket = useUpdateHelpdeskTicket();
  const updateStage = useUpdateHelpdeskTicketStage();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", priority: "1", team_id: "", stage_id: "", partner_contact_id: "", ticket_type_id: "" });

  const lastId = useRef<string | null>(null);
  if (ticket && ticket.id !== lastId.current) {
    lastId.current = ticket.id;
    setForm({
      title: ticket.title,
      description: ticket.description || "",
      priority: String(ticket.priority),
      team_id: ticket.team_id || "",
      stage_id: ticket.stage_id || "",
      partner_contact_id: ticket.partner_contact_id || "",
      ticket_type_id: ticket.ticket_type_id || "",
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
      partner_contact_id: form.partner_contact_id || null,
      ticket_type_id: form.ticket_type_id || null,
    });
    if (form.stage_id !== (ticket.stage_id || "") && form.stage_id) {
      await updateStage.mutateAsync({ ticketId: ticket.id, stageId: form.stage_id, actorUserId: user?.id });
    }
    qc.invalidateQueries({ queryKey: ["helpdesk-overview-tickets"] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Edit Ticket {ticket?.ticket_number}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {/* Ticket type above title */}
          <Select value={form.ticket_type_id || "__none"} onValueChange={v => { const typeId = v === "__none" ? "" : v; const typeName = ticketTypes.find(t => t.id === typeId)?.name; setForm(p => ({ ...p, ticket_type_id: typeId, description: !p.description.trim() && typeName ? typeName : p.description })); }}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Ticket Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none" className="text-xs">No type</SelectItem>
              {ticketTypes.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title" className="h-8 text-xs" />
          <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description" className="text-xs min-h-[80px]" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {priorities.map(pr => <SelectItem key={pr.level} value={String(pr.level)} className="text-xs">{pr.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.team_id || "__none"} onValueChange={v => setForm(p => ({ ...p, team_id: v === "__none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">No team</SelectItem>
                {teams.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.stage_id || "__none"} onValueChange={v => setForm(p => ({ ...p, stage_id: v === "__none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">Unstaged</SelectItem>
                {stages.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <ContactPickerSelect value={form.partner_contact_id} onValueChange={v => setForm(p => ({ ...p, partner_contact_id: v }))} placeholder="Assign contact" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={updateTicket.isPending || updateStage.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════ Urgent Alert ═══════════════════ */
const UrgentAlertDialog = ({ tickets, priorities, onClose }: { tickets: OverviewTicket[]; priorities: PriorityConfig[]; onClose: () => void }) => {
  if (tickets.length === 0) return null;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md border-destructive border-2">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Urgent Tickets Require Attention
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {tickets.map(t => (
            <div key={t.id} className="p-2 rounded bg-destructive/10 border border-destructive/30">
              <p className="text-sm font-semibold text-destructive">{t.ticket_number} — {t.title}</p>
              <p className="text-xs text-muted-foreground">Priority: {getPriorityLabel(t.priority, priorities)} · Created {new Date(t.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="destructive" size="sm" onClick={onClose}>Acknowledge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ═══════════════════ Main Page ═══════════════════ */
const HelpdeskOverviewPage = () => {
  const { canView, canEditFeature } = useRolePermissions();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const canViewHelpdesk = canView("helpdesk");
  const canEdit = canEditFeature("helpdesk");

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editTicket, setEditTicket] = useState<OverviewTicket | null>(null);
  const [collapsedCols, setCollapsedCols] = useState<Set<string>>(new Set());
  const [urgentDismissed, setUrgentDismissed] = useState(false);

  const updateStage = useUpdateHelpdeskTicketStage();

  // Auto-switch to list on mobile
  useEffect(() => {
    if (isMobile) setViewMode("list");
  }, [isMobile]);

  const { data: priorities = [] } = useQuery({
    queryKey: ["helpdesk", "priorities"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_priorities").select("level,label,color").eq("is_active", true).order("level");
      if (error) throw error;
      return (data ?? []) as PriorityConfig[];
    },
  });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-overview-tickets"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_tickets")
        .select("id,ticket_number,title,description,priority,owner_user_id,partner_contact_id,stage_id,team_id,ticket_type_id,created_at,updated_at,closed_at,deadline,stage:helpdesk_ticket_stages(id,name,sequence,is_closed,is_folded),team:helpdesk_teams(id,name),contact:contacts!helpdesk_tickets_partner_contact_id_fkey(id,name,is_company),ticket_type:helpdesk_ticket_types(id,name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as OverviewTicket[];
    },
    refetchInterval: 30000,
  });

  const ownerIds = useMemo(() => [...new Set(tickets.map(t => t.owner_user_id).filter(Boolean) as string[])], [tickets]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["helpdesk-overview-profiles", ownerIds],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("profiles").select("user_id,display_name").in("user_id", ownerIds);
      if (error) throw error;
      return (data ?? []) as { user_id: string; display_name: string | null }[];
    },
  });
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.user_id, p])), [profiles]);

  const { data: stages = [] } = useQuery({
    queryKey: ["helpdesk-overview-stages"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_stages").select("id,name,sequence,is_closed,is_folded").order("sequence");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["helpdesk-overview-teams"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_teams").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: ticketTypes = [] } = useQuery({
    queryKey: ["helpdesk-overview-ticket-types"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_types").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  // Initialize collapsed state from stages
  useEffect(() => {
    if (stages.length > 0) {
      const foldable = new Set<string>(stages.filter((s: any) => s.is_closed || s.is_folded).map((s: any) => s.id as string));
      setCollapsedCols(foldable);
    }
  }, [stages]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tickets.filter(t => {
      if (teamFilter !== "all" && t.team_id !== teamFilter) return false;
      if (s && !t.title.toLowerCase().includes(s) && !t.ticket_number.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [tickets, search, teamFilter]);

  const stageColumns: StageColumn[] = useMemo(() => {
    const cols: StageColumn[] = stages.map((s: any) => ({ ...s, tickets: filtered.filter(t => t.stage_id === s.id) }));
    const unstaged = filtered.filter(t => !t.stage_id);
    if (unstaged.length > 0) {
      cols.unshift({ id: "__unstaged", name: "Unstaged", sequence: -1, is_closed: false, is_folded: false, tickets: unstaged });
    }
    return cols;
  }, [stages, filtered]);

  // Urgent tickets: priority >= 4, older than 20h, not closed
  const urgentTickets = useMemo(() => {
    const threshold = Date.now() - 20 * 60 * 60 * 1000;
    return tickets.filter(t =>
      t.priority >= 4 &&
      new Date(t.created_at).getTime() < threshold &&
      !(t.stage?.is_closed || t.stage?.is_folded)
    );
  }, [tickets]);

  const getOwnerName = useCallback((ticket: OverviewTicket) => {
    if (!ticket.owner_user_id) return null;
    const p = profileMap.get(ticket.owner_user_id);
    return p?.display_name || ticket.owner_user_id.slice(0, 6);
  }, [profileMap]);

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

  const toggleCol = (colId: string) => {
    setCollapsedCols(prev => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId); else next.add(colId);
      return next;
    });
  };

  if (!canViewHelpdesk) {
    return <p className="text-sm text-muted-foreground p-4">You do not have access to the Helpdesk.</p>;
  }

  const containerClass = isFullscreen ? "fixed inset-0 z-50 bg-background flex flex-col" : "flex flex-col h-full";

  return (
    <div className={containerClass}>
      {/* Urgent alert */}
      {urgentTickets.length > 0 && !urgentDismissed && (
        <UrgentAlertDialog tickets={urgentTickets} priorities={priorities} onClose={() => setUrgentDismissed(true)} />
      )}

      {/* Header bar */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <AdminPageHeader title="Helpdesk Overview" icon={LayoutDashboard} />
          <Badge variant="outline" className="text-xs">{filtered.length} tickets</Badge>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets…" className="h-8 w-full sm:w-56 text-xs" />
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="h-8 w-full sm:w-40 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
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
          <Button size="icon" variant="ghost" className="h-8 w-8 hidden sm:flex" onClick={() => setIsFullscreen(f => !f)} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading tickets…</p>
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanView columns={stageColumns} getOwnerName={getOwnerName} onDrop={canEdit ? handleDrop : undefined} onEdit={canEdit ? setEditTicket : undefined} priorities={priorities} collapsedCols={collapsedCols} onToggleCol={toggleCol} />
      ) : (
        <ListView columns={stageColumns} getOwnerName={getOwnerName} stages={stages} canEdit={canEdit} onStageChange={handleListStageChange} onEdit={canEdit ? setEditTicket : undefined} priorities={priorities} />
      )}

      <TicketEditDialog ticket={editTicket} open={!!editTicket} onClose={() => setEditTicket(null)} stages={stages} teams={teams} ticketTypes={ticketTypes} priorities={priorities} />
    </div>
  );
};

/* ═══════════════════ Kanban View ═══════════════════ */
const KanbanView = ({
  columns, getOwnerName, onDrop, onEdit, priorities, collapsedCols, onToggleCol,
}: {
  columns: StageColumn[];
  getOwnerName: (t: OverviewTicket) => string | null;
  onDrop?: (ticketId: string, stageId: string) => void;
  onEdit?: (t: OverviewTicket) => void;
  priorities: PriorityConfig[];
  collapsedCols: Set<string>;
  onToggleCol: (colId: string) => void;
}) => {
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

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
        {columns.map(col => {
          const isFoldable = col.is_closed || col.is_folded;
          const isCollapsed = collapsedCols.has(col.id);

          return (
            <div
              key={col.id}
              className={cn(
                "flex flex-col shrink-0 rounded-lg transition-colors",
                isCollapsed ? "min-w-[80px] max-w-[80px]" : "min-w-[280px] max-w-[320px]",
                dragOverCol === col.id && "bg-primary/5 ring-2 ring-primary/30"
              )}
              onDragOver={onDrop ? (e) => handleDragOver(e, col.id) : undefined}
              onDragLeave={onDrop ? handleDragLeave : undefined}
              onDrop={onDrop ? (e) => handleDropOnCol(e, col.id) : undefined}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-2 mb-2 gap-1">
                {isFoldable && (
                  <button onClick={() => onToggleCol(col.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
                {!isCollapsed && <h3 className="text-sm font-semibold text-foreground truncate">{col.name}</h3>}
                <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{col.tickets.length}</Badge>
              </div>

              {isCollapsed ? (
                /* Collapsed: thin drop zone */
                <div className="flex-1 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground [writing-mode:vertical-lr] rotate-180">{col.name}</span>
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full bg-muted mx-3 mb-3 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", col.is_closed ? "bg-emerald-500" : col.is_folded ? "bg-muted-foreground" : "bg-primary")}
                      style={{ width: col.tickets.length > 0 ? "100%" : "0%" }}
                    />
                  </div>

                  {/* Cards */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-2 px-3 pb-4">
                      {col.tickets.map(ticket => {
                        const owner = getOwnerName(ticket);
                        const prioColor = getPriorityColor(ticket.priority, priorities);
                        return (
                          <div
                            key={ticket.id}
                            draggable={!!onDrop}
                            onDragStart={onDrop ? (e) => handleDragStart(e, ticket.id) : undefined}
                            onClick={() => onEdit?.(ticket)}
                            className={cn(
                              "rounded-lg border border-border p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
                              onDrop && "active:cursor-grabbing"
                            )}
                            style={{ backgroundColor: `${prioColor}15` }}
                          >
                            {/* Ticket type above title */}
                            {ticket.ticket_type && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 w-fit">{ticket.ticket_type.name}</Badge>
                            )}

                            {/* Title row */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                                {ticket.title}
                                <span className="text-muted-foreground font-normal"> (#{ticket.ticket_number})</span>
                              </p>
                              {owner && (
                                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", getAvatarColor(owner))} title={owner}>
                                  {getInitial(owner)}
                                </div>
                              )}
                            </div>

                            {/* Contact */}
                            {ticket.contact && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground truncate">
                                <span>{ticket.contact.is_company ? "🏢" : "👤"}</span>
                                <span className="truncate">{ticket.contact.name}</span>
                              </div>
                            )}

                            {/* Bottom row */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-[9px] px-1 py-0" style={{ borderColor: prioColor, color: prioColor }}>{getPriorityLabel(ticket.priority, priorities)}</Badge>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {ticket.deadline && <span className="text-[10px] text-muted-foreground">⏱</span>}
                                {ticket.team && <Badge variant="outline" className="text-[9px] px-1 py-0">{ticket.team.name.slice(0, 1)}</Badge>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {col.tickets.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">No tickets</p>
                      )}
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
  columns, getOwnerName, stages, canEdit, onStageChange, onEdit, priorities,
}: {
  columns: StageColumn[];
  getOwnerName: (t: OverviewTicket) => string | null;
  stages: { id: string; name: string; is_closed?: boolean; is_folded?: boolean }[];
  canEdit: boolean;
  onStageChange: (ticketId: string, stageId: string) => void;
  onEdit?: (t: OverviewTicket) => void;
  priorities: PriorityConfig[];
}) => (
  <ScrollArea className="flex-1">
    <div className="p-4 space-y-4">
      {columns.map(col => (
        <div key={col.id}>
          <div className="flex items-center gap-2 py-2 border-b border-border mb-1">
            <span className={cn("h-2 w-2 rounded-full", col.is_closed ? "bg-emerald-500" : col.is_folded ? "bg-muted-foreground" : "bg-primary")} />
            <h3 className="text-sm font-semibold text-foreground">{col.name}</h3>
            <Badge variant="secondary" className="text-[10px]">{col.tickets.length}</Badge>
          </div>

          {col.tickets.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left py-1.5 px-2 font-medium w-20">ID</th>
                    <th className="text-left py-1.5 px-2 font-medium">Priority</th>
                    <th className="text-left py-1.5 px-2 font-medium">Type</th>
                    <th className="text-left py-1.5 px-2 font-medium">Name</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Customer</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden md:table-cell">Assigned to</th>
                    <th className="text-left py-1.5 px-2 font-medium hidden lg:table-cell">SLA Deadline</th>
                    <th className="text-left py-1.5 px-2 font-medium">Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {col.tickets.map(ticket => {
                    const owner = getOwnerName(ticket);
                    const prioColor = getPriorityColor(ticket.priority, priorities);
                    return (
                      <tr
                        key={ticket.id}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={(e) => {
                          // Don't trigger edit if clicking stage dropdown
                          if ((e.target as HTMLElement).closest('[data-stage-select]')) return;
                          onEdit?.(ticket);
                        }}
                        style={{ borderLeft: `3px solid ${prioColor}` }}
                      >
                        <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{ticket.ticket_number}</td>
                        <td className="py-2 px-2">
                          <Badge variant="outline" className="text-[9px] px-1 py-0" style={{ borderColor: prioColor, color: prioColor }}>{getPriorityLabel(ticket.priority, priorities)}</Badge>
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground">{ticket.ticket_type?.name ?? "—"}</td>
                        <td className="py-2 px-2 font-medium text-foreground">{ticket.title}</td>
                        <td className="py-2 px-2 text-xs text-foreground hidden md:table-cell">
                          {ticket.contact ? (
                            <span className="flex items-center gap-1">
                              <span>{ticket.contact.is_company ? "🏢" : "👤"}</span>
                              {ticket.contact.name}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2 px-2 hidden md:table-cell">
                          {owner ? (
                            <div className="flex items-center gap-1.5">
                              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0", getAvatarColor(owner))}>
                                {getInitial(owner)}
                              </div>
                              <span className="text-xs text-foreground">{owner}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-xs text-muted-foreground hidden lg:table-cell">
                          {ticket.deadline ? <span className="flex items-center gap-1">⏱ {new Date(ticket.deadline).toLocaleDateString()}</span> : "—"}
                        </td>
                        <td className="py-2 px-2" data-stage-select>
                          {canEdit ? (
                            <Select value={ticket.stage_id ?? "__none"} onValueChange={(v) => { if (v !== "__none" && v !== ticket.stage_id) onStageChange(ticket.id, v); }}>
                              <SelectTrigger className="h-7 w-36 text-[10px]"><SelectValue placeholder="Stage" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none" className="text-xs">Unstaged</SelectItem>
                                {stages.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={cn("text-[10px]", col.is_closed && "border-emerald-500/50 text-emerald-600")}>{col.name}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-2 px-2">No tickets in this stage.</p>
          )}
        </div>
      ))}
    </div>
  </ScrollArea>
);

export default HelpdeskOverviewPage;
