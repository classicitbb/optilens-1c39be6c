import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, List, Kanban, Maximize2, Minimize2, Star } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { normalizeHelpdeskPriorityLabel } from "@/features/admin/helpdesk/utils/normalization";
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
  stage: { id: string; name: string; sequence: number; is_closed: boolean; is_folded: boolean } | null;
  team: { id: string; name: string } | null;
  owner_profile: { display_name: string | null; user_id: string } | null;
  partner_contact: { name: string } | null;
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
  5: "bg-red-600/20 text-red-800 dark:text-red-300",
};

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

const HelpdeskOverviewPage = () => {
  const { canView } = useRolePermissions();
  const canViewHelpdesk = canView("helpdesk");

  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-overview-tickets"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_tickets")
        .select("id,ticket_number,title,description,priority,owner_user_id,partner_contact_id,stage_id,team_id,created_at,updated_at,closed_at,deadline,stage:helpdesk_ticket_stages(id,name,sequence,is_closed,is_folded),team:helpdesk_teams(id,name),partner_contact:contacts!helpdesk_tickets_partner_contact_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as OverviewTicket[];
    },
    refetchInterval: 30000,
  });

  // Fetch profiles separately for owner display names
  const ownerIds = useMemo(() => [...new Set(tickets.map(t => t.owner_user_id).filter(Boolean) as string[])], [tickets]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["helpdesk-overview-profiles", ownerIds],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("user_id,display_name")
        .in("user_id", ownerIds);
      if (error) throw error;
      return (data ?? []) as { user_id: string; display_name: string | null }[];
    },
  });
  const profileMap = useMemo(() => new Map(profiles.map(p => [p.user_id, p])), [profiles]);

  const { data: stages = [] } = useQuery({
    queryKey: ["helpdesk-overview-stages"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_ticket_stages")
        .select("id,name,sequence,is_closed,is_folded")
        .order("sequence");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["helpdesk-overview-teams"],
    enabled: canViewHelpdesk,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_teams")
        .select("id,name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return tickets.filter(t => {
      if (teamFilter !== "all" && t.team_id !== teamFilter) return false;
      if (s && !t.title.toLowerCase().includes(s) && !t.ticket_number.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [tickets, search, teamFilter]);

  const stageColumns: StageColumn[] = useMemo(() => {
    const cols: StageColumn[] = stages.map((s: any) => ({
      ...s,
      tickets: filtered.filter(t => t.stage_id === s.id),
    }));
    // Add unstaged column if needed
    const unstaged = filtered.filter(t => !t.stage_id);
    if (unstaged.length > 0) {
      cols.unshift({ id: "__unstaged", name: "Unstaged", sequence: -1, is_closed: false, is_folded: false, tickets: unstaged });
    }
    return cols;
  }, [stages, filtered]);

  const getOwnerName = (ticket: OverviewTicket) => {
    if (!ticket.owner_user_id) return null;
    const p = profileMap.get(ticket.owner_user_id);
    return p?.display_name || ticket.owner_user_id.slice(0, 6);
  };

  const getCustomerName = (ticket: OverviewTicket) => {
    return (ticket.partner_contact as any)?.name || null;
  };

  if (!canViewHelpdesk) {
    return <p className="text-sm text-muted-foreground p-4">You do not have access to the Helpdesk.</p>;
  }

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-background flex flex-col"
    : "flex flex-col h-full";

  return (
    <div className={containerClass}>
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <AdminPageHeader title="Helpdesk Overview" icon={LayoutDashboard} />
          <Badge variant="outline" className="text-xs">{filtered.length} tickets</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets…"
            className="h-8 w-56 text-xs"
          />
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All teams</SelectItem>
              {teams.map((t: any) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-md overflow-hidden">
            <Button
              size="sm"
              variant={viewMode === "kanban" ? "default" : "ghost"}
              className="h-8 rounded-none gap-1.5 text-xs px-3"
              onClick={() => setViewMode("kanban")}
            >
              <Kanban className="h-3.5 w-3.5" /> Board
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-8 rounded-none gap-1.5 text-xs px-3"
              onClick={() => setViewMode("list")}
            >
              <List className="h-3.5 w-3.5" /> List
            </Button>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setIsFullscreen(f => !f)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
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
        <KanbanView columns={stageColumns} getOwnerName={getOwnerName} getCustomerName={getCustomerName} />
      ) : (
        <ListView columns={stageColumns} getOwnerName={getOwnerName} getCustomerName={getCustomerName} />
      )}
    </div>
  );
};

/* ═══════════════════ Kanban View ═══════════════════ */
const KanbanView = ({
  columns,
  getOwnerName,
  getCustomerName,
}: {
  columns: StageColumn[];
  getOwnerName: (t: OverviewTicket) => string | null;
  getCustomerName: (t: OverviewTicket) => string | null;
}) => (
  <div className="flex-1 overflow-x-auto">
    <div className="flex gap-3 p-4 min-h-0 h-full">
      {columns.map(col => (
        <div
          key={col.id}
          className="flex flex-col min-w-[280px] max-w-[320px] shrink-0"
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-2 mb-2">
            <h3 className="text-sm font-semibold text-foreground">{col.name}</h3>
            <Badge variant="secondary" className="text-[10px] font-mono">{col.tickets.length}</Badge>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-muted mx-3 mb-3 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                col.is_closed ? "bg-emerald-500" : col.is_folded ? "bg-muted-foreground" : "bg-primary"
              )}
              style={{ width: col.tickets.length > 0 ? "100%" : "0%" }}
            />
          </div>

          {/* Cards */}
          <ScrollArea className="flex-1">
            <div className="space-y-2 px-3 pb-4">
              {col.tickets.map(ticket => {
                const owner = getOwnerName(ticket);
                const customer = getCustomerName(ticket);
                return (
                  <div
                    key={ticket.id}
                    className="rounded-lg border border-border bg-card p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                        {ticket.title}
                        <span className="text-muted-foreground font-normal"> (#{ticket.ticket_number})</span>
                      </p>
                      {owner && (
                        <div
                          className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0", getAvatarColor(owner))}
                          title={owner}
                        >
                          {getInitial(owner)}
                        </div>
                      )}
                    </div>

                    {/* Customer */}
                    {customer && (
                      <p className="text-xs text-muted-foreground truncate">{customer}</p>
                    )}

                    {/* Bottom row */}
                    <div className="flex items-center justify-between">
                      <PriorityStars priority={ticket.priority} />
                      <div className="flex items-center gap-1.5">
                        {ticket.deadline && (
                          <span className="text-[10px] text-muted-foreground">⏱</span>
                        )}
                        {ticket.team && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0">{ticket.team.name.slice(0, 1)}</Badge>
                        )}
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
        </div>
      ))}
    </div>
  </div>
);

/* ═══════════════════ List View ═══════════════════ */
const ListView = ({
  columns,
  getOwnerName,
  getCustomerName,
}: {
  columns: StageColumn[];
  getOwnerName: (t: OverviewTicket) => string | null;
  getCustomerName: (t: OverviewTicket) => string | null;
}) => (
  <ScrollArea className="flex-1">
    <div className="p-4 space-y-4">
      {columns.map(col => (
        <div key={col.id}>
          {/* Stage group header */}
          <div className="flex items-center gap-2 py-2 border-b border-border mb-1">
            <span className={cn(
              "h-2 w-2 rounded-full",
              col.is_closed ? "bg-emerald-500" : col.is_folded ? "bg-muted-foreground" : "bg-primary"
            )} />
            <h3 className="text-sm font-semibold text-foreground">{col.name}</h3>
            <Badge variant="secondary" className="text-[10px]">{col.tickets.length}</Badge>
          </div>

          {col.tickets.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-1.5 px-2 font-medium w-20">ID</th>
                  <th className="text-left py-1.5 px-2 font-medium">Priority</th>
                  <th className="text-left py-1.5 px-2 font-medium">Name</th>
                  <th className="text-left py-1.5 px-2 font-medium">Assigned to</th>
                  <th className="text-left py-1.5 px-2 font-medium">Customer</th>
                  <th className="text-left py-1.5 px-2 font-medium">SLA Deadline</th>
                  <th className="text-left py-1.5 px-2 font-medium">Stage</th>
                </tr>
              </thead>
              <tbody>
                {col.tickets.map(ticket => {
                  const owner = getOwnerName(ticket);
                  const customer = getCustomerName(ticket);
                  return (
                    <tr key={ticket.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2 font-mono text-xs text-muted-foreground">{ticket.ticket_number}</td>
                      <td className="py-2 px-2">
                        <PriorityStars priority={ticket.priority} />
                      </td>
                      <td className="py-2 px-2 font-medium text-foreground">{ticket.title}</td>
                      <td className="py-2 px-2">
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
                      <td className="py-2 px-2 text-xs text-muted-foreground">{customer || "—"}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {ticket.deadline ? (
                          <span className="flex items-center gap-1">
                            ⏱ {new Date(ticket.deadline).toLocaleDateString()}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-2 px-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            col.is_closed && "border-emerald-500/50 text-emerald-600",
                            col.is_folded && "border-muted-foreground/50 text-muted-foreground"
                          )}
                        >
                          {col.name}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-muted-foreground py-2 px-2">No tickets in this stage.</p>
          )}
        </div>
      ))}
    </div>
  </ScrollArea>
);

export default HelpdeskOverviewPage;
