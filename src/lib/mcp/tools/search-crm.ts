import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail, likePattern } from "../supabase";

export default defineTool({
  name: "search_crm",
  title: "Search CRM contacts and customers",
  description:
    "Search CRM contacts and customer accounts by name, email or account number. Staff-only in practice: RLS returns nothing for customer-role callers.",
  inputSchema: {
    query: z.string().min(1).describe("Name, email, business name or account number."),
    limit: z.number().int().min(1).max(25).optional().describe("Max rows per collection (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    const supabase = supabaseForUser(ctx);
    const like = likePattern(query);
    const cap = limit ?? 10;
    const [contactsRes, customersRes] = await Promise.all([
      supabase
        .from("contacts")
        .select("id,name,business_name,email,phone,city,country,pipeline,stage,status,is_customer,linked_customer_id,next_action_at")
        .or(`name.ilike.${like},business_name.ilike.${like},email.ilike.${like}`)
        .limit(cap),
      supabase
        .from("customers")
        .select("id,name,account_number,type,email,phone,country_code,pipeline_stage,credit_limit,pay_by_card,pay_by_eft,assigned_pricelist_id")
        .or(`name.ilike.${like},account_number.ilike.${like},email.ilike.${like}`)
        .limit(cap),
    ]);
    if (contactsRes.error && customersRes.error) return fail(contactsRes.error.message);
    const payload = { contacts: contactsRes.data ?? [], customers: customersRes.data ?? [] };
    return ok(payload, payload);
  },
});
