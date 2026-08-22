import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_quotes",
  title: "List quotes",
  description: "List quotes visible to the caller (most recent first). Cost and margin fields are hidden from customers by policy.",
  inputSchema: {
    status: z.string().min(1).optional().describe("Filter by quote status."),
    limit: z.number().int().min(1).max(50).optional().describe("Max quotes to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("quotes")
      .select("id,quote_number,quote_type,status,customer_name,contact_name,contact_email,currency,valid_until,lead_time_days,grand_total,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return fail(error.message);
    const rows = data ?? [];
    return ok(rows, { count: rows.length, quotes: rows });
  },
});
