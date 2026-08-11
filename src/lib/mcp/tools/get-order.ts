import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail } from "../supabase";

export default defineTool({
  name: "get_order",
  title: "Get order details",
  description: "Fetch one order with its line items, payments and activity. RLS restricts access to orders the caller may see.",
  inputSchema: { order_id: z.string().min(1).describe("Order id returned by list_orders.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ order_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const { data: order, error } = await supabase
      .from("orders")
      .select("id,status,total_amount,customer_name,contact_email,contact_phone,shipping_address,billing_address,checkout_method,created_at,updated_at")
      .eq("id", order_id)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!order) return fail("Order not found or not visible to this user.");
    const [{ data: items }, { data: payments }] = await Promise.all([
      supabase
        .from("order_items")
        .select("id,product_name,product_type,variant_label,sku,opc_code,quantity,product_price,unit_price_snapshot")
        .eq("order_id", order_id),
      supabase
        .from("order_payments")
        .select("id,status,amount,currency,method,created_at")
        .eq("order_id", order_id)
        .then((r) => r, () => ({ data: null })),
    ]);
    const payload = { order, items: items ?? [], payments: payments ?? [] };
    return ok(payload, payload);
  },
});
