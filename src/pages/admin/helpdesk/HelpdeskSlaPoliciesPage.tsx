import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useDeleteHelpdeskSlaPolicy, useUpdateHelpdeskSlaPolicy } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";

interface TeamOption { id: string; name: string; }
interface StageOption { id: string; name: string; }
interface HelpdeskSlaPolicy {
  id: string; name: string; priority_filter: number | null; target_hours: number; active: boolean;
  team_id: string; target_stage_id: string;
  team?: { id: string; name: string } | null;
  target_stage?: { id: string; name: string } | null;
}

const HelpdeskSlaPoliciesPage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canViewPolicies = canView("helpdesk-sla");
  const canEditPolicies = canEditFeature("helpdesk-sla");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState({ name: "", teamId: "", targetStageId: "", targetHours: "24", priorityFilter: "" });

  // Edit dialog
  const [editPolicy, setEditPolicy] = useState<HelpdeskSlaPolicy | null>(null);
  const [editForm, setEditForm] = useState({ name: "", teamId: "", targetStageId: "", targetHours: "", priorityFilter: "" });

  const { data: teams = [] } = useQuery({
    queryKey: ["helpdesk", "teams", "options"],
    enabled: canViewPolicies,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_teams").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as TeamOption[];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["helpdesk", "stages", "options"],
    enabled: canViewPolicies,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_stages").select("id,name").order("sequence");
      if (error) throw error;
      return (data ?? []) as StageOption[];
    },
  });

  const { data: policies = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["helpdesk", "sla-policies"],
    enabled: canViewPolicies,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_sla_policies")
        .select("id,name,priority_filter,target_hours,active,team_id,target_stage_id,team:helpdesk_teams(id,name),target_stage:helpdesk_ticket_stages(id,name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as HelpdeskSlaPolicy[];
    },
  });

  const createPolicy = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Policy name is required.");
      if (!form.teamId) throw new Error("Team is required.");
      if (!form.targetStageId) throw new Error("Target stage is required.");
      const { error } = await (supabase as any).from("helpdesk_sla_policies").insert({
        name: form.name.trim(), team_id: form.teamId, target_stage_id: form.targetStageId,
        target_hours: Number(form.targetHours), priority_filter: form.priorityFilter ? Number(form.priorityFilter) : null, active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", teamId: "", targetStageId: "", targetHours: "24", priorityFilter: "" });
      qc.invalidateQueries({ queryKey: ["helpdesk", "sla-policies"] });
      toast({ title: "SLA policy created" });
    },
    onError: (err) => toast({ title: "Unable to create SLA policy", description: (err as Error).message, variant: "destructive" }),
  });

  const togglePolicy = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("helpdesk_sla_policies").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["helpdesk", "sla-policies"] }),
  });

  const deletePolicy = useDeleteHelpdeskSlaPolicy();
  const updatePolicy = useUpdateHelpdeskSlaPolicy();

  const openEdit = (policy: HelpdeskSlaPolicy) => {
    setEditPolicy(policy);
    setEditForm({ name: policy.name, teamId: policy.team_id, targetStageId: policy.target_stage_id, targetHours: String(policy.target_hours), priorityFilter: policy.priority_filter != null ? String(policy.priority_filter) : "" });
  };

  const saveEdit = () => {
    if (!editPolicy) return;
    updatePolicy.mutate({ id: editPolicy.id, name: editForm.name.trim(), team_id: editForm.teamId, target_stage_id: editForm.targetStageId, target_hours: Number(editForm.targetHours), priority_filter: editForm.priorityFilter ? Number(editForm.priorityFilter) : null });
    setEditPolicy(null);
  };

  const filteredPolicies = useMemo(() => {
    const s = search.trim().toLowerCase();
    return policies.filter((p) => {
      const matchStatus = statusFilter === "all" || (statusFilter === "active" ? p.active : !p.active);
      const matchSearch = !s || p.name.toLowerCase().includes(s) || (p.team?.name ?? "").toLowerCase().includes(s) || (p.target_stage?.name ?? "").toLowerCase().includes(s);
      return matchStatus && matchSearch;
    });
  }, [policies, search, statusFilter]);

  if (!canViewPolicies) return <p className="text-sm text-muted-foreground">You do not have access to SLA policies.</p>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="SLA Policies" icon={ShieldCheck}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-8 w-72 text-xs" />
          <Select value={statusFilter} onValueChange={(v: "all" | "active" | "inactive") => setStatusFilter(v)}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminPageHeader>

      {canEditPolicies && (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Create SLA Policy</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Policy name" className="h-8 text-xs md:col-span-2" />
            <Select value={form.teamId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, teamId: v === "__none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">Select team</SelectItem>
                {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.targetStageId || "__none"} onValueChange={(v) => setForm((p) => ({ ...p, targetStageId: v === "__none" ? "" : v }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Target stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">Select stage</SelectItem>
                {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={form.targetHours} onChange={(e) => setForm((p) => ({ ...p, targetHours: e.target.value }))} placeholder="Target hours" className="h-8 text-xs" />
            <Input value={form.priorityFilter} onChange={(e) => setForm((p) => ({ ...p, priorityFilter: e.target.value }))} placeholder="Priority filter" className="h-8 text-xs" />
            <Button size="sm" className="h-8 text-xs" onClick={() => createPolicy.mutate()} disabled={createPolicy.isPending}>Create</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Policy Definitions <Badge variant="outline">{filteredPolicies.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-xs text-muted-foreground">Loading SLA policies…</p>}
          {isError && (
            <div className="space-y-2">
              <p className="text-xs text-destructive">Unable to load. {(error as Error)?.message}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>Retry</Button>
            </div>
          )}
          {!isLoading && !isError && filteredPolicies.length === 0 && <p className="text-xs text-muted-foreground">No SLA policies match your filters.</p>}
          {!isLoading && !isError && filteredPolicies.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Target Stage</TableHead>
                  <TableHead>Target Hours</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  {canEditPolicies && <TableHead className="w-48">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.team?.name ?? "—"}</TableCell>
                    <TableCell>{p.target_stage?.name ?? "—"}</TableCell>
                    <TableCell>{p.target_hours} hr</TableCell>
                    <TableCell>{p.priority_filter ?? "—"}</TableCell>
                    <TableCell>{p.active ? "Active" : "Inactive"}</TableCell>
                    {canEditPolicies && (
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(p)}>Edit</Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => togglePolicy.mutate({ id: p.id, active: p.active })}>
                          {p.active ? "Disable" : "Enable"}
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete policy "{p.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePolicy.mutate(p.id)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Edit dialog */}
      <Dialog open={!!editPolicy} onOpenChange={(open) => { if (!open) setEditPolicy(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit SLA Policy</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="h-8 text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={editForm.teamId || "__none"} onValueChange={(v) => setEditForm((p) => ({ ...p, teamId: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={editForm.targetStageId || "__none"} onValueChange={(v) => setEditForm((p) => ({ ...p, targetStageId: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select stage</SelectItem>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={editForm.targetHours} onChange={(e) => setEditForm((p) => ({ ...p, targetHours: e.target.value }))} placeholder="Target hours" className="h-8 text-xs" />
              <Input value={editForm.priorityFilter} onChange={(e) => setEditForm((p) => ({ ...p, priorityFilter: e.target.value }))} placeholder="Priority filter" className="h-8 text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditPolicy(null)}>Cancel</Button>
            <Button size="sm" onClick={saveEdit} disabled={updatePolicy.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelpdeskSlaPoliciesPage;
