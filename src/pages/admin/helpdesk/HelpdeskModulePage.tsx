import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Ticket, UsersRound, Wrench } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { useRolePermissions, type Feature } from "@/hooks/useRolePermissions";
import { useToast } from "@/hooks/use-toast";

type ModuleKind = "tickets" | "teams" | "sla";

interface HelpdeskRecord {
  id: string;
  name: string;
  status: "active" | "pending";
}

const HELP_DESK_DATA: Record<ModuleKind, HelpdeskRecord[]> = {
  tickets: [
    { id: "TCK-1001", name: "Store checkout issue", status: "active" },
    { id: "TCK-1002", name: "Lens coating escalation", status: "pending" },
  ],
  teams: [
    { id: "TEAM-01", name: "Tier 1 Support", status: "active" },
    { id: "TEAM-02", name: "Escalations", status: "active" },
  ],
  sla: [
    { id: "SLA-PRIORITY", name: "Priority Response", status: "active" },
    { id: "SLA-STANDARD", name: "Standard Coverage", status: "pending" },
  ],
};

const MODULE_CONFIG: Record<
  ModuleKind,
  {
    title: string;
    createLabel: string;
    feature: Feature;
    icon: typeof Ticket;
  }
> = {
  tickets: {
    title: "Helpdesk Tickets",
    createLabel: "Create Ticket",
    feature: "helpdesk",
    icon: Ticket,
  },
  teams: {
    title: "Helpdesk Teams",
    createLabel: "Create Team",
    feature: "helpdesk-teams",
    icon: UsersRound,
  },
  sla: {
    title: "SLA Policies",
    createLabel: "Create SLA Policy",
    feature: "helpdesk-sla",
    icon: ShieldCheck,
  },
};

interface Props {
  module: ModuleKind;
}

const HelpdeskModulePage = ({ module }: Props) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { canView, canEditFeature } = useRolePermissions();
  const config = MODULE_CONFIG[module];
  const canViewModule = canView(config.feature);
  const canEditModule = canEditFeature(config.feature);
  const queryKey = ["helpdesk-module", config.feature] as const;

  const { data: records = [], isLoading } = useQuery({
    queryKey,
    enabled: canViewModule,
    queryFn: async () => HELP_DESK_DATA[module],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!canEditModule) throw new Error("You do not have permission to create records for this module.");
      const now = new Date().toISOString().slice(11, 19).replaceAll(":", "");
      return { id: `${module.toUpperCase()}-${now}`, name: "New Draft", status: "pending" as const };
    },
    onSuccess: (record) => {
      qc.setQueryData<HelpdeskRecord[]>(queryKey, (prev = []) => [record, ...prev]);
      toast({ title: `${config.title}: draft created` });
    },
    onError: (error: Error) => {
      toast({ title: "Action blocked", description: error.message, variant: "destructive" });
    },
  });

  const icon = useMemo(() => config.icon ?? Wrench, [config.icon]);

  if (!canViewModule) {
    return (
      <div className="p-4 space-y-2">
        <AdminPageHeader icon={icon} title={config.title} />
        <p className="text-sm text-muted-foreground">You do not have access to this module.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <AdminPageHeader icon={icon} title={config.title} />
        {canEditModule ? (
          <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {config.createLabel}
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="p-3 text-muted-foreground" colSpan={3}>Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td className="p-3 text-muted-foreground" colSpan={3}>No records found.</td></tr>
            ) : (
              records.map((record) => (
                <tr key={record.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{record.id}</td>
                  <td className="p-2">{record.name}</td>
                  <td className="p-2 capitalize">{record.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HelpdeskModulePage;
