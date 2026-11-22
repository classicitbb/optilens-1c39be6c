import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

type Contact = {
  pipeline: string | null;
  stage: string | null;
  is_company: boolean | null;
  is_archived: boolean | null;
  linked_customer_id: string | number | null;
};

export function summarizeContactOrganization(rows: Contact[], total: number | null) {
  const groups = new Map<string, { pipeline: string | null; stage: string | null; count: number }>();
  for (const row of rows) {
    const key = JSON.stringify([row.pipeline, row.stage]);
    const group = groups.get(key) ?? { pipeline: row.pipeline, stage: row.stage, count: 0 };
    group.count++;
    groups.set(key, group);
  }
  return {
    visible_total: total,
    reviewed_count: rows.length,
    complete: total !== null && total === rows.length,
    counts_scope: "All breakdowns describe only the reviewed rows visible to the signed-in user.",
    companies: rows.filter((row) => row.is_company === true).length,
    people: rows.filter((row) => row.is_company === false).length,
    unspecified_kind: rows.filter((row) => row.is_company === null).length,
    archived: rows.filter((row) => row.is_archived === true).length,
    linked_to_customer_account: rows.filter((row) => row.linked_customer_id !== null).length,
    without_customer_account: rows.filter((row) => row.linked_customer_id === null).length,
    pipeline_stages: [...groups.values()].sort((a, b) => b.count - a.count),
  };
}

export default defineTool({
  name: "review_crm_organization",
  title: "Review contact organization",
  description: "Read how visible CRM contacts are organized by company/person, pipeline, stage, archive status and ERP customer-account links. Returns counts without names, emails, notes or financial data. Bounded review; reports whether results cover the complete visible collection. Empty results do not establish that the CRM is empty or that access is granted.",
  inputSchema: {
    limit: z.number().int().min(1).max(1000).optional().describe("Maximum contacts to review, newest first (default 500)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const { data, count, error } = await supabaseForUser(ctx)
      .from("contacts")
      .select("pipeline,stage,is_company,is_archived,linked_customer_id", { count: "exact" })
      .order("id", { ascending: false })
      .limit(limit ?? 500);
    if (error) return fail(error.message);
    const summary = summarizeContactOrganization(data ?? [], count);
    return ok(summary, summary);
  },
});
