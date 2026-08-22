import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "create_support_ticket",
  title: "Create support ticket",
  description:
    "Open a new Classic Visions helpdesk ticket on behalf of the signed-in user. Use only when the user explicitly asks for support.",
  inputSchema: {
    title: z.string().trim().min(3).max(200).describe("Short subject line for the ticket."),
    description: z.string().trim().min(3).max(5000).describe("Full description of the issue or request."),
    priority: z.string().min(1).optional().describe("Optional priority label recognised by the helpdesk."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, description, priority }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("helpdesk_tickets")
      .insert({
        title,
        description,
        ...(priority ? { priority } : {}),
        source_channel: "mcp",
        customer_email: ctx.getUserEmail() ?? null,
        owner_user_id: null,
      })
      .select("id,ticket_number,title,priority,created_at")
      .maybeSingle();
    if (error) return fail(error.message);
    return ok(data, { ticket: data });
  },
});
