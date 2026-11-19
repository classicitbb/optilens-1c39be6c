import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, ok, fail, likePattern } from "../supabase";

export default defineTool({
  name: "search_crm",
  title: "Search CRM contacts and customers",
  description:
    "Search CRM contacts and customer accounts by name, email or account number. Staff-only in practice: RLS returns nothing for customer-role callers.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Name, email, business name or account number. When combined with a filter, this is a name search.").optional(),
    country: z.string().trim().min(1).describe("Exact country or island, e.g. Grenada.").optional(),
    account_number: z.string().trim().min(1).describe("Exact portal account number.").optional(),
    limit: z.number().int().min(1).max(25).optional().describe("Max rows per collection (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, country, account_number, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated;
    if (!query && !country && !account_number) return fail("Supply a name, country or account number.");
    const supabase = supabaseForUser(ctx);
    const cap = limit ?? 10;
    if (country || account_number) {
      let contacts = supabase.from("contacts").select("id,name,business_name,country,country_code,stage,linked_customer_id").order("id");
      let customers = supabase.from("customers").select("id,name,account_number,country_code").order("id");
      if (country) {
        contacts = contacts.eq("country_code", country);
        customers = customers.eq("country_code", country);
      }
      if (account_number) {
        const number = account_number.toUpperCase();
        const { data: matches, error } = await supabase.from("customers").select("id,contact_id").eq("account_number", number).limit(2);
        if (error) return fail(error.message);
        if (!matches?.length) return ok({ contacts: [], customers: [] });
        if (matches.length > 1) return fail("Multiple customers match this account number.");
        const [match] = matches;
        contacts = match.contact_id
          ? contacts.or(`linked_customer_id.eq.${match.id},id.eq.${match.contact_id}`)
          : contacts.eq("linked_customer_id", match.id);
        customers = customers.eq("id", match.id);
      }
      if (query) {
        contacts = contacts.ilike("name", likePattern(query));
        customers = customers.ilike("name", likePattern(query));
      }
      const [contactRows, customerRows] = await Promise.all([contacts.limit(cap), customers.limit(cap)]);
      const error = contactRows.error ?? customerRows.error;
      if (error) return fail(error.message);
      const payload = { contacts: contactRows.data ?? [], customers: customerRows.data ?? [] };
      return ok(payload, payload);
    }
    const like = likePattern(query ?? "");
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
