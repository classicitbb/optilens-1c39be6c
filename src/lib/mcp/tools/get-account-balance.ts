import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "get_account_balance",
  title: "Get account balance",
  description:
    "Return current balance, credit limit and last statement/payment info for the caller's customer account(s).",
  inputSchema: {
    account_number: z.string().min(1).optional().describe("Limit to one customer account number."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ account_number }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("balances")
      .select("account_number,credit_limit,current_balance,last_statement_amount,last_statement_date,last_payment_amount,last_payment_date,synced_at")
      .limit(25);
    if (account_number) q = q.eq("account_number", account_number);
    const { data, error } = await q;
    if (error) return fail(error.message);
    const rows = data ?? [];
    return ok(rows, { count: rows.length, balances: rows });
  },
});
