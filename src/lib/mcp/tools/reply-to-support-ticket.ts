import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "reply_to_support_ticket",
  title: "Reply to support ticket",
  description: "Append a message from the signed-in user to an existing helpdesk ticket thread.",
  inputSchema: {
    ticket_id: z.string().min(1).describe("Ticket id returned by list_support_tickets."),
    body: z.string().trim().min(1).max(5000).describe("Message text to append."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ ticket_id, body }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("helpdesk_ticket_messages")
      .insert({
        ticket_id,
        body,
        direction: "inbound",
        sender_user_id: ctx.getUserId(),
        sender_email: ctx.getUserEmail() ?? null,
        is_automated: false,
      })
      .select("id,ticket_id,created_at")
      .maybeSingle();
    if (error) return fail(error.message);
    return ok(data, { message: data });
  },
});
