import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "create_crm_task",
  title: "Create a CRM task or note",
  description:
    "Log a CRM activity (note or task) against a contact. Staff-only in practice: RLS rejects callers without CRM write access.",
  inputSchema: {
    contact_id: z.string().min(1).describe("CRM contact id from search_crm."),
    content: z.string().trim().min(1).max(4000).describe("Note text or task description."),
    activity_type: z.string().min(1).optional().describe("Activity type label (e.g. note, call, email, task)."),
    due_at: z.string().min(1).optional().describe("ISO timestamp when the task is due."),
    priority: z.string().min(1).optional().describe("Priority label."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ contact_id, content, activity_type, due_at, priority }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("activities")
      .insert({
        contact_id,
        content,
        type: activity_type ?? "note",
        activity_type: activity_type ?? "note",
        created_by: ctx.getUserId(),
        owner_id: ctx.getUserId(),
        ...(due_at ? { due_at, status: "open" } : {}),
        ...(priority ? { priority } : {}),
      })
      .select("id,contact_id,activity_type,status,due_at,created_at")
      .maybeSingle();
    if (error) return fail(error.message);
    return ok(data, { activity: data });
  },
});
