import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useDeleteHelpdeskSlaPolicy, useUpdateHelpdeskSlaPolicy } from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";
import RichTextEditor from "@/components/admin/RichTextEditor";

interface TeamOption {
  id: string;
  name: string;
}

interface StageOption {
  id: string;
  name: string;
}

interface HelpdeskSlaPolicy {
  id: string;
  name: string;
  priority_filter: number | null;
  target_hours: number;
  active: boolean;
  team_id: string;
  target_stage_id: string;
  description: string | null;
  team?: { id: string; name: string } | null;
  target_stage?: { id: string; name: string } | null;
}

const emptyForm = {
  name: "",
  teamId: "",
  targetStageId: "",
  targetHours: "24",
  priorityFilter: "",
  description: "",
};

const descriptionCellClassName =
  "max-h-24 min-w-[14rem] overflow-y-auto rounded border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-overlay-surface-muted))] px-2 py-1.5 text-xs leading-relaxed text-[hsl(var(--admin-content-fg))]";

const HelpdeskSlaPoliciesPage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canViewPolicies = canView("helpdesk-sla");
  const canEditPolicies = canEditFeature("helpdesk-sla");

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editPolicy, setEditPolicy] = useState<HelpdeskSlaPolicy | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    teamId: "",
    targetStageId: "",
    targetHours: "",
    priorityFilter: "",
    description: "",
  });

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
        .select("id,name,priority_filter,target_hours,active,team_id,target_stage_id,description,team:helpdesk_teams(id,name),target_stage:helpdesk_ticket_stages(id,name)")
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
        name: form.name.trim(),
        team_id: form.teamId,
        target_stage_id: form.targetStageId,
        target_hours: Number(form.targetHours),
        priority_filter: form.priorityFilter ? Number(form.priorityFilter) : null,
        description: form.description.trim() || "",
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm(emptyForm);
      setCreateDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["helpdesk", "sla-policies"] });
      toast({ title: "SLA policy created" });
    },
    onError: (err) =>
      toast({ title: "Unable to create SLA policy", description: (err as Error).message, variant: "destructive" }),
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

  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      if (statusFilter === "all") return true;
      return statusFilter === "active" ? policy.active : !policy.active;
    });
  }, [policies, statusFilter]);

  const activeStages = useMemo(() => {
    const stageIdsInPolicies = new Set(
      policies.map((policy) => policy.target_stage?.id ?? policy.target_stage_id).filter((value): value is string => Boolean(value)),
    );
    return stages.filter((stage) => stageIdsInPolicies.has(stage.id));
  }, [policies, stages]);

  const editStageOptions = useMemo(() => {
    if (!editForm.targetStageId) return stages;
    const selectedStage = stages.find((stage) => stage.id === editForm.targetStageId);
    if (selectedStage) return stages;
    const fallbackStage = activeStages.find((stage) => stage.id === editForm.targetStageId);
    return fallbackStage ? [fallbackStage, ...stages] : stages;
  }, [activeStages, editForm.targetStageId, stages]);

  const openEdit = (policy: HelpdeskSlaPolicy) => {
    setEditPolicy(policy);
    setEditForm({
      name: policy.name,
      teamId: policy.team_id,
      targetStageId: policy.target_stage_id,
      targetHours: String(policy.target_hours),
      priorityFilter: policy.priority_filter != null ? String(policy.priority_filter) : "",
      description: policy.description ?? "",
    });
  };

  const saveEdit = () => {
    if (!editPolicy) return;
    updatePolicy.mutate({
      id: editPolicy.id,
      name: editForm.name.trim(),
      team_id: editForm.teamId,
      target_stage_id: editForm.targetStageId,
      target_hours: Number(editForm.targetHours),
      priority_filter: editForm.priorityFilter ? Number(editForm.priorityFilter) : null,
      description: editForm.description.trim() || "",
    } as any);
    setEditPolicy(null);
  };

  if (!canViewPolicies) return <p className="text-sm text-muted-foreground">You do not have access to SLA policies.</p>;

  return (
    <div className="space-y-4">
      <AdminPageHeader title="SLA Policies" icon={ShieldCheck}>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
          {canEditPolicies && (
            <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create New
            </Button>
          )}
        </div>
      </AdminPageHeader>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center justify-between text-sm">
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
          {!isLoading && !isError && filteredPolicies.length === 0 && (
            <p className="text-xs text-muted-foreground">No SLA policies match your filters.</p>
          )}
          {!isLoading && !isError && filteredPolicies.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Target Stage</TableHead>
                  <TableHead>Target Hours</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  {canEditPolicies && <TableHead className="w-48">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>{policy.name}</TableCell>
                    <TableCell className="align-top">
                      {policy.description ? (
                        <div className={descriptionCellClassName} dangerouslySetInnerHTML={{ __html: policy.description }} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{policy.team?.name ?? "—"}</TableCell>
                    <TableCell>{policy.target_stage?.name ?? "—"}</TableCell>
                    <TableCell>{policy.target_hours} hr</TableCell>
                    <TableCell>{policy.priority_filter ?? "—"}</TableCell>
                    <TableCell>{policy.active ? "Active" : "Inactive"}</TableCell>
                    {canEditPolicies && (
                      <TableCell className="flex gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(policy)}>Edit</Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => togglePolicy.mutate({ id: policy.id, active: policy.active })}
                        >
                          {policy.active ? "Disable" : "Enable"}
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="admin-overlay-surface">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete policy "{policy.name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deletePolicy.mutate(policy.id)}>Delete</AlertDialogAction>
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

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="admin-overlay-surface sm:max-w-2xl">
          <DialogHeader className="space-y-2"><DialogTitle>Create SLA Policy</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Policy name</label>
              <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Policy name" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Team</label>
              <Select value={form.teamId || "__none"} onValueChange={(value) => setForm((prev) => ({ ...prev, teamId: value === "__none" ? "" : value }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select team</SelectItem>
                  {teams.map((team) => <SelectItem key={team.id} value={team.id} className="text-xs">{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target stage</label>
              <Select value={form.targetStageId || "__none"} onValueChange={(value) => setForm((prev) => ({ ...prev, targetStageId: value === "__none" ? "" : value }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Target stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select stage</SelectItem>
                  {stages.map((stage) => <SelectItem key={stage.id} value={stage.id} className="text-xs">{stage.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target hours</label>
              <Input value={form.targetHours} onChange={(e) => setForm((prev) => ({ ...prev, targetHours: e.target.value }))} placeholder="Target hours" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority filter</label>
              <Input value={form.priorityFilter} onChange={(e) => setForm((prev) => ({ ...prev, priorityFilter: e.target.value }))} placeholder="Priority filter" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <RichTextEditor
                content={form.description}
                onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                placeholder="SLA policy details…"
                className="min-h-[120px]"
                minHeight="260px"
                height="420px"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createPolicy.mutate()} disabled={createPolicy.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPolicy} onOpenChange={(open) => { if (!open) setEditPolicy(null); }}>
        <DialogContent className="admin-overlay-surface sm:max-w-2xl">
          <DialogHeader className="space-y-2"><DialogTitle>Edit SLA Policy</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Policy name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Name" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Team</label>
              <Select value={editForm.teamId || "__none"} onValueChange={(value) => setEditForm((prev) => ({ ...prev, teamId: value === "__none" ? "" : value }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select team</SelectItem>
                  {teams.map((team) => <SelectItem key={team.id} value={team.id} className="text-xs">{team.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target stage</label>
              <Select value={editForm.targetStageId || "__none"} onValueChange={(value) => setEditForm((prev) => ({ ...prev, targetStageId: value === "__none" ? "" : value }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select stage</SelectItem>
                  {editStageOptions.map((stage) => <SelectItem key={stage.id} value={stage.id} className="text-xs">{stage.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target hours</label>
              <Input value={editForm.targetHours} onChange={(e) => setEditForm((prev) => ({ ...prev, targetHours: e.target.value }))} placeholder="Target hours" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority filter</label>
              <Input value={editForm.priorityFilter} onChange={(e) => setEditForm((prev) => ({ ...prev, priorityFilter: e.target.value }))} placeholder="Priority filter" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <RichTextEditor
                content={editForm.description}
                onChange={(value) => setEditForm((prev) => ({ ...prev, description: value }))}
                placeholder="SLA policy details…"
                className="min-h-[120px]"
                minHeight="260px"
                height="420px"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditPolicy(null)}>Cancel</Button>
            <Button size="sm" onClick={saveEdit} disabled={updatePolicy.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelpdeskSlaPoliciesPage;
