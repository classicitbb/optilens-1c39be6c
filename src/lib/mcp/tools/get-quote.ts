import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "get_quote",
  title: "Get quote details",
  description:
    "Fetch one quote with its lines. Lines are read through the cost-safe server function, so customers never receive cost or margin data.",
  inputSchema: { quote_id: z.string().min(1).describe("Quote id returned by list_quotes.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ quote_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data: quote, error } = await supabase
      .from("quotes")
      .select("id,quote_number,quote_type,status,customer_name,contact_name,contact_email,currency,valid_until,lead_time_days,notes_customer,grand_total,created_at")
      .eq("id", quote_id)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!quote) return fail("Quote not found or not visible to this user.");
    const { data: lines, error: lineError } = await supabase.rpc("get_customer_quote_lines", { p_quote_id: quote_id });
    if (lineError) return fail(lineError.message);
    const payload = { quote, lines: lines ?? [] };
    return ok(payload, payload);
  },
});
