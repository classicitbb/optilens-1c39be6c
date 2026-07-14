import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Plus, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateHelpdeskTicketType, useUpdateHelpdeskTicketType, useDeleteHelpdeskTicketType,
  useCreateHelpdeskTicketTag, useDeleteHelpdeskTicketTag,
  useCreateHelpdeskPriority, useUpdateHelpdeskPriority, useDeleteHelpdeskPriority,
  useDeleteHelpdeskSlaPolicy, useUpdateHelpdeskSlaPolicy,
} from "@/features/admin/helpdesk/hooks/useHelpdeskMutations";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { sanitizeRichTextHtml } from "@/lib/sanitizeRichTextHtml";
import HelpdeskStagesPage from "./HelpdeskStagesPage";
import HelpdeskTeamsPage from "./HelpdeskTeamsPage";

interface TicketType { id: string; name: string; is_active: boolean; created_at: string; }
interface TicketTag { id: string; name: string; color: string; created_at: string; }
interface PriorityRow { id: string; level: number; label: string; color: string; is_active: boolean; }
interface TeamOption { id: string; name: string; }
interface StageOption { id: string; name: string; }
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

const emptySlaForm = {
  name: "",
  teamId: "",
  targetStageId: "",
  targetHours: "24",
  priorityFilter: "",
  description: "",
};

const descriptionCellClassName =
  "max-h-24 min-w-[14rem] overflow-y-auto rounded border border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-overlay-surface-muted))] px-2 py-1.5 text-xs leading-relaxed text-[hsl(var(--admin-content-fg))]";

const HelpdeskConfigPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canViewConfig = canView("helpdesk");
  const canEditConfig = canEditFeature("helpdesk");
  const canViewTeams = canView("helpdesk-teams");
  const canViewSla = canView("helpdesk-sla");
  const canEditSla = canEditFeature("helpdesk-sla");

  // ── Config state ──
  const [typeName, setTypeName] = useState("");
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState("#3b82f6");
  const [prioLabel, setPrioLabel] = useState("");
  const [prioLevel, setPrioLevel] = useState("");
  const [prioColor, setPrioColor] = useState("#6b7280");

  // ── SLA state ──
  const [slaStatusFilter, setSlaStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [createSlaOpen, setCreateSlaOpen] = useState(false);
  const [slaForm, setSlaForm] = useState(emptySlaForm);
  const [editPolicy, setEditPolicy] = useState<HelpdeskSlaPolicy | null>(null);
  const [editForm, setEditForm] = useState({ ...emptySlaForm });

  // ── Config queries ──
  const { data: types = [], isLoading: typesLoading } = useQuery({
    queryKey: ["helpdesk", "ticket-types"],
    enabled: canViewConfig,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_types").select("id,name,is_active,created_at").order("name");
      if (error) throw error;
      return (data ?? []) as TicketType[];
    },
  });

  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ["helpdesk", "ticket-tags"],
    enabled: canViewConfig,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_tags").select("id,name,color,created_at").order("name");
      if (error) throw error;
      return (data ?? []) as TicketTag[];
    },
  });

  const { data: priorities = [], isLoading: priosLoading } = useQuery({
    queryKey: ["helpdesk", "priorities"],
    enabled: canViewConfig,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_priorities").select("id,level,label,color,is_active").order("level");
      if (error) throw error;
      return (data ?? []) as PriorityRow[];
    },
  });

  // ── SLA queries ──
  const { data: teams = [] } = useQuery({
    queryKey: ["helpdesk", "teams", "options"],
    enabled: canViewSla,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_teams").select("id,name").eq("is_active", true).order("name");
      if (error) throw error;
      return (data ?? []) as TeamOption[];
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ["helpdesk", "stages", "options"],
    enabled: canViewSla,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("helpdesk_ticket_stages").select("id,name").order("sequence");
      if (error) throw error;
      return (data ?? []) as StageOption[];
    },
  });

  const { data: policies = [], isLoading: policiesLoading, isError: policiesError, error: policiesErrorMsg, refetch: refetchPolicies } = useQuery({
    queryKey: ["helpdesk", "sla-policies"],
    enabled: canViewSla,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("helpdesk_sla_policies")
        .select("id,name,priority_filter,target_hours,active,team_id,target_stage_id,description,team:helpdesk_teams(id,name),target_stage:helpdesk_ticket_stages(id,name)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as HelpdeskSlaPolicy[];
    },
  });

  // ── Config mutations ──
  const createType = useCreateHelpdeskTicketType();
  const updateType = useUpdateHelpdeskTicketType();
  const deleteType = useDeleteHelpdeskTicketType();
  const createTag = useCreateHelpdeskTicketTag();
  const deleteTag = useDeleteHelpdeskTicketTag();
  const createPrio = useCreateHelpdeskPriority();
  const updatePrio = useUpdateHelpdeskPriority();
  const deletePrio = useDeleteHelpdeskPriority();

  // ── SLA mutations ──
  const createPolicy = useMutation({
    mutationFn: async () => {
      if (!slaForm.name.trim()) throw new Error("Policy name is required.");
      if (!slaForm.teamId) throw new Error("Team is required.");
      if (!slaForm.targetStageId) throw new Error("Target stage is required.");
      const { error } = await (supabase as any).from("helpdesk_sla_policies").insert({
        name: slaForm.name.trim(),
        team_id: slaForm.teamId,
        target_stage_id: slaForm.targetStageId,
        target_hours: Number(slaForm.targetHours),
        priority_filter: slaForm.priorityFilter ? Number(slaForm.priorityFilter) : null,
        description: slaForm.description.trim() || "",
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSlaForm(emptySlaForm);
      setCreateSlaOpen(false);
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

  // ── SLA derived state ──
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      if (slaStatusFilter === "all") return true;
      return slaStatusFilter === "active" ? p.active : !p.active;
    });
  }, [policies, slaStatusFilter]);

  const activeStages = useMemo(() => {
    const stageIds = new Set(policies.map((p) => p.target_stage?.id ?? p.target_stage_id).filter(Boolean) as string[]);
    return stages.filter((s) => stageIds.has(s.id));
  }, [policies, stages]);

  const editStageOptions = useMemo(() => {
    if (!editForm.targetStageId) return stages;
    if (stages.find((s) => s.id === editForm.targetStageId)) return stages;
    const fallback = activeStages.find((s) => s.id === editForm.targetStageId);
    return fallback ? [fallback, ...stages] : stages;
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

  const section = searchParams.get("section") === "teams"
    ? "teams"
    : searchParams.get("section") === "stages"
      ? "stages"
      : "general";
  const selectSection = (next: "general" | "teams" | "stages") => {
    const params = new URLSearchParams(searchParams);
    if (next === "general") params.delete("section");
    else params.set("section", next);
    setSearchParams(params, { replace: true });
  };

  if (!canViewConfig && (section !== "teams" || !canViewTeams)) {
    return <p className="text-sm text-muted-foreground">You do not have access to Helpdesk config.</p>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Helpdesk Configuration" icon={Settings2}>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={section === "general" ? "default" : "outline"} className="h-8 gap-1.5 text-xs" onClick={() => selectSection("general")}>
            <Settings2 className="h-3.5 w-3.5" /> General & SLA
          </Button>
          {canViewTeams && (
            <Button size="sm" variant={section === "teams" ? "default" : "outline"} className="h-8 gap-1.5 text-xs" onClick={() => selectSection("teams")}>
              <UsersRound className="h-3.5 w-3.5" /> Teams
            </Button>
          )}
          <Button size="sm" variant={section === "stages" ? "default" : "outline"} className="h-8 gap-1.5 text-xs" onClick={() => selectSection("stages")}>
            <Layers className="h-3.5 w-3.5" /> Stages
          </Button>
        </div>
      </AdminPageHeader>

      {section === "teams" && <HelpdeskTeamsPage embedded />}
      {section === "stages" && <HelpdeskStagesPage embedded />}
      {section === "general" && <>
      <div className="grid gap-6 xl:grid-cols-2">

      {/* ── Priorities ── */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Priorities <Badge variant="outline">{priorities.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          {canEditConfig && (
            <div className="flex flex-wrap items-end gap-2">
              <Input value={prioLevel} onChange={(e) => setPrioLevel(e.target.value)} placeholder="Level (0-5)" type="number" className="h-8 text-xs w-24" />
              <Input value={prioLabel} onChange={(e) => setPrioLabel(e.target.value)} placeholder="Label" className="h-8 text-xs w-40" />
              <input type="color" value={prioColor} onChange={(e) => setPrioColor(e.target.value)} className="h-8 w-10 rounded border border-border cursor-pointer" />
              <Button size="sm" className="h-8 text-xs" disabled={createPrio.isPending || !prioLabel.trim() || prioLevel === ""} onClick={() => { createPrio.mutate({ level: Number(prioLevel), label: prioLabel.trim(), color: prioColor }); setPrioLabel(""); setPrioLevel(""); }}>Add Priority</Button>
            </div>
          )}
          {priosLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!priosLoading && priorities.length === 0 && <p className="text-xs text-muted-foreground">No priorities configured.</p>}
          {!priosLoading && priorities.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Level</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Active</TableHead>
                  {isAdmin && <TableHead className="w-24">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {priorities.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.level}</TableCell>
                    <TableCell>{p.label}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                        <span className="text-xs text-muted-foreground">{p.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canEditConfig ? (
                        <Switch checked={p.is_active} onCheckedChange={(v) => updatePrio.mutate({ id: p.id, is_active: v })} />
                      ) : (p.is_active ? "Yes" : "No")}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete priority "{p.label}"?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deletePrio.mutate(p.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Ticket Types ── */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Ticket Types <Badge variant="outline">{types.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          {canEditConfig && (
            <div className="flex flex-wrap items-end gap-2">
              <Input value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="Type name" className="h-8 text-xs w-64" />
              <Button size="sm" className="h-8 text-xs" disabled={createType.isPending || !typeName.trim()} onClick={() => { createType.mutate({ name: typeName.trim() }); setTypeName(""); }}>Add Type</Button>
            </div>
          )}
          {typesLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!typesLoading && types.length === 0 && <p className="text-xs text-muted-foreground">No ticket types configured.</p>}
          {!typesLoading && types.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Active</TableHead>
                  {isAdmin && <TableHead className="w-24">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.name}</TableCell>
                    <TableCell>
                      {canEditConfig ? (
                        <Switch checked={t.is_active} onCheckedChange={(v) => updateType.mutate({ id: t.id, is_active: v })} />
                      ) : (t.is_active ? "Yes" : "No")}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete type "{t.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteType.mutate(t.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Ticket Tags ── */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Ticket Tags <Badge variant="outline">{tags.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          {canEditConfig && (
            <div className="flex flex-wrap items-end gap-2">
              <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="Tag name" className="h-8 text-xs w-52" />
              <input type="color" value={tagColor} onChange={(e) => setTagColor(e.target.value)} className="h-8 w-10 rounded border border-border cursor-pointer" />
              <Button size="sm" className="h-8 text-xs" disabled={createTag.isPending || !tagName.trim()} onClick={() => { createTag.mutate({ name: tagName.trim(), color: tagColor }); setTagName(""); }}>Add Tag</Button>
            </div>
          )}
          {tagsLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {!tagsLoading && tags.length === 0 && <p className="text-xs text-muted-foreground">No ticket tags configured.</p>}
          {!tagsLoading && tags.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Color</TableHead>
                  {isAdmin && <TableHead className="w-24">Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>{tag.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full inline-block" style={{ backgroundColor: tag.color }} />
                        <span className="text-xs text-muted-foreground">{tag.color}</span>
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive" className="h-7 text-xs">Delete</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete tag "{tag.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTag.mutate(tag.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── SLA Policies ── */}
      {canViewSla && (
        <Card className="xl:col-span-2">
          <CardHeader className="py-3">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />SLA Policies</span>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{filteredPolicies.length}</Badge>
                <Select value={slaStatusFilter} onValueChange={(v: "all" | "active" | "inactive") => setSlaStatusFilter(v)}>
                  <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All statuses</SelectItem>
                    <SelectItem value="active" className="text-xs">Active</SelectItem>
                    <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                {canEditSla && (
                  <Button size="sm" className="h-7 gap-1 text-xs" onClick={() => setCreateSlaOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />New
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {policiesLoading && <p className="text-xs text-muted-foreground">Loading SLA policies…</p>}
            {policiesError && (
              <div className="space-y-2">
                <p className="text-xs text-destructive">Unable to load. {(policiesErrorMsg as Error)?.message}</p>
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetchPolicies()}>Retry</Button>
              </div>
            )}
            {!policiesLoading && !policiesError && filteredPolicies.length === 0 && (
              <p className="text-xs text-muted-foreground">No SLA policies match your filters.</p>
            )}
            {!policiesLoading && !policiesError && filteredPolicies.length > 0 && (
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
                    {canEditSla && <TableHead className="w-48">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPolicies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell>{policy.name}</TableCell>
                      <TableCell className="align-top">
                        {policy.description ? (
                          // eslint-disable-next-line no-restricted-syntax -- content is sanitized through the shared rich-text sanitizer before rendering.
                          <div className={descriptionCellClassName} dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(policy.description) }} />
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>{policy.team?.name ?? "—"}</TableCell>
                      <TableCell>{policy.target_stage?.name ?? "—"}</TableCell>
                      <TableCell>{policy.target_hours} hr</TableCell>
                      <TableCell>{policy.priority_filter ?? "—"}</TableCell>
                      <TableCell>{policy.active ? "Active" : "Inactive"}</TableCell>
                      {canEditSla && (
                        <TableCell className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(policy)}>Edit</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => togglePolicy.mutate({ id: policy.id, active: policy.active })}>
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
      )}
      </div>

      {/* ── SLA Create Dialog ── */}
      <Dialog open={createSlaOpen} onOpenChange={setCreateSlaOpen}>
        <DialogContent className="admin-overlay-surface sm:max-w-2xl">
          <DialogHeader className="space-y-2"><DialogTitle>Create SLA Policy</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Policy name</label>
              <Input value={slaForm.name} onChange={(e) => setSlaForm((p) => ({ ...p, name: e.target.value }))} placeholder="Policy name" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Team</label>
              <Select value={slaForm.teamId || "__none"} onValueChange={(v) => setSlaForm((p) => ({ ...p, teamId: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target stage</label>
              <Select value={slaForm.targetStageId || "__none"} onValueChange={(v) => setSlaForm((p) => ({ ...p, targetStageId: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Target stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select stage</SelectItem>
                  {stages.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target hours</label>
              <Input value={slaForm.targetHours} onChange={(e) => setSlaForm((p) => ({ ...p, targetHours: e.target.value }))} placeholder="Target hours" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority filter</label>
              <Input value={slaForm.priorityFilter} onChange={(e) => setSlaForm((p) => ({ ...p, priorityFilter: e.target.value }))} placeholder="Priority filter" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <RichTextEditor
                content={slaForm.description}
                onChange={(v) => setSlaForm((p) => ({ ...p, description: v }))}
                placeholder="SLA policy details…"
                className="min-h-[120px]"
                minHeight="260px"
                height="420px"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setCreateSlaOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createPolicy.mutate()} disabled={createPolicy.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SLA Edit Dialog ── */}
      <Dialog open={!!editPolicy} onOpenChange={(open) => { if (!open) setEditPolicy(null); }}>
        <DialogContent className="admin-overlay-surface sm:max-w-2xl">
          <DialogHeader className="space-y-2"><DialogTitle>Edit SLA Policy</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Policy name</label>
              <Input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Team</label>
              <Select value={editForm.teamId || "__none"} onValueChange={(v) => setEditForm((p) => ({ ...p, teamId: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Team" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select team</SelectItem>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target stage</label>
              <Select value={editForm.targetStageId || "__none"} onValueChange={(v) => setEditForm((p) => ({ ...p, targetStageId: v === "__none" ? "" : v }))}>
                <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Stage" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none" className="text-xs">Select stage</SelectItem>
                  {editStageOptions.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target hours</label>
              <Input value={editForm.targetHours} onChange={(e) => setEditForm((p) => ({ ...p, targetHours: e.target.value }))} placeholder="Target hours" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Priority filter</label>
              <Input value={editForm.priorityFilter} onChange={(e) => setEditForm((p) => ({ ...p, priorityFilter: e.target.value }))} placeholder="Priority filter" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <RichTextEditor
                content={editForm.description}
                onChange={(v) => setEditForm((p) => ({ ...p, description: v }))}
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
      </>}
    </div>
  );
};

export default HelpdeskConfigPage;
