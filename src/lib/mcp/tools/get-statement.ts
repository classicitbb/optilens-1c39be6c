import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "get_statement",
  title: "Get statement transactions",
  description: "Fetch one statement with its transaction lines (invoices, payments, credits).",
  inputSchema: {
    statement_id: z.string().min(1).describe("Statement id returned by list_statements."),
    limit: z.number().int().min(1).max(500).optional().describe("Max transaction lines (default 200)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ statement_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data: statement, error } = await supabase
      .from("statements")
      .select("id,innovations_statement_id,account_number,statement_date,from_date,to_date,due_date,opening_balance,closing_balance,payments,finance_charges,status")
      .eq("id", statement_id)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!statement) return fail("Statement not found or not visible to this user.");
    const { data: lines, error: lineError } = await supabase
      .from("statement_lines")
      .select("id,post_date,order_type_name,invoice_id,reference,patient,amount,payment_method")
      .eq("innovations_statement_id", (statement as { innovations_statement_id: unknown }).innovations_statement_id)
      .order("post_date", { ascending: true })
      .limit(limit ?? 200);
    if (lineError) return fail(lineError.message);
    const payload = { statement, lines: lines ?? [] };
    return ok(payload, payload);
  },
});
