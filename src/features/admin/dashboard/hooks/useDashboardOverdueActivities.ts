import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OverdueActivity {
  id: string;
  activity_type: string | null;
  status: string | null;
  due_at: string | null;
  opportunity_title: string | null;
  contact_name: string | null;
}

export const useDashboardOverdueActivities = () => {
  return useQuery({
    queryKey: ["admin-dashboard", "overdue-activities"],
    queryFn: async (): Promise<OverdueActivity[]> => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("activities") as any)
        .select("id,activity_type,status,due_at,opportunities(title),contacts(name)")
        .lt("due_at", now)
        .neq("status", "completed")
        .order("due_at", { ascending: true })
        .limit(10);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        activity_type: row.activity_type,
        status: row.status,
        due_at: row.due_at,
        opportunity_title: row.opportunities?.title ?? null,
        contact_name: row.contacts?.name ?? null,
      }));
    },
  });
};
