import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Allowed values for the DB's `type` (channel) column - see activities_type_check.
export const ACTIVITY_TYPES = ["note", "call", "email", "whatsapp", "meeting", "quote"] as const;
export type ActivityChannelType = (typeof ACTIVITY_TYPES)[number];

export interface CrmActivity {
  id: string;
  activity_type: string;
  type: ActivityChannelType;
  content: string | null;
  status: string;
  due_at: string | null;
  opportunity_id: string | null;
  contact_id: string | null;
  created_by: string | null;
  created_at: string;
}

interface CreateActivityInput {
  activityType: string;
  dueAt?: string;
  opportunityId?: string;
  contactId?: string;
  status?: string;
  type?: ActivityChannelType;
  content?: string;
  createdBy?: string;
}

export const useActivities = () => {
  return useQuery({
    queryKey: ["crm-activities"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("activities") as any)
        .select("id,activity_type,type,content,status,due_at,opportunity_id,contact_id,created_by,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as CrmActivity[];
    },
  });
};

// Maps staff user_id -> display name, for tagging "created by" in the UI.
// Uses a SECURITY DEFINER RPC so any staff member can see any other staff
// member's name without widening the profiles table's RLS (which also
// guards customer PII).
export const useStaffNames = () => {
  return useQuery({
    queryKey: ["staff-names"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("list_staff_names");
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as { user_id: string; name: string }[]) {
        map[row.user_id] = row.name;
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateActivityInput) => {
      const payload = {
        activity_type: input.activityType,
        due_at: input.dueAt || null,
        opportunity_id: input.opportunityId || null,
        contact_id: input.contactId || null,
        status: input.status || "open",
        type: input.type || "note",
        content: input.content || null,
        created_by: input.createdBy || null,
      };

      const { error } = await (supabase.from("activities") as any)
        .insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
      qc.invalidateQueries({ queryKey: ["crm-opportunities"] });
    },
  });
};

export const useCompleteActivity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("activities") as any)
        .update({ status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-activities"] });
    },
  });
};
