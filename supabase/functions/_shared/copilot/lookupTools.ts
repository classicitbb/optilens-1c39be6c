// Read-only lookup tools the Portal Copilot can call mid-conversation to ground
// its answers in real OpticAdmin data. These never write anything and never
// bypass the governed action-approval flow used elsewhere in this function —
// they only let Claude look things up before it answers.

export const LOOKUP_TOOLS = [
  {
    name: "search_contacts",
    description: "Search OpticAdmin's CRM contacts (the public.contacts table — never an external address book like Google Contacts) by name, business name, or email. Returns up to 8 matching contacts with their CRM pipeline/stage and linked ERP customer account, if any. Use this whenever the admin asks about a contact by name or wants to find contacts matching a description.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name, business name, or email fragment to search for." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "get_contact",
    description: "Get full detail on one OpticAdmin CRM contact by its id, including its linked ERP customer account (account number, pipeline stage) if one exists. Use this after search_contacts has identified the right contact, or when the admin gives you a contact id directly.",
    input_schema: {
      type: "object",
      properties: {
        contactId: { type: "string", description: "The contact's id (uuid)." },
      },
      required: ["contactId"],
      additionalProperties: false,
    },
  },
  {
    name: "search_web_orders",
    description: "Search orders placed through the Classic Visions website/portal (the public.orders table — real customer orders, not ERP order statistics) by customer name, contact email, or order id. Optionally filter by exact order status. Returns up to 8 matching orders with totals and status. Use this whenever the admin asks about web orders, online orders, or a specific order.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Customer name, contact email, or order id to search for." },
        status: { type: "string", description: "Optional exact order status to filter by, e.g. \"completed\" or \"pending\"." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "search_help_articles",
    description: "Search OpticAdmin's own help/wiki articles (the public.help_articles table, browsed at /admin/knowledge/wiki) by title, summary, description, or body text. Use this when the admin asks how something in OpticAdmin works, or asks a how-to/documentation question.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search text to match against article title, summary, description, or content." },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
] as const;

export const LOOKUP_TOOL_NAMES = new Set(LOOKUP_TOOLS.map((tool) => tool.name));

const truncate = (value: unknown, max: number) =>
  typeof value === "string" && value.length > max ? `${value.slice(0, max)}…` : value;

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

// PostgREST's .or() filter string is comma-delimited, so a raw comma in the
// search text would break the clause. Strip characters with special meaning
// there and neutralise ilike wildcards so results stay predictable.
const likePattern = (value: string) =>
  `%${value.replaceAll(",", " ").replaceAll("(", " ").replaceAll(")", " ").replaceAll("%", "").replaceAll("_", "").trim()}%`;

const searchContacts = async (db: any, query: string) => {
  const like = likePattern(query);
  const { data: contacts, error } = await db
    .from("contacts")
    .select("id,name,business_name,email,phone,pipeline,stage,is_company,linked_customer_id")
    .or(`name.ilike.${like},business_name.ilike.${like},email.ilike.${like}`)
    .eq("is_archived", false)
    .limit(8);
  if (error) throw new Error(error.message);
  const rows = contacts ?? [];
  const customerIds = [...new Set(rows.map((row: any) => row.linked_customer_id).filter((id: unknown) => id != null))];
  let customersById = new Map<number, unknown>();
  if (customerIds.length > 0) {
    const { data: customers, error: customersError } = await db
      .from("customers")
      .select("id,name,account_number,innovations_customer_id")
      .in("id", customerIds);
    if (customersError) throw new Error(customersError.message);
    customersById = new Map((customers ?? []).map((customer: any) => [customer.id, customer]));
  }
  return rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    businessName: row.business_name,
    email: row.email,
    phone: row.phone,
    pipeline: row.pipeline,
    stage: row.stage,
    isCompany: row.is_company,
    linkedCustomer: row.linked_customer_id ? customersById.get(row.linked_customer_id) ?? null : null,
  }));
};

const getContact = async (db: any, contactId: string) => {
  const { data: contact, error } = await db
    .from("contacts")
    .select("id,name,business_name,email,phone,pipeline,stage,next_action_at,lead_score,is_company,is_archived,linked_customer_id,notes")
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!contact) return { found: false };
  let linkedCustomer: unknown = null;
  if (contact.linked_customer_id) {
    const { data: customer, error: customerError } = await db
      .from("customers")
      .select("id,name,account_number,innovations_customer_id,pipeline_stage")
      .eq("id", contact.linked_customer_id)
      .maybeSingle();
    if (customerError) throw new Error(customerError.message);
    linkedCustomer = customer ?? null;
  }
  return {
    found: true,
    id: contact.id,
    name: contact.name,
    businessName: contact.business_name,
    email: contact.email,
    phone: contact.phone,
    pipeline: contact.pipeline,
    stage: contact.stage,
    nextActionAt: contact.next_action_at,
    leadScore: contact.lead_score,
    isCompany: contact.is_company,
    isArchived: contact.is_archived,
    notes: truncate(contact.notes, 500),
    linkedCustomer,
  };
};

const searchWebOrders = async (db: any, query: string, status?: string) => {
  const like = likePattern(query);
  const orClauses = [`customer_name.ilike.${like}`, `contact_email.ilike.${like}`];
  const trimmedQuery = query.trim();
  if (isUuid(trimmedQuery)) orClauses.push(`id.eq.${trimmedQuery}`);
  let builder = db
    .from("orders")
    .select("id,customer_name,contact_email,status,total_amount,created_at")
    .or(orClauses.join(","));
  if (status) builder = builder.eq("status", status);
  const { data, error } = await builder.order("created_at", { ascending: false }).limit(8);
  if (error) throw new Error(error.message);
  return data ?? [];
};

const searchHelpArticles = async (db: any, query: string) => {
  const like = likePattern(query);
  const { data, error } = await db
    .from("help_articles")
    .select("id,title,slug,summary,description,category,content_type,page_slug,status,updated_at,content")
    .or(`title.ilike.${like},summary.ilike.${like},description.ilike.${like},content.ilike.${like}`)
    .limit(8);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => ({ ...row, content: truncate(row.content, 500) }));
};

export const dispatchLookupTool = async (db: any, name: string, input: Record<string, unknown>) => {
  const query = typeof input.query === "string" ? input.query.trim() : "";
  switch (name) {
    case "search_contacts":
      if (!query) throw new Error("A search query is required");
      return searchContacts(db, query);
    case "get_contact": {
      const contactId = typeof input.contactId === "string" ? input.contactId.trim() : "";
      if (!contactId) throw new Error("A contactId is required");
      return getContact(db, contactId);
    }
    case "search_web_orders":
      if (!query) throw new Error("A search query is required");
      return searchWebOrders(db, query, typeof input.status === "string" ? input.status.trim() : undefined);
    case "search_help_articles":
      if (!query) throw new Error("A search query is required");
      return searchHelpArticles(db, query);
    default:
      throw new Error(`Unknown lookup tool: ${name}`);
  }
};
