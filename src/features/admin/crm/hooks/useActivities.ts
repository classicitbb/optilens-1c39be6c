import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityTaskChannel } from "../activityChannels";

export const ACTIVITY_TYPES = ["note", "call", "email", "whatsapp", "meeting", "quote"] as const;
export type ActivityChannelType = (typeof ACTIVITY_TYPES)[number];
export const ACTIVITY_PRIORITIES = ["urgent", "high", "normal", "low"] as const;
export type ActivityPriority = (typeof ACTIVITY_PRIORITIES)[number];
export const ACTIVITY_STATES = ["inbox", "planned", "in_progress", "waiting", "completed", "cancelled"] as const;
export type ActivityState = (typeof ACTIVITY_STATES)[number];
export type ActivityParticipantRole = "helper" | "follower";
export type AutomationRecipe = "draft_customer_email" | "add_participant" | "create_follow_up" | "prepare_activity";
export type AutomationRunStatus = "approval_needed" | "running" | "completed" | "needs_attention";

export interface StaffMember { user_id: string; name: string }
export interface CrmContactOption { id: string; name: string | null; business_name: string | null }
export interface ActivityParticipant { user_id: string; role: ActivityParticipantRole; name?: string }
export interface ActivityAutomation {
  id: string;
  recipe: AutomationRecipe;
  trigger_state: ActivityState;
  config: Record<string, unknown>;
  enabled: boolean;
}
export interface ActivityAutomationRun {
  id: string;
  automation_id: string;
  status: AutomationRunStatus;
  proposed_action: { recipe: AutomationRecipe; config?: Record<string, unknown> };
  error: string | null;
  created_at: string;
  executed_at: string | null;
}

export interface CrmActivity {
  id: string;
  activity_type: string;
  type: ActivityChannelType;
  task_channel: ActivityTaskChannel;
  content: string | null;
  status: ActivityState;
  priority: ActivityPriority;
  due_at: string | null;
  opportunity_id: string | null;
  contact_id: string | null;
  owner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  contact?: { id: string; name: string | null; business_name: string | null } | null;
  opportunity?: { id: string; title: string | null } | null;
  participants: ActivityParticipant[];
  automations: ActivityAutomation[];
  automation_runs: ActivityAutomationRun[];
}

export interface ActivityMutationInput {
  activityType: string;
  dueAt?: string;
  opportunityId?: string;
  contactId?: string;
  ownerId?: string;
  priority?: ActivityPriority;
  status?: ActivityState;
  type?: ActivityChannelType;
  taskChannel?: ActivityTaskChannel;
  content?: string;
  createdBy?: string;
  helperIds?: string[];
}

const invalidateActivityQueries = (qc: ReturnType<typeof useQueryClient>) => Promise.all([
  qc.invalidateQueries({ queryKey: ["crm-activities"] }),
  qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  qc.invalidateQueries({ queryKey: ["operator-attention-crm-tasks"] }),
]);

export const useActivities = () => useQuery({
  queryKey: ["crm-activities"],
  queryFn: async () => {
    const { data: rows, error } = await (supabase.from("activities") as any)
      .select("id,activity_type,type,task_channel,content,status,priority,due_at,opportunity_id,contact_id,owner_id,created_by,created_at,updated_at,contact:contacts!activities_contact_id_fkey(id,name,business_name),opportunity:opportunities!activities_opportunity_id_fkey(id,title)")
      .order("created_at", { ascending: false }).limit(500);
    if (error) throw error;
    const ids = (rows ?? []).map((row: { id: string }) => row.id);
    if (ids.length === 0) return [] as CrmActivity[];
    const [participantsResult, automationsResult, runsResult, staffResult] = await Promise.all([
      (supabase.from("activity_participants") as any).select("activity_id,user_id,role").in("activity_id", ids),
      (supabase.from("activity_automations") as any).select("id,activity_id,recipe,trigger_state,config,enabled").in("activity_id", ids),
      (supabase.from("activity_automation_runs") as any).select("id,activity_id,automation_id,status,proposed_action,error,created_at,executed_at").in("activity_id", ids).order("created_at", { ascending: false }),
      (supabase.rpc as any)("list_staff_names"),
    ]);
    for (const result of [participantsResult, automationsResult, runsResult, staffResult]) if (result.error) throw result.error;
    const names = new Map<string, string>((staffResult.data ?? []).map((staff: StaffMember) => [staff.user_id, staff.name]));
    return (rows ?? []).map((row: any) => ({
      ...row,
      status: row.status === "open" ? "inbox" : row.status,
      priority: row.priority ?? "normal",
      participants: (participantsResult.data ?? []).filter((item: any) => item.activity_id === row.id)
        .map((item: any) => ({ user_id: item.user_id, role: item.role, name: names.get(item.user_id) })),
      automations: (automationsResult.data ?? []).filter((item: any) => item.activity_id === row.id),
      automation_runs: (runsResult.data ?? []).filter((item: any) => item.activity_id === row.id),
    })) as CrmActivity[];
  },
});

export const useStaffDirectory = () => useQuery({
  queryKey: ["staff-directory"],
  queryFn: async () => {
    const { data, error } = await (supabase.rpc as any)("list_staff_names");
    if (error) throw error;
    return (data ?? []) as StaffMember[];
  }, staleTime: 5 * 60 * 1000,
});

export const useCrmContactOptions = () => useQuery({
  queryKey: ["crm-contact-options"],
  queryFn: async () => {
    const { data, error } = await (supabase.from("contacts") as any)
      .select("id,name,business_name").order("business_name", { ascending: true, nullsFirst: false }).limit(500);
    if (error) throw error;
    return (data ?? []) as CrmContactOption[];
  }, staleTime: 5 * 60 * 1000,
});

export const useStaffNames = () => {
  const query = useStaffDirectory();
  return { ...query, data: Object.fromEntries((query.data ?? []).map((staff) => [staff.user_id, staff.name])) };
};

const syncHelpers = async (activityId: string, helperIds: string[]) => {
  const { error: deleteError } = await (supabase.from("activity_participants") as any)
    .delete().eq("activity_id", activityId).eq("role", "helper");
  if (deleteError) throw deleteError;
  if (helperIds.length > 0) {
    const { error } = await (supabase.from("activity_participants") as any).insert(
      helperIds.map((userId) => ({ activity_id: activityId, user_id: userId, role: "helper" })),
    );
    if (error) throw error;
  }
};

export const useCreateActivity = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (input: ActivityMutationInput) => {
    const { data, error } = await (supabase.from("activities") as any).insert({
      activity_type: input.activityType, due_at: input.dueAt || null,
      opportunity_id: input.opportunityId || null, contact_id: input.contactId || null,
      owner_id: input.ownerId || input.createdBy || null, priority: input.priority || "normal",
      status: input.status || "inbox", type: input.type || "note",
      task_channel: input.taskChannel || "todo", content: input.content || null,
      created_by: input.createdBy || null,
    }).select("id").single();
    if (error) throw error;
    await syncHelpers(data.id, input.helperIds ?? []);
    return data.id as string;
  }, onSuccess: () => invalidateActivityQueries(qc) });
};

export const useUpdateActivity = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, helperIds, ...input }: ActivityMutationInput & { id: string }) => {
    const { error } = await (supabase.from("activities") as any).update({
      activity_type: input.activityType, due_at: input.dueAt || null,
      opportunity_id: input.opportunityId || null, contact_id: input.contactId || null,
      owner_id: input.ownerId || null, priority: input.priority || "normal",
      type: input.type || "note", task_channel: input.taskChannel || "todo",
      content: input.content || null, status: input.status || "inbox", updated_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) throw error;
    if (helperIds) await syncHelpers(id, helperIds);
  }, onSuccess: () => invalidateActivityQueries(qc) });
};

export const useTransitionActivity = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, state, dueAt, updateDue = false }: { id: string; state: ActivityState; dueAt?: string | null; updateDue?: boolean }) => {
    const { data, error } = await (supabase.rpc as any)("transition_crm_activity", {
      p_activity_id: id, p_state: state, p_due_at: dueAt ?? null, p_update_due: updateDue,
    });
    if (error) throw error;
    return (data ?? []) as ActivityAutomationRun[];
  }, onSuccess: () => invalidateActivityQueries(qc) });
};

export const useCompleteActivity = () => {
  const transition = useTransitionActivity();
  return { ...transition, mutateAsync: (id: string) => transition.mutateAsync({ id, state: "completed" }) };
};

export const useMoveActivityChannel = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ id, taskChannel }: { id: string; taskChannel: ActivityTaskChannel }) => {
    const { error } = await (supabase.from("activities") as any).update({ task_channel: taskChannel }).eq("id", id);
    if (error) throw error;
  }, onSuccess: () => invalidateActivityQueries(qc) });
};

export const useAddAutomation = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async ({ activityId, recipe, config = {} }: { activityId: string; recipe: AutomationRecipe; config?: Record<string, unknown> }) => {
    const { error } = await (supabase.from("activity_automations") as any).insert({ activity_id: activityId, recipe, trigger_state: "in_progress", config });
    if (error) throw error;
  }, onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-activities"] }) });
};

export const useApproveAutomationRun = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (runId: string) => {
    const { data, error } = await supabase.functions.invoke("crm-activity-automation", { body: { runId } });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, onSuccess: () => invalidateActivityQueries(qc) });
};
