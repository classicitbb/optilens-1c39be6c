import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "list_orders",
  title: "List orders",
  description:
    "List Classic Visions orders visible to the signed-in user (most recent first). RLS limits customers to their own orders; staff see all.",
  inputSchema: {
    status: z.string().min(1).optional().describe("Filter by order status (e.g. pending, paid, cancelled)."),
    limit: z.number().int().min(1).max(50).optional().describe("Max orders to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("orders")
      .select("id,status,total_amount,customer_name,contact_email,checkout_method,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return fail(error.message);
    const rows = data ?? [];
    return ok(rows, { count: rows.length, orders: rows });
  },
});
