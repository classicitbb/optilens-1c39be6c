import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_support_tickets",
  title: "List support tickets",
  description: "List helpdesk tickets visible to the caller (most recent first).",
  inputSchema: {
    search: z.string().min(1).optional().describe("Match against ticket title or description."),
    limit: z.number().int().min(1).max(50).optional().describe("Max tickets to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("helpdesk_tickets")
      .select("id,ticket_number,title,description,priority,source_channel,customer_email,opened_at,closed_at,deadline,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (search) {
      const like = `%${search.replace(/[%_]/g, "")}%`;
      q = q.or(`title.ilike.${like},description.ilike.${like}`);
    }
    const { data, error } = await q;
    if (error) return fail(error.message);
    const rows = data ?? [];
    return ok(rows, { count: rows.length, tickets: rows });
  },
});
