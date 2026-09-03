// Shared admin resource registry.
//
// One declarative map of every admin-managed table the Portal Copilot and the
// MCP server are allowed to read and write, so both surfaces have identical
// capability. Deno-safe: no imports, no env reads, no I/O at module scope.
//
// Autonomy policy (agreed with the business):
//   - reads and ordinary writes execute immediately, no approval card
//   - deletes always require approval
//   - price-bearing resources require approval on create/update
//   - customer-facing sends are NOT in this registry; they stay behind the
//     existing governed action/approval flow.

export type AdminWriteClass = "immediate" | "approval";

export type AdminResource = {
  /** Stable tool-facing key. */
  key: string;
  /** Physical table. */
  table: string;
  /** Admin module this belongs to (matches the launcher). */
  module: string;
  description: string;
  /** Columns returned by list/get. `*` means all. */
  select: string;
  /** Text columns searched by `admin_search_records`. */
  searchColumns: string[];
  /** Columns the copilot may write. Empty = read-only resource. */
  writable: string[];
  /** Default ordering column (descending). */
  orderBy?: string;
  /** Writes touch money/prices — always require approval. */
  priceSensitive?: boolean;
  /** Reads or writes can expose internal financial data; admins only. */
  financialData?: boolean;
};

export const ADMIN_RESOURCES: AdminResource[] = [
  // ---------------------------------------------------------------- CRM
  {
    key: "contacts",
    table: "contacts",
    module: "Contacts / CRM",
    description: "CRM contacts and companies, with pipeline, stage, lead score and ERP customer link.",
    select: "id,name,business_name,email,phone,pipeline,stage,lead_score,next_action_at,is_company,is_archived,linked_customer_id,notes,created_at,updated_at",
    searchColumns: ["name", "business_name", "email", "phone"],
    writable: ["name", "business_name", "email", "phone", "pipeline", "stage", "lead_score", "next_action_at", "notes", "is_archived", "linked_customer_id"],
    orderBy: "updated_at",
  },
  {
    key: "opportunities",
    table: "opportunities",
    module: "CRM",
    description: "Sales pipeline opportunities.",
    select: "*",
    searchColumns: ["name"],
    writable: ["name", "stage", "status", "expected_close_date", "contact_id", "notes", "probability"],
    orderBy: "updated_at",
    priceSensitive: true,
  },
  {
    key: "activities",
    table: "activities",
    module: "CRM",
    description: "CRM activities, tasks and follow-ups.",
    select: "*",
    searchColumns: ["subject", "notes"],
    writable: ["subject", "notes", "due_at", "status", "activity_type", "contact_id", "owner_id", "channel"],
    orderBy: "created_at",
  },
  {
    key: "notes",
    table: "notes",
    module: "CRM",
    description: "Free-form notes attached to CRM records.",
    select: "*",
    searchColumns: ["content"],
    writable: ["content", "contact_id"],
    orderBy: "created_at",
  },
  {
    key: "lead_audits",
    table: "lead_audits",
    module: "Leads",
    description: "Lead audit reports produced by the lead finder.",
    select: "*",
    searchColumns: [],
    writable: [],
    orderBy: "created_at",
  },

  // ----------------------------------------------------------- Helpdesk
  {
    key: "helpdesk_tickets",
    table: "helpdesk_tickets",
    module: "Helpdesk",
    description: "Support tickets. On create, ticket number, opened time, and AI-assistant source are supplied automatically. Priority accepts Low, Normal, Medium, High, Urgent, Critical, or 0-5.",
    select: "*",
    searchColumns: ["title", "ticket_number", "description"],
    writable: ["title", "description", "stage_id", "priority", "team_id", "owner_user_id", "ticket_type_id", "partner_contact_id", "deadline", "closed_at", "source_channel"],
    orderBy: "created_at",
  },
  {
    key: "helpdesk_ticket_messages",
    table: "helpdesk_ticket_messages",
    module: "Helpdesk",
    description: "Ticket conversation entries. Internal notes are safe; customer-visible replies are a customer-facing send.",
    select: "*",
    searchColumns: ["body"],
    writable: ["ticket_id", "body", "is_internal", "author_id"],
    orderBy: "created_at",
  },
  {
    key: "helpdesk_ticket_sla_status",
    table: "helpdesk_ticket_sla_status",
    module: "Helpdesk",
    description: "SLA policy assignments and deadlines per ticket (ticket_id, sla_policy_id, deadline_at, status).",
    select: "id,ticket_id,sla_policy_id,deadline_at,reached_at,status,created_at,updated_at",
    searchColumns: [],
    writable: ["ticket_id", "sla_policy_id", "deadline_at", "reached_at", "status"],
    orderBy: "deadline_at",
  },
  {
    key: "helpdesk_sla_policies",
    table: "helpdesk_sla_policies",
    module: "Helpdesk",
    description: "SLA policy definitions (name, target hours, team).",
    select: "*",
    searchColumns: ["name"],
    writable: ["name", "target_hours", "team_id", "active"],
    orderBy: "name",
  },
  {
    key: "helpdesk_teams",
    table: "helpdesk_teams",
    module: "Helpdesk",
    description: "Helpdesk teams.",
    select: "*",
    searchColumns: ["name"],
    writable: ["name", "description", "active"],
    orderBy: "name",
  },
  {
    key: "helpdesk_ticket_stages",
    table: "helpdesk_ticket_stages",
    module: "Helpdesk",
    description: "Ticket stages / pipeline columns.",
    select: "*",
    searchColumns: ["name"],
    writable: ["name", "sequence", "is_closed", "active"],
    orderBy: "sequence",
  },

  // ------------------------------------------------------- Orders & Rx
  {
    key: "orders",
    table: "orders",
    module: "Website / Orders",
    description: "Web and portal orders.",
    select: "*",
    searchColumns: ["customer_name", "contact_email"],
    writable: ["status", "notes"],
    orderBy: "created_at",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "order_items",
    table: "order_items",
    module: "Website / Orders",
    description: "Line items on a web order.",
    select: "*",
    searchColumns: ["product_name"],
    writable: ["quantity", "status"],
    orderBy: "created_at",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "rx_order_submissions",
    table: "rx_order_submissions",
    module: "Website / Rx",
    description: "Rx order submissions dispatched to the lab.",
    select: "*",
    searchColumns: ["status"],
    writable: ["status", "notes"],
    orderBy: "created_at",
  },
  {
    key: "stock_order_submissions",
    table: "stock_order_submissions",
    module: "Website / Stock orders",
    description: "Stock (WSPL) order submissions.",
    select: "*",
    searchColumns: ["status"],
    writable: ["status", "notes"],
    orderBy: "created_at",
  },
  {
    key: "quotes",
    table: "quotes",
    module: "Website / Quotations",
    description: "Customer quotations.",
    select: "*",
    searchColumns: ["quote_number", "customer_name"],
    writable: ["status", "notes", "valid_until"],
    orderBy: "created_at",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "quote_lines",
    table: "quote_lines",
    module: "Website / Quotations",
    description: "Quotation line items. Price-bearing.",
    select: "*",
    searchColumns: ["description"],
    writable: ["description", "quantity"],
    orderBy: "created_at",
    priceSensitive: true,
    financialData: true,
  },

  // ------------------------------------------------- Catalog & pricing
  {
    key: "lenses",
    table: "lenses",
    module: "Pricing / Catalog",
    description: "Rx and stock lens catalog, including web_enabled / wspl_enabled channel flags.",
    select: "*",
    searchColumns: ["name", "description"],
    writable: ["name", "description", "is_active", "web_enabled", "wspl_enabled", "material_id", "lenstype_id", "finishtype_id", "brand_id"],
    orderBy: "updated_at",
    priceSensitive: true,
  },
  {
    key: "addons",
    table: "addons",
    module: "Pricing / Catalog",
    description: "Lens add-ons and treatments.",
    select: "*",
    searchColumns: ["name", "description"],
    writable: ["name", "description", "is_active"],
    orderBy: "name",
    priceSensitive: true,
  },
  {
    key: "supplies",
    table: "supplies",
    module: "Pricing / Catalog",
    description: "Optical supplies catalog.",
    select: "*",
    searchColumns: ["name", "description", "sku"],
    writable: ["name", "description", "is_active", "category_id"],
    orderBy: "name",
    priceSensitive: true,
  },
  {
    key: "brands",
    table: "brands",
    module: "Pricing / Catalog",
    description: "Product brands.",
    select: "*",
    searchColumns: ["name"],
    writable: ["name", "is_active"],
    orderBy: "name",
  },
  {
    key: "price_catalog",
    table: "price_catalog",
    module: "Pricing",
    description: "Canonical website price catalog. Price-bearing.",
    select: "*",
    searchColumns: [],
    writable: ["price"],
    orderBy: "id",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "price_matrix",
    table: "price_matrix",
    module: "Pricing",
    description: "Rx price matrix rows. Price-bearing.",
    select: "*",
    searchColumns: [],
    writable: ["price"],
    orderBy: "id",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "pricelists",
    table: "pricelists",
    module: "Pricing",
    description: "Pricelist definitions.",
    select: "*",
    searchColumns: ["name"],
    writable: ["name"],
    orderBy: "id",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "pricelist_versions",
    table: "pricelist_versions",
    module: "Pricing",
    description: "Published pricelist versions. Publishing is price-bearing.",
    select: "*",
    searchColumns: ["name"],
    writable: ["name", "status", "notes"],
    orderBy: "created_at",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "catalog_templates",
    table: "catalog_templates",
    module: "Pricing / Catalog builder",
    description: "Catalog builder templates.",
    select: "*",
    searchColumns: ["name"],
    writable: ["name", "description"],
    orderBy: "updated_at",
  },
  {
    key: "store_product_overrides",
    table: "store_product_overrides",
    module: "Website / Store",
    description: "Per-product storefront overrides such as publish state.",
    select: "*",
    searchColumns: [],
    writable: ["is_published", "display_name", "sort_order"],
    orderBy: "updated_at",
    priceSensitive: true,
    financialData: true,
  },

  // ------------------------------------------ Customers, portal, billing
  {
    key: "customers",
    table: "customers",
    module: "Customers",
    description: "ERP/billing customer accounts (account number, credit terms, Innovations link).",
    select: "*",
    searchColumns: ["name", "account_number", "email"],
    writable: ["name", "email", "phone", "pipeline_stage", "assigned_pricelist_id", "is_active"],
    orderBy: "updated_at",
    financialData: true,
  },
  {
    key: "profiles",
    table: "profiles",
    module: "Settings / Users",
    description: "User profiles including portal access status.",
    select: "id,email,full_name,portal_access_status,portal_access_note,crm_customer_id,created_at,updated_at",
    searchColumns: ["email", "full_name"],
    writable: ["full_name", "portal_access_status", "portal_access_note"],
    orderBy: "updated_at",
  },
  {
    key: "portal_account_memberships",
    table: "portal_account_memberships",
    module: "Customers / Portal",
    description: "Which users can act on which customer accounts.",
    select: "*",
    searchColumns: [],
    writable: ["status", "role", "customer_id", "user_id"],
    orderBy: "updated_at",
  },
  {
    key: "customer_addresses",
    table: "customer_addresses",
    module: "Customers",
    description: "Customer shipping/billing addresses.",
    select: "*",
    searchColumns: ["line1", "city", "country"],
    writable: ["label", "line1", "line2", "city", "state", "postal_code", "country", "is_default"],
    orderBy: "updated_at",
  },
  {
    key: "statements",
    table: "statements",
    module: "Customers / Billing",
    description: "Customer account statements.",
    select: "*",
    searchColumns: [],
    writable: [],
    orderBy: "created_at",
    financialData: true,
  },
  {
    key: "statement_lines",
    table: "statement_lines",
    module: "Customers / Billing",
    description: "Statement transaction lines.",
    select: "*",
    searchColumns: [],
    writable: [],
    orderBy: "created_at",
    financialData: true,
  },
  {
    key: "account_payments",
    table: "account_payments",
    module: "Customers / Billing",
    description: "Recorded account payments. Read-only here: payments are confirmed by their own governed RPC.",
    select: "*",
    searchColumns: [],
    writable: [],
    orderBy: "created_at",
    financialData: true,
  },
  {
    key: "balances",
    table: "balances",
    module: "Customers / Billing",
    description: "Customer account balances synced from the ERP.",
    select: "*",
    searchColumns: [],
    writable: [],
    orderBy: "updated_at",
    financialData: true,
  },

  // ---------------------------------------------------------- Shipments
  {
    key: "shipments",
    table: "shipments",
    module: "Costings / Shipments",
    description: "Inbound shipments and landed-cost headers.",
    select: "*",
    searchColumns: ["reference", "supplier_name"],
    writable: ["reference", "status", "notes", "arrival_date"],
    orderBy: "created_at",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "shipment_lines",
    table: "shipment_lines",
    module: "Costings / Shipments",
    description: "Shipment line items.",
    select: "*",
    searchColumns: [],
    writable: ["quantity", "notes"],
    orderBy: "created_at",
    priceSensitive: true,
    financialData: true,
  },
  {
    key: "shipment_charges",
    table: "shipment_charges",
    module: "Costings / Shipments",
    description: "Shipment charges used in landed-cost calculation.",
    select: "*",
    searchColumns: [],
    writable: ["charge_type_id", "amount", "notes"],
    orderBy: "created_at",
    priceSensitive: true,
    financialData: true,
  },

  // ---------------------------------------- Docs, knowledge & settings
  {
    key: "docstudio_billing_documents",
    table: "docstudio_billing_documents",
    module: "Doc Studio",
    description:
      "Doc Studio billing documents: invoices, quotes, pro formas and receipts. Prefer the docstudio_create_document tool, which resolves the customer, the issuer details and the document number and computes the totals for you. Use this resource directly only to read documents or amend one you already created. Never invent a billing_number; never hand-write the content or totals JSON.",
    select: "*",
    searchColumns: ["document_name", "billing_number", "customer_name", "customer_company"],
    writable: [
      "document_name", "document_type", "billing_number",
      "customer_name", "customer_company", "customer_account",
      "paper_size", "status", "content", "totals",
      "source_document_type", "source_document_id",
    ],
    orderBy: "created_at",
  },
  {
    key: "docstudio_files",
    table: "docstudio_files",
    module: "Doc Studio",
    description:
      "Doc Studio content files. The copilot may author email and letter files; signature, social, ship-label, statement and pricelist files are edited in the studio. Content must be built with the shared content builder, not hand-written.",
    select: "id,owner_user_id,file_type,file_name,customer_name,customer_account,metadata,version,created_at,updated_at",
    searchColumns: ["file_name", "customer_name", "customer_account"],
    writable: ["file_name", "file_type", "customer_name", "customer_account", "metadata", "content"],
    orderBy: "updated_at",
  },
  {
    key: "help_articles",
    table: "help_articles",
    module: "Knowledge / Wiki",
    description: "Admin wiki and help articles.",
    select: "id,title,slug,summary,description,category,content_type,page_slug,status,updated_at",
    searchColumns: ["title", "summary", "description", "content"],
    writable: ["title", "summary", "description", "category", "content", "status", "page_slug"],
    orderBy: "updated_at",
  },
  {
    key: "blog_posts",
    table: "blog_posts",
    module: "Website / Content",
    description: "Public blog posts.",
    select: "id,title,slug,excerpt,status,published_at,updated_at",
    searchColumns: ["title", "excerpt"],
    writable: ["title", "slug", "excerpt", "content", "status", "published_at"],
    orderBy: "updated_at",
  },
  {
    key: "website_features",
    table: "website_features",
    module: "Settings",
    description: "Website feature flags.",
    select: "*",
    searchColumns: ["feature_key"],
    writable: ["enabled"],
    orderBy: "feature_key",
  },
  {
    key: "company_settings",
    table: "company_settings",
    module: "Settings",
    description:
      "Company profile and global settings. Also holds the issuer details every Doc Studio document is built from — letterhead address, registration numbers and bank details — so changing them here changes every document produced afterwards.",
    select: "*",
    searchColumns: [],
    // support_email / phone / address were listed here but are not columns on
    // this table; the real ones are email / tel / the split physical_* fields.
    writable: [
      "company_name", "email", "feedback_email", "tel", "fax", "slogan",
      "physical_line1", "physical_line2", "physical_city", "physical_state", "physical_postcode", "physical_country",
      "tax_tin", "company_reg_no", "base_currency", "default_vat",
      "bank_name", "bank_account_name", "bank_account_no", "bank_branch", "bank_swift", "bank_note",
      "default_paper_size", "default_due_days",
    ],
    orderBy: "id",
  },
  {
    key: "role_permissions",
    table: "role_permissions",
    module: "Settings / Roles",
    description: "Role to feature permission matrix. Read-only from the copilot.",
    select: "*",
    searchColumns: [],
    writable: [],
    orderBy: "id",
  },
];

export const ADMIN_RESOURCE_BY_KEY = new Map(ADMIN_RESOURCES.map((resource) => [resource.key, resource]));

export const findAdminResource = (key: string): AdminResource => {
  const resource = ADMIN_RESOURCE_BY_KEY.get(key);
  if (!resource) {
    throw new Error(`Unknown resource "${key}". Call admin_list_resources to see valid keys.`);
  }
  return resource;
};

/**
 * Autonomy policy. Deletes always need approval; price-bearing writes need
 * approval; everything else executes immediately.
 */
export const classifyAdminWrite = (
  resource: AdminResource,
  operation: "create" | "update" | "delete",
): { writeClass: AdminWriteClass; reason: string } => {
  if (operation === "delete") {
    return { writeClass: "approval", reason: "Deletes are irreversible and need approval." };
  }
  if (resource.priceSensitive) {
    return { writeClass: "approval", reason: `${resource.key} carries price or money values, so changes need approval.` };
  }
  return { writeClass: "immediate", reason: "Reversible change — executed immediately." };
};

const sanitizeLike = (value: string) =>
  `%${value.replaceAll(",", " ").replaceAll("(", " ").replaceAll(")", " ").replaceAll("%", "").replaceAll("_", "").trim()}%`;

const pickWritable = (resource: AdminResource, values: Record<string, unknown>) => {
  if (resource.writable.length === 0) {
    throw new Error(`${resource.key} is read-only.`);
  }
  const allowed: Record<string, unknown> = {};
  const rejected: string[] = [];
  for (const [key, value] of Object.entries(values ?? {})) {
    if (resource.writable.includes(key)) allowed[key] = value;
    else rejected.push(key);
  }
  if (Object.keys(allowed).length === 0) {
    throw new Error(`No writable fields supplied for ${resource.key}. Writable fields: ${resource.writable.join(", ")}`);
  }
  return { allowed, rejected };
};

const HELPDESK_PRIORITY_BY_LABEL: Record<string, number> = {
  low: 0,
  normal: 1,
  medium: 2,
  high: 3,
  urgent: 4,
  critical: 5,
};

const normalizeHelpdeskPriority = (value: unknown): number => {
  const label = typeof value === "string" ? value.trim().toLowerCase() : "";
  const numeric = label in HELPDESK_PRIORITY_BY_LABEL ? HELPDESK_PRIORITY_BY_LABEL[label] : Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 5) {
    throw new Error("Helpdesk priority must be Low, Normal, Medium, High, Urgent, Critical, or an integer from 0 to 5.");
  }
  return numeric;
};

/** Opaque per-save token the Doc Studio API uses for optimistic locking. */
const newDocStudioVersion = () => {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
};

/**
 * Doc Studio tables carry two NOT NULL columns with no default that the model
 * has no way to supply — owner_user_id and version. Stamping them here is what
 * makes a copilot-created document possible at all; without it every insert
 * fails on a not-null violation.
 *
 * Copilot-created documents are always drafts. They are inert until a human
 * opens one in Doc Studio, which is the review gate.
 */
const applyDocStudioCreateDefaults = (
  resource: AdminResource,
  allowed: Record<string, unknown>,
  actorUserId?: string,
) => {
  if (!resource.table.startsWith("docstudio_")) return;
  if (!actorUserId) {
    throw new Error("Doc Studio documents need a signed-in admin to own them; no acting user was supplied.");
  }
  allowed.owner_user_id = actorUserId;
  allowed.version = newDocStudioVersion();
  if (resource.table === "docstudio_billing_documents") {
    allowed.created_by_copilot = true;
    allowed.status = "draft";
  }
};

const normalizeAdminWriteValues = (
  resource: AdminResource,
  input: Record<string, unknown>,
) => {
  const values = { ...input };
  if (resource.key !== "helpdesk_tickets") return values;

  if (values.assigned_to !== undefined && values.owner_user_id === undefined) {
    values.owner_user_id = values.assigned_to;
  }
  delete values.assigned_to;
  if (values.priority !== undefined) values.priority = normalizeHelpdeskPriority(values.priority);
  return values;
};

const clampLimit = (value: unknown, fallback = 20) => {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(Math.trunc(num), 1), 50);
};

export type AdminToolResult = {
  status: "ok" | "needs_approval";
  resource: string;
  operation: string;
  data?: unknown;
  proposal?: Record<string, unknown>;
  reason?: string;
  ignoredFields?: string[];
};

export type AdminResourceAccess = {
  canAccessFinancialData: boolean;
};

/**
 * Executes an admin resource tool. Writes classified as "approval" are NOT
 * executed — the caller (copilot / MCP tool) turns the returned proposal into
 * an approval card.
 */
export const dispatchAdminResourceTool = async (
  db: any,
  name: string,
  input: Record<string, unknown>,
  actorUserId?: string,
  // Fail closed: a caller that does not resolve the capability never gets
  // financial resources. Do not remove this parameter — line ~712 depends on it
  // and dropping it makes every tool call throw at runtime (500).
  access: AdminResourceAccess = { canAccessFinancialData: false },
): Promise<AdminToolResult> => {

  if (name === "admin_list_resources") {
    const moduleFilter = typeof input.module === "string" ? input.module.toLowerCase() : "";
    const items = ADMIN_RESOURCES
      .filter((resource) => !moduleFilter || resource.module.toLowerCase().includes(moduleFilter))
      .map((resource) => ({
        key: resource.key,
        module: resource.module,
        description: resource.description,
        writable: resource.writable,
        approvalOnWrite: Boolean(resource.priceSensitive),
        financialData: Boolean(resource.financialData),
      }));
    return { status: "ok", resource: "*", operation: "list_resources", data: items };
  }

  const resource = findAdminResource(typeof input.resource === "string" ? input.resource : "");
  if (resource.financialData && !access.canAccessFinancialData) {
    throw new Error("Financial data is restricted to administrators with the financial-data capability.");
  }

  if (name === "admin_search_records") {
    const query = typeof input.query === "string" ? input.query.trim() : "";
    const limit = clampLimit(input.limit);
    let builder = db.from(resource.table).select(resource.select);
    if (query && resource.searchColumns.length > 0) {
      const like = sanitizeLike(query);
      builder = builder.or(resource.searchColumns.map((column) => `${column}.ilike.${like}`).join(","));
    }
    const filters = (input.filters ?? {}) as Record<string, unknown>;
    for (const [column, value] of Object.entries(filters)) {
      builder = value === null ? builder.is(column, null) : builder.eq(column, value as never);
    }
    if (resource.orderBy) builder = builder.order(resource.orderBy, { ascending: false });
    const { data, error } = await builder.limit(limit);
    if (error) throw new Error(error.message);
    return { status: "ok", resource: resource.key, operation: "search", data: data ?? [] };
  }

  if (name === "admin_get_record") {
    const id = input.id;
    if (id === undefined || id === null || id === "") throw new Error("An id is required.");
    const { data, error } = await db.from(resource.table).select(resource.select).eq("id", id as never).maybeSingle();
    if (error) throw new Error(error.message);
    return { status: "ok", resource: resource.key, operation: "get", data: data ?? null };
  }

  if (name === "admin_create_record" || name === "admin_update_record") {
    const operation = name === "admin_create_record" ? "create" : "update";
    const rawValues = normalizeAdminWriteValues(resource, (input.values ?? {}) as Record<string, unknown>);
    const { allowed, rejected } = pickWritable(resource, rawValues);
    if (resource.key === "helpdesk_tickets" && operation === "create") {
      const title = typeof allowed.title === "string" ? allowed.title.trim() : "";
      if (!title) throw new Error("A title is required to create a Helpdesk ticket.");
      const generatedId = crypto.randomUUID();
      allowed.id = generatedId;
      allowed.ticket_number = `TCK-${generatedId.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      allowed.title = title;
      allowed.description = typeof allowed.description === "string" ? allowed.description : "";
      allowed.priority = allowed.priority ?? 1;
      allowed.source_channel = "ai_assistant";
      allowed.opened_at = new Date().toISOString();
    }
    if (operation === "create") applyDocStudioCreateDefaults(resource, allowed, actorUserId);
    // Amending a Doc Studio document has to move its version token, or a studio
    // tab holding the old one will overwrite the change without warning.
    if (operation === "update" && resource.table.startsWith("docstudio_")) {
      allowed.version = newDocStudioVersion();
      allowed.updated_at = new Date().toISOString();
    }
    const id = input.id;
    if (operation === "update" && (id === undefined || id === null || id === "")) {
      throw new Error("An id is required to update a record.");
    }
    const { writeClass, reason } = classifyAdminWrite(resource, operation);
    if (writeClass === "approval") {
      return {
        status: "needs_approval",
        resource: resource.key,
        operation,
        reason,
        proposal: { table: resource.table, id: id ?? null, values: allowed },
        ignoredFields: rejected,
      };
    }
    const builder = operation === "create"
      ? db.from(resource.table).insert(allowed).select(resource.select)
      : db.from(resource.table).update(allowed).eq("id", id as never).select(resource.select);
    const { data, error } = await builder;
    if (error) throw new Error(error.message);
    return { status: "ok", resource: resource.key, operation, data: data ?? [], ignoredFields: rejected };
  }

  if (name === "admin_delete_record") {
    const id = input.id;
    if (id === undefined || id === null || id === "") throw new Error("An id is required to delete a record.");
    if (resource.writable.length === 0) throw new Error(`${resource.key} is read-only.`);
    const { reason } = classifyAdminWrite(resource, "delete");
    return {
      status: "needs_approval",
      resource: resource.key,
      operation: "delete",
      reason,
      proposal: { table: resource.table, id },
    };
  }

  throw new Error(`Unknown admin resource tool: ${name}`);
};

const RESOURCE_KEYS_HINT = ADMIN_RESOURCES.map((resource) => resource.key).join(", ");

export const ADMIN_RESOURCE_TOOLS = [
  {
    name: "admin_list_resources",
    description: "List every admin data resource this copilot can read or write, with its module, writable fields, and whether writes need approval. Call this first when you are unsure which resource covers a request.",
    input_schema: {
      type: "object",
      properties: { module: { type: "string", description: "Optional module name filter, e.g. \"Helpdesk\" or \"Pricing\"." } },
      additionalProperties: false,
    },
  },
  {
    name: "admin_search_records",
    description: `Search or list records in any admin resource. Valid resource keys: ${RESOURCE_KEYS_HINT}.`,
    input_schema: {
      type: "object",
      properties: {
        resource: { type: "string", description: "Resource key." },
        query: { type: "string", description: "Optional free-text search." },
        filters: { type: "object", description: "Optional exact-match column filters, e.g. {\"status\":\"open\"}." },
        limit: { type: "number", description: "Max rows, 1-50 (default 20)." },
      },
      required: ["resource"],
      additionalProperties: false,
    },
  },
  {
    name: "admin_get_record",
    description: "Fetch one record by id from an admin resource.",
    input_schema: {
      type: "object",
      properties: {
        resource: { type: "string" },
        id: { type: ["string", "number"] },
      },
      required: ["resource", "id"],
      additionalProperties: false,
    },
  },
  {
    name: "admin_create_record",
    description: "Create a record in an admin resource. Executes immediately unless the resource is price-bearing, in which case it returns an approval proposal.",
    input_schema: {
      type: "object",
      properties: {
        resource: { type: "string" },
        values: { type: "object", description: "Column/value pairs. Only writable columns are accepted." },
      },
      required: ["resource", "values"],
      additionalProperties: false,
    },
  },
  {
    name: "admin_update_record",
    description: "Update a record in an admin resource. Executes immediately unless the resource is price-bearing, in which case it returns an approval proposal.",
    input_schema: {
      type: "object",
      properties: {
        resource: { type: "string" },
        id: { type: ["string", "number"] },
        values: { type: "object" },
      },
      required: ["resource", "id", "values"],
      additionalProperties: false,
    },
  },
  {
    name: "admin_delete_record",
    description: "Propose deleting a record. Deletes are irreversible and always return an approval proposal instead of executing.",
    input_schema: {
      type: "object",
      properties: {
        resource: { type: "string" },
        id: { type: ["string", "number"] },
      },
      required: ["resource", "id"],
      additionalProperties: false,
    },
  },
] as const;

export const ADMIN_RESOURCE_TOOL_NAMES = new Set(ADMIN_RESOURCE_TOOLS.map((tool) => tool.name));
