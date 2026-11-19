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
    activity_type: z.enum(["note", "call", "email", "whatsapp", "meeting", "quote", "task"]).optional()
      .describe("Use task for a to-do, or choose a communication type."),
    title: z.string().trim().min(1).max(200).optional().describe("Short activity title."),
    due_at: z.string().datetime({ offset: true }).optional().describe("ISO timestamp with a timezone offset."),
    priority: z.enum(["urgent", "high", "normal", "low"]).optional().describe("Priority, default normal."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ contact_id, content, activity_type = "note", title, due_at, priority }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("activities")
      .insert({
        contact_id,
        content,
        type: activity_type === "task" ? "note" : activity_type,
        activity_type: title ?? activity_type,
        created_by: ctx.getUserId(),
        owner_id: ctx.getUserId(),
        due_at: due_at ?? null,
        status: due_at || activity_type === "task" ? "planned" : "inbox",
        priority: priority ?? "normal",
      })
      .select("id,contact_id,type,activity_type,status,priority,due_at,created_at")
      .single();
    if (error) return fail(error.message);
    return ok(data, { activity: data });
  },
});
