import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CrmActivity {
  id: string;
  activity_type: string;
  type: string;
  status: string;
  due_at: string | null;
  opportunity_id: string | null;
  contact_id: string;
  content: string | null;
  created_at: string;
}

export const useActivities = () => {
  return useQuery({
    queryKey: ["crm-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("id,type,activity_type,status,due_at,opportunity_id,contact_id,content,created_at")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as CrmActivity[];
    },
  });
};
