import { useQuery } from "@tanstack/react-query";
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

export const useActivities = () => {
  return useQuery({
    queryKey: ["crm-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities" as any)
        .select("id,activity_type,status,due_at,opportunity_id,contact_id,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as CrmActivity[];
    },
  });
};
