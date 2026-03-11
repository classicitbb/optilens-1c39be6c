import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersRound, UserPlus, X, ChevronDown, ChevronRight } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useDeleteHelpdeskTeam, useUpdateHelpdeskTeam } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";
import { cn } from "@/lib/utils";

interface HelpdeskTeam {
  id: string;
  name: string;
  assignment_mode: string;
  visibility: string;
  is_active: boolean;
  created_at: string;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  created_at: string;
  profile?: { display_name: string | null; user_id: string } | null;
}

interface UserOption {
  user_id: string;
  display_name: string | null;
  email?: string;
}

const HelpdeskTeamsPage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canViewTeams = canView("helpdesk-teams");
  const canEditTeams = canEditFeature("helpdesk-teams");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState({ name: "", assignmentMode: "manual", visibility: "internal" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", assignmentMode: "", visibility: "" });
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [addMemberDialog, setAddMemberDialog] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  const { data: teams = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["helpdesk", "teams"],
    enabled: canViewTeams,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_teams")
        .select("id,name,assignment_mode,visibility,is_active,created_at")
        .order("name");
      if (error) throw error;
      return (data ?? []) as HelpdeskTeam[];
    },
  });

  // Fetch all team members
  const { data: allMembers = [] } = useQuery({
    queryKey: ["helpdesk", "team-members"],
    enabled: canViewTeams,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_team_members")
        .select("id,team_id,user_id,role,created_at")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as TeamMember[];
    },
  });

  // Fetch profiles for members
  const memberUserIds = useMemo(() => [...new Set(allMembers.map(m => m.user_id))], [allMembers]);
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["helpdesk", "team-member-profiles", memberUserIds],
    enabled: memberUserIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("user_id,display_name")
        .in("user_id", memberUserIds);
      if (error) throw error;
      return (data ?? []) as UserOption[];
    },
  });
  const profileMap = useMemo(() => new Map(memberProfiles.map(p => [p.user_id, p])), [memberProfiles]);

  // Fetch all available users for the add member dialog
  const { data: allUsers = [] } = useQuery({
    queryKey: ["helpdesk", "all-users-for-teams"],
    enabled: canEditTeams,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("user_id,display_name")
        .order("display_name");
      if (error) throw error;
      return (data ?? []) as UserOption[];
    },
  });

  const membersForTeam = (teamId: string) =>
    allMembers.filter(m => m.team_id === teamId).map(m => ({
      ...m,
      profile: profileMap.get(m.user_id) ?? null,
    }));

  const createTeam = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      if (!name) throw new Error("Team name is required.");
      const { error } = await (supabase as any).from("helpdesk_teams").insert({
        name,
        assignment_mode: form.assignmentMode,
        visibility: form.visibility,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", assignmentMode: "manual", visibility: "internal" });
      qc.invalidateQueries({ queryKey: ["helpdesk", "teams"] });
      toast({ title: "Team created" });
    },
    onError: (err) => {
      toast({ title: "Unable to create team", description: (err as Error).message, variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await (supabase as any).from("helpdesk_teams").update({ is_active: !isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["helpdesk", "teams"] }),
  });

  const addMember = useMutation({
    mutationFn: async ({ teamId, userId, role }: { teamId: string; userId: string; role: string }) => {
      const { error } = await (supabase as any).from("helpdesk_team_members").insert({
        team_id: teamId,
        user_id: userId,
        role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "team-members"] });
      setAddMemberDialog(null);
      setSelectedUserId("");
      setMemberRole("member");
      toast({ title: "Member added" });
    },
    onError: (err) => {
      toast({ title: "Unable to add member", description: (err as Error).message, variant: "destructive" });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await (supabase as any).from("helpdesk_team_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "team-members"] });
      toast({ title: "Member removed" });
    },
    onError: (err) => {
      toast({ title: "Unable to remove member", description: (err as Error).message, variant: "destructive" });
    },
  });

  const updateTeam = useUpdateHelpdeskTeam();
  const deleteTeam = useDeleteHelpdeskTeam();

  const startEdit = (team: HelpdeskTeam) => {
    setEditingId(team.id);
    setEditForm({ name: team.name, assignmentMode: team.assignment_mode, visibility: team.visibility });
  };

  const saveEdit = (id: string) => {
    updateTeam.mutate({ id, name: editForm.name.trim(), assignment_mode: editForm.assignmentMode, visibility: editForm.visibility });
    setEditingId(null);
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const filteredTeams = useMemo(() => {
    const s = search.trim().toLowerCase();
    return teams.filter((team) => {
      const matchActive = activeFilter === "all" || (activeFilter === "active" ? team.is_active : !team.is_active);
      const matchSearch = !s || team.name.toLowerCase().includes(s) || team.assignment_mode.toLowerCase().includes(s) || team.visibility.toLowerCase().includes(s);
      return matchActive && matchSearch;
    });
  }, [teams, search, activeFilter]);

  const availableUsersForTeam = (teamId: string) => {
    const existingIds = new Set(membersForTeam(teamId).map(m => m.user_id));
    return allUsers.filter(u => !existingIds.has(u.user_id));
  };

  if (!canViewTeams) {
    return <p className="text-sm text-muted-foreground">You do not have access to Helpdesk teams.</p>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Helpdesk Teams" icon={UsersRound}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teams…" className="h-8 w-72 text-xs" />
          <Select value={activeFilter} onValueChange={(v: "all" | "active" | "inactive") => setActiveFilter(v)}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All teams</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminPageHeader>

      {canEditTeams && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Create Team</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Team name" className="h-8 text-xs" />
            <Select value={form.assignmentMode} onValueChange={(v) => setForm((p) => ({ ...p, assignmentMode: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                <SelectItem value="round_robin" className="text-xs">Round robin</SelectItem>
                <SelectItem value="balanced" className="text-xs">Balanced</SelectItem>
                <SelectItem value="auto" className="text-xs">Auto</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.visibility} onValueChange={(v) => setForm((p) => ({ ...p, visibility: v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="internal" className="text-xs">Internal</SelectItem>
                <SelectItem value="invited" className="text-xs">Invited</SelectItem>
                <SelectItem value="public" className="text-xs">Public</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8 text-xs" onClick={() => createTeam.mutate()} disabled={createTeam.isPending}>Create Team</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Team Directory <Badge variant="outline">{filteredTeams.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground">Loading teams…</p>}
          {isError && (
            <div className="space-y-2">
              <p className="text-xs text-destructive">Unable to load teams. {(error as Error)?.message ?? "Please retry."}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>Retry</Button>
            </div>
          )}
          {!isLoading && !isError && filteredTeams.length === 0 && <p className="text-xs text-muted-foreground">No teams match your current filters.</p>}
          {!isLoading && !isError && filteredTeams.length > 0 && (
            <div className="space-y-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    {canEditTeams && <TableHead className="w-52">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeams.map((team) => {
                    const members = membersForTeam(team.id);
                    const isExpanded = expandedTeams.has(team.id);
                    return (
                      <Collapsible key={team.id} asChild open={isExpanded} onOpenChange={() => toggleExpand(team.id)}>
                        <>
                          <TableRow className="group">
                            <TableCell className="px-2">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                </Button>
                              </CollapsibleTrigger>
                            </TableCell>
                            <TableCell>
                              {editingId === team.id ? (
                                <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="h-7 text-xs" />
                              ) : <span className="font-medium">{team.name}</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[10px]">{members.length}</Badge>
                            </TableCell>
                            <TableCell>
                              {editingId === team.id ? (
                                <Select value={editForm.assignmentMode} onValueChange={(v) => setEditForm((p) => ({ ...p, assignmentMode: v }))}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                                    <SelectItem value="round_robin" className="text-xs">Round robin</SelectItem>
                                    <SelectItem value="balanced" className="text-xs">Balanced</SelectItem>
                                    <SelectItem value="auto" className="text-xs">Auto</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : <span className="capitalize text-xs">{team.assignment_mode.replace("_", " ")}</span>}
                            </TableCell>
                            <TableCell>
                              {editingId === team.id ? (
                                <Select value={editForm.visibility} onValueChange={(v) => setEditForm((p) => ({ ...p, visibility: v }))}>
                                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="internal" className="text-xs">Internal</SelectItem>
                                    <SelectItem value="invited" className="text-xs">Invited</SelectItem>
                                    <SelectItem value="public" className="text-xs">Public</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : <span className="capitalize text-xs">{team.visibility}</span>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={team.is_active ? "default" : "secondary"} className="text-[10px]">
                                {team.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(team.created_at).toLocaleDateString()}</TableCell>
                            {canEditTeams && (
                              <TableCell className="flex gap-1">
                                {editingId === team.id ? (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => saveEdit(team.id)}>Save</Button>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>Cancel</Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startEdit(team)}>Edit</Button>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setAddMemberDialog(team.id)}>
                                      <UserPlus className="h-3 w-3" /> Add
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => toggleActive.mutate({ id: team.id, isActive: team.is_active })}>
                                      {team.is_active ? "Disable" : "Enable"}
                                    </Button>
                                    {isAdmin && (
                                      <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                          <AlertDialogHeader>
                                            <AlertDialogTitle>Delete team "{team.name}"?</AlertDialogTitle>
                                            <AlertDialogDescription>All tickets assigned to this team will be unlinked. This cannot be undone.</AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => deleteTeam.mutate(team.id)}>Delete</AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog>
                                    )}
                                  </>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                          <CollapsibleContent asChild>
                            <tr>
                              <td colSpan={canEditTeams ? 8 : 7} className="p-0">
                                <div className="bg-muted/20 border-t border-b border-border px-8 py-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team Members</h4>
                                    {canEditTeams && (
                                      <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1" onClick={() => setAddMemberDialog(team.id)}>
                                        <UserPlus className="h-3 w-3" /> Add Member
                                      </Button>
                                    )}
                                  </div>
                                  {members.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No members assigned yet.</p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {members.map(member => (
                                        <div
                                          key={member.id}
                                          className="flex items-center gap-1.5 bg-background border border-border rounded-md px-2.5 py-1.5"
                                        >
                                          <div className={cn(
                                            "h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white",
                                            "bg-primary"
                                          )}>
                                            {(member.profile?.display_name || "U")[0].toUpperCase()}
                                          </div>
                                          <span className="text-xs font-medium">{member.profile?.display_name || member.user_id.slice(0, 8)}</span>
                                          <Badge variant="secondary" className="text-[9px] px-1 py-0 capitalize">{member.role}</Badge>
                                          {canEditTeams && (
                                            <button
                                              onClick={() => removeMember.mutate(member.id)}
                                              className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
                                              title="Remove member"
                                            >
                                              <X className="h-3 w-3" />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={!!addMemberDialog} onOpenChange={open => { if (!open) { setAddMemberDialog(null); setSelectedUserId(""); setMemberRole("member"); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">User</label>
              <Select value={selectedUserId || "__none"} onValueChange={v => setSelectedUserId(v === "__none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select a user…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs text-muted-foreground">Select a user…</SelectItem>
                  {addMemberDialog && availableUsersForTeam(addMemberDialog).map(u => (
                    <SelectItem key={u.user_id} value={u.user_id} className="text-xs">
                      {u.display_name || u.user_id.slice(0, 12)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Role</label>
              <Select value={memberRole} onValueChange={setMemberRole}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member" className="text-xs">Member</SelectItem>
                  <SelectItem value="lead" className="text-xs">Team Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddMemberDialog(null)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!selectedUserId || addMember.isPending}
              onClick={() => addMemberDialog && selectedUserId && addMember.mutate({ teamId: addMemberDialog, userId: selectedUserId, role: memberRole })}
            >
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelpdeskTeamsPage;
