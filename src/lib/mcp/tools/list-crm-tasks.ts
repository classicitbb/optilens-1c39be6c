import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_crm_tasks",
  title: "List CRM tasks and activities",
  description: "List CRM activities/tasks visible to the caller, newest first. Optionally filter to open tasks or one contact.",
  inputSchema: {
    contact_id: z.string().min(1).optional().describe("Restrict to one CRM contact id."),
    status: z.string().min(1).optional().describe("Filter by activity status (e.g. open, done)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max rows (default 15)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ contact_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("activities")
      .select("id,contact_id,opportunity_id,type,activity_type,content,status,priority,due_at,completed_at,owner_id,task_channel,created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 15);
    if (contact_id) q = q.eq("contact_id", contact_id);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return fail(error.message);
    const rows = data ?? [];
    return ok(rows, { count: rows.length, activities: rows });
  },
});
