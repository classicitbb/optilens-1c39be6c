import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UsersRound } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useDeleteHelpdeskTeam, useUpdateHelpdeskTeam } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";

interface HelpdeskTeam {
  id: string;
  name: string;
  assignment_mode: string;
  visibility: string;
  is_active: boolean;
  created_at: string;
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

  const filteredTeams = useMemo(() => {
    const s = search.trim().toLowerCase();
    return teams.filter((team) => {
      const matchActive = activeFilter === "all" || (activeFilter === "active" ? team.is_active : !team.is_active);
      const matchSearch = !s || team.name.toLowerCase().includes(s) || team.assignment_mode.toLowerCase().includes(s) || team.visibility.toLowerCase().includes(s);
      return matchActive && matchSearch;
    });
  }, [teams, search, activeFilter]);

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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Assignment</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  {canEditTeams && <TableHead className="w-48">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell>
                      {editingId === team.id ? (
                        <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className="h-7 text-xs" />
                      ) : team.name}
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
                      ) : <span className="capitalize">{team.assignment_mode.replace("_", " ")}</span>}
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
                      ) : <span className="capitalize">{team.visibility}</span>}
                    </TableCell>
                    <TableCell>{team.is_active ? "Active" : "Inactive"}</TableCell>
                    <TableCell>{new Date(team.created_at).toLocaleDateString()}</TableCell>
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpdeskTeamsPage;
