import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "get_support_ticket",
  title: "Get support ticket",
  description: "Fetch one helpdesk ticket with its message thread.",
  inputSchema: {
    ticket_id: z.string().min(1).describe("Ticket id returned by list_support_tickets."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ ticket_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data: ticket, error } = await supabase
      .from("helpdesk_tickets")
      .select("id,ticket_number,title,description,priority,source_channel,customer_email,opened_at,first_response_at,closed_at,deadline,created_at,updated_at")
      .eq("id", ticket_id)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!ticket) return fail("Ticket not found or not visible to this user.");
    const { data: messages, error: msgError } = await supabase
      .from("helpdesk_ticket_messages")
      .select("id,direction,body,sender_name,sender_email,is_automated,sent_at,created_at")
      .eq("ticket_id", ticket_id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (msgError) return fail(msgError.message);
    const payload = { ticket, messages: messages ?? [] };
    return ok(payload, payload);
  },
});
