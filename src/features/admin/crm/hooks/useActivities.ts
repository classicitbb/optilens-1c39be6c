import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrmActivity {
  id: string;
  activity_type: string;
  status: string;
  due_at: string | null;
  opportunity_id: string | null;
  contact_id: string | null;
  created_at: string;
}

interface CreateActivityInput {
  activityType: string;
  dueAt?: string;
  opportunityId?: string;
  contactId?: string;
  status?: string;
}

export const useActivities = () => {
  return useQuery({
    queryKey: ["crm-activities"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("activities") as any)
        .select("id,activity_type,status,due_at,opportunity_id,contact_id,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as CrmActivity[];
    },
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
        payload: {},
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
