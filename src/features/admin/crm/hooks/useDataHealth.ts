import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { findDataHealthIssues, type DataHealthContact, type Finding } from "../dataHealth";

const COLUMNS =
  "id,name,business_name,email,phone,is_company,parent_id,linked_customer_id,innovations_parent_customer_id,pipeline,stage,notes,created_at";
const PAGE = 1000;

export interface MergeReport {
  dry_run: boolean;
  log_id: string | null;
  kept: { id: string; name: string | null };
  dropped: { id: string; name: string | null };
  moved: Record<string, number>;
  discarded_duplicates: number;
  filled: Array<{ column: string; before: unknown; after: unknown }>;
  conflicts: Array<{ column: string; kept: unknown; dropped: unknown }>;
}

/** All active contacts (PostgREST truncates at 1000 rows, so page). */
export const useDataHealth = () =>
  useQuery({
    queryKey: ["crm-data-health"],
    queryFn: async (): Promise<Finding[]> => {
      const rows: DataHealthContact[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await (supabase.from("contacts") as any)
          .select(COLUMNS)
          .eq("is_archived", false)
          .order("id")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        rows.push(...((data ?? []) as DataHealthContact[]));
        if (!data || data.length < PAGE) break;
      }
      return findDataHealthIssues(rows);
    },
  });

/** Runs crm_merge_contacts. Always preview with dryRun first. */
export const mergeContacts = async (keepId: string, dropId: string, dryRun: boolean): Promise<MergeReport> => {
  const { data, error } = await (supabase as any).rpc("crm_merge_contacts", {
    p_keep: keepId,
    p_drop: dropId,
    p_dry_run: dryRun,
  });
  if (error) throw error;
  return data as MergeReport;
};

export const useApplyMerges = () => {
  const qc = useQueryClient();
  return useMutation({
    /** Merges every dropId into keepId, one at a time, stopping at the first failure. */
    mutationFn: async ({ keepId, dropIds }: { keepId: string; dropIds: string[] }) => {
      const reports: MergeReport[] = [];
      for (const dropId of dropIds) reports.push(await mergeContacts(keepId, dropId, false));
      return reports;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["crm-data-health"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useLinkToCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ personId, companyId }: { personId: string; companyId: string }) => {
      const { error } = await (supabase.from("contacts") as any).update({ parent_id: companyId }).eq("id", personId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-data-health"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
};

export const useUnmerge = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (logId: string) => {
      const { data, error } = await (supabase as any).rpc("crm_unmerge_contacts", { p_log_id: logId });
      if (error) throw error;
      return data as { restored: number; not_restored: number };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-data-health"] }),
  });
};
