import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_opportunities",
  title: "List sales opportunities",
  description: "List CRM opportunities visible to the caller, newest first.",
  inputSchema: {
    stage: z.string().min(1).optional().describe("Filter by pipeline stage."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 15)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ stage, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("opportunities")
      .select("id,title,contact_id,status,stage,country,volume_tier,expected_value,estimated_value,close_date,source,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 15);
    if (stage) q = q.eq("stage", stage);
    const { data, error } = await q;
    if (error) return fail(error.message);
    const rows = data ?? [];
    return ok(rows, { count: rows.length, opportunities: rows });
  },
});
