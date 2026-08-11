import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_statements",
  title: "List account statements",
  description:
    "List billing statements visible to the caller (most recent first), optionally for one customer account number.",
  inputSchema: {
    account_number: z.string().min(1).optional().describe("Filter by customer account number."),
    limit: z.number().int().min(1).max(50).optional().describe("Max statements to return (default 12)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ account_number, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("statements")
      .select("id,account_number,statement_date,from_date,to_date,due_date,opening_balance,closing_balance,payments,finance_charges,status")
      .order("statement_date", { ascending: false })
      .limit(limit ?? 12);
    if (account_number) q = q.eq("account_number", account_number);
    const { data, error } = await q;
    if (error) return fail(error.message);
    const rows = data ?? [];
    return ok(rows, { count: rows.length, statements: rows });
  },
});
