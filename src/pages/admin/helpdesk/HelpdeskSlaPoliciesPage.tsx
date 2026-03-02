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
import { supabase } from "@/integrations/supabase/client";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useToast } from "@/hooks/use-toast";

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
  team?: { id: string; name: string } | null;
  target_stage?: { id: string; name: string } | null;
}

const HelpdeskSlaPoliciesPage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const canViewPolicies = canView("helpdesk-sla");
  const canEditPolicies = canEditFeature("helpdesk-sla");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState({ name: "", teamId: "", targetStageId: "", targetHours: "24", priorityFilter: "" });

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
        name: form.name.trim(),
        team_id: form.teamId,
        target_stage_id: form.targetStageId,
        target_hours: Number(form.targetHours),
        priority_filter: form.priorityFilter ? Number(form.priorityFilter) : null,
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setForm({ name: "", teamId: "", targetStageId: "", targetHours: "24", priorityFilter: "" });
      qc.invalidateQueries({ queryKey: ["helpdesk", "sla-policies"] });
      toast({ title: "SLA policy created" });
    },
    onError: (err) => {
      toast({ title: "Unable to create SLA policy", description: (err as Error).message, variant: "destructive" });
    },
  });

  const togglePolicy = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any).from("helpdesk_sla_policies").update({ active: !active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk", "sla-policies"] });
    },
  });

  const filteredPolicies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return policies.filter((policy) => {
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? policy.active : !policy.active);
      const matchesSearch =
        normalizedSearch.length === 0 ||
        policy.name.toLowerCase().includes(normalizedSearch) ||
        (policy.team?.name ?? "").toLowerCase().includes(normalizedSearch) ||
        (policy.target_stage?.name ?? "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [policies, search, statusFilter]);

  if (!canViewPolicies) {
    return <p className="text-sm text-muted-foreground">You do not have access to SLA policies.</p>;
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader title="SLA Policies" icon={ShieldCheck}>
        <div className="flex gap-2 flex-wrap items-center">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by policy, team, or target stage"
            className="h-8 w-72 text-xs"
          />
          <Select value={statusFilter} onValueChange={(value: "all" | "active" | "inactive") => setStatusFilter(value)}>
            <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminPageHeader>

      {canEditPolicies ? (
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm">Create SLA Policy</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end">
            <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Policy name" className="h-8 text-xs md:col-span-2" />
            <Select value={form.teamId || "__none"} onValueChange={(value) => setForm((prev) => ({ ...prev, teamId: value === "__none" ? "" : value }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Team" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">Select team</SelectItem>
                {teams.map((team) => <SelectItem key={team.id} value={team.id} className="text-xs">{team.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={form.targetStageId || "__none"} onValueChange={(value) => setForm((prev) => ({ ...prev, targetStageId: value === "__none" ? "" : value }))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Target stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">Select stage</SelectItem>
                {stages.map((stage) => <SelectItem key={stage.id} value={stage.id} className="text-xs">{stage.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={form.targetHours} onChange={(event) => setForm((prev) => ({ ...prev, targetHours: event.target.value }))} placeholder="Target hours" className="h-8 text-xs" />
            <Input value={form.priorityFilter} onChange={(event) => setForm((prev) => ({ ...prev, priorityFilter: event.target.value }))} placeholder="Priority filter (optional)" className="h-8 text-xs" />
            <Button size="sm" className="h-8 text-xs" onClick={() => createPolicy.mutate()} disabled={createPolicy.isPending}>Create</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Policy Definitions
            <Badge variant="outline">{filteredPolicies.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-xs text-muted-foreground">Loading SLA policies…</p> : null}
          {isError ? (
            <div className="space-y-2">
              <p className="text-xs text-destructive">Unable to load SLA policies. {(error as Error)?.message}</p>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : null}

          {!isLoading && !isError && filteredPolicies.length === 0 ? (
            <p className="text-xs text-muted-foreground">No SLA policies match your current filters.</p>
          ) : null}

          {!isLoading && !isError && filteredPolicies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Target Stage</TableHead>
                  <TableHead>Target Hours</TableHead>
                  <TableHead>Priority Filter</TableHead>
                  <TableHead>Status</TableHead>
                  {canEditPolicies ? <TableHead className="w-28">Action</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>{policy.name}</TableCell>
                    <TableCell>{policy.team?.name ?? "—"}</TableCell>
                    <TableCell>{policy.target_stage?.name ?? "—"}</TableCell>
                    <TableCell>{policy.target_hours} hr</TableCell>
                    <TableCell>{policy.priority_filter ?? "—"}</TableCell>
                    <TableCell>{policy.active ? "Active" : "Inactive"}</TableCell>
                    {canEditPolicies ? (
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => togglePolicy.mutate({ id: policy.id, active: policy.active })}
                        >
                          {policy.active ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default HelpdeskSlaPoliciesPage;
