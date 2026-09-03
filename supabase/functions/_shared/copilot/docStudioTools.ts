// Doc Studio authoring tools for the Portal Copilot.
//
// The point of this module is that producing a billing document is ONE tool
// call. An admin says "prepare a proforma from QTE-0010" and everything the ERP
// already knows — the customer, the letterhead, the bank details, the VAT rate,
// the next document number, the line items, the totals — is resolved here
// rather than asked for. The model supplies intent, not data entry.
//
// Writes go through dispatchAdminResourceTool so there is a single write path
// with a single writable-column allowlist, and so copilot documents are always
// stamped as drafts.

import {
  buildBillingContent,
  billingDocumentName,
  computeBillTotals,
  isDocumentType,
  issuerFromCompanySettings,
  mapLinesToBlRows,
  unresolvedFields,
  type BillingInput,
  type DocumentType,
} from "./docStudioContent.ts";
import { dispatchAdminResourceTool } from "./adminResources.ts";

// deno-lint-ignore no-explicit-any
type Db = any;
// deno-lint-ignore no-explicit-any
type Loose = Record<string, any>;

const DOC_STUDIO_PATH = "/admin/docs/studio";
export const deepLinkFor = (id: string) => `${DOC_STUDIO_PATH}?billingDocument=${id}`;

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const today = () => new Date().toISOString().slice(0, 10);

export const DOC_STUDIO_TOOLS = [
  {
    name: "docstudio_create_document",
    description:
      "Create a Doc Studio billing document (invoice, quote, pro forma or receipt) in one step. Resolves the customer, the company letterhead and bank details, the VAT rate, the next document number and the line totals for you — do NOT look those up separately, do NOT invent a document number, and do NOT calculate totals yourself. Give it a sourceRef (a quote or order number such as QTE-0010, or a document id) to convert an existing document, and/or explicit lines. The document is created as a draft and the tool returns a link the admin opens in Doc Studio to review it. Converting the same source twice returns the existing draft rather than creating a duplicate.",
    input_schema: {
      type: "object",
      properties: {
        documentType: { type: "string", enum: ["invoice", "quote", "proforma", "receipt"], description: "What kind of document to produce." },
        sourceRef: { type: "string", description: "Optional source to convert from: a quote number (QTE-0010), a Doc Studio document number, or a uuid of a quote, order or Doc Studio document." },
        customerRef: { type: "string", description: "Optional customer name or account number, if not implied by the source." },
        lines: {
          type: "array",
          description: "Optional explicit line items. Only supply these when the admin gave them; otherwise they come from the source document.",
          items: {
            type: "object",
            properties: {
              code: { type: "string", description: "Product or SKU code." },
              desc: { type: "string", description: "Line description." },
              qty: { type: ["string", "number"], description: "Quantity." },
              unit: { type: ["string", "number"], description: "Unit price, excluding VAT." },
              taxable: { type: "boolean", description: "Whether the line attracts VAT. Defaults to true." },
            },
            additionalProperties: false,
          },
        },
        notes: { type: "string", description: "Optional notes/terms text. Defaults to the standard wording for the document type." },
        poRef: { type: "string", description: "Optional customer reference or PO number." },
        discount: { type: ["string", "number"], description: "Optional whole-document discount amount." },
        shipping: { type: ["string", "number"], description: "Optional shipping amount." },
        vatEnabled: { type: "boolean", description: "Override whether VAT applies. Defaults to the company setting." },
        dueDate: { type: "string", description: "Optional due / valid-until date (YYYY-MM-DD). Defaults to the configured payment terms." },
      },
      required: ["documentType"],
      additionalProperties: false,
    },
  },
  {
    name: "docstudio_update_document",
    description:
      "Amend an existing Doc Studio billing document — change or add lines, adjust the discount, shipping, notes or dates. Totals are recomputed for you. Use this instead of admin_update_record for billing documents, so the content JSON keeps the exact shape Doc Studio expects.",
    input_schema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "The document's id (uuid), or its number such as PRF-0001." },
        lines: { type: "array", description: "Replacement line items. Omit to leave the lines untouched.", items: { type: "object", additionalProperties: true } },
        notes: { type: "string" },
        discount: { type: ["string", "number"] },
        shipping: { type: ["string", "number"] },
        dueDate: { type: "string" },
        status: { type: "string", enum: ["draft", "saved"], description: "Optional status change. A document is only ever marked sent by actually sending it." },
      },
      required: ["documentId"],
      additionalProperties: false,
    },
  },
  {
    name: "docstudio_get_document",
    description:
      "Read back a Doc Studio billing document by number (PRF-0001) or id, including its line items and totals, without the admin having to open Doc Studio.",
    input_schema: {
      type: "object",
      properties: { documentId: { type: "string", description: "Document number or uuid." } },
      required: ["documentId"],
      additionalProperties: false,
    },
  },
  {
    name: "docstudio_send_document",
    description:
      "Email a finished Doc Studio billing document to one or more recipients. Sends to internal staff addresses immediately; a send to anyone else becomes an approval card the admin must approve first, because it leaves the building. A document can only be sent once a human has opened it in Doc Studio at least once, because the printable HTML is produced there — the tool will tell you if that step is still outstanding.",
    input_schema: {
      type: "object",
      properties: {
        documentId: { type: "string", description: "Document number (PRF-0001) or uuid." },
        to: { type: "array", items: { type: "string" }, description: "Recipient email addresses." },
        subject: { type: "string", description: "Optional subject. Defaults to the document type and number." },
        message: { type: "string", description: "Optional short covering note placed above the document." },
      },
      required: ["documentId", "to"],
      additionalProperties: false,
    },
  },
  {
    name: "docstudio_resolve_customer",
    description:
      "Look up a billing customer by name or account number, returning the exact name, account number and address Doc Studio should print. Use this when the admin names a customer and you need to confirm which account they mean.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string", description: "Customer name or account number." } },
      required: ["query"],
      additionalProperties: false,
    },
  },
] as const;

export const DOC_STUDIO_TOOL_NAMES = new Set(DOC_STUDIO_TOOLS.map((tool) => tool.name));

// ---------------------------------------------------------------- resolvers

const loadIssuer = async (db: Db) => {
  const { data } = await db.from("company_settings").select("*").limit(1).maybeSingle();
  return issuerFromCompanySettings(data ?? null);
};

const findCustomer = async (db: Db, query: string) => {
  const term = query.trim();
  if (!term) return null;
  const like = `%${term.replace(/[%_,()]/g, "")}%`;
  const { data } = await db
    .from("customers")
    .select("id,name,account_number,address,email,phone")
    .or(`name.ilike.${like},account_number.ilike.${like}`)
    .limit(5);
  const rows: Loose[] = data ?? [];
  if (!rows.length) return null;
  // Prefer an exact account-number or name match over a fuzzy one.
  const exact = rows.find((row) =>
    String(row.account_number ?? "").toLowerCase() === term.toLowerCase() ||
    String(row.name ?? "").toLowerCase() === term.toLowerCase());
  return { match: exact ?? rows[0], ambiguous: !exact && rows.length > 1, candidates: rows };
};

type ResolvedSource = {
  type: "docstudio_billing_document" | "quote" | "order";
  id: string;
  reference: string;
  customer: { name?: string; company?: string; address?: string; account?: string };
  lines: unknown[];
  currency?: string;
  notes?: string;
};

/**
 * Resolves "QTE-0010" or a uuid against the three places a source document can
 * live: a Doc Studio document, a platform quote, or a web order.
 */
const resolveSource = async (db: Db, ref: string): Promise<ResolvedSource | null> => {
  const term = ref.trim();
  if (!term) return null;

  const asDocStudio = await db
    .from("docstudio_billing_documents")
    .select("id,billing_number,document_name,customer_name,customer_company,customer_account,content")
    .or(isUuid(term) ? `id.eq.${term}` : `billing_number.eq.${term}`)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (asDocStudio.data) {
    const row = asDocStudio.data as Loose;
    const content = (row.content ?? {}) as Loose;
    return {
      type: "docstudio_billing_document",
      id: row.id,
      reference: row.billing_number || row.document_name,
      customer: {
        name: row.customer_name ?? content.blToName,
        company: row.customer_company ?? content.blToCompany,
        address: content.blToAddr,
        account: row.customer_account ?? content.selectedBillingCustomer,
      },
      lines: Array.isArray(content.blRows) ? content.blRows : [],
      currency: content.blCurrency,
      notes: content.blNotes,
    };
  }

  const asQuote = await db
    .from("quotes")
    .select("id,quote_number,customer_name,contact_name,currency,notes_customer,account_id")
    .or(isUuid(term) ? `id.eq.${term}` : `quote_number.eq.${term}`)
    .limit(1)
    .maybeSingle();
  if (asQuote.data) {
    const row = asQuote.data as Loose;
    const { data: lines } = await db
      .from("quote_lines")
      .select("id,sku,item_name,description_override,qty,unit_sell_price_bbd,sort_order")
      .eq("quote_id", row.id)
      .order("sort_order", { ascending: true });
    return {
      type: "quote",
      id: row.id,
      reference: row.quote_number,
      customer: { name: row.customer_name || row.contact_name, account: row.account_id ? String(row.account_id) : undefined },
      lines: lines ?? [],
      currency: row.currency,
      notes: row.notes_customer,
    };
  }

  if (isUuid(term)) {
    const asOrder = await db
      .from("orders")
      .select("id,customer_name,contact_email,billing_address")
      .eq("id", term)
      .limit(1)
      .maybeSingle();
    if (asOrder.data) {
      const row = asOrder.data as Loose;
      const { data: items } = await db
        .from("order_items")
        .select("id,sku,product_name,variant_label,quantity,unit_price_snapshot,product_price")
        .eq("order_id", row.id);
      return {
        type: "order",
        id: row.id,
        reference: String(row.id).slice(0, 8),
        customer: { name: row.customer_name, address: row.billing_address },
        lines: (items ?? []).map((item: Loose) => ({
          id: item.id,
          sku: item.sku,
          item_name: [item.product_name, item.variant_label].filter(Boolean).join(" — "),
          qty: item.quantity,
          unit_price: item.unit_price_snapshot ?? item.product_price,
        })),
      };
    }
  }

  return null;
};

const findDocument = async (db: Db, ref: string) => {
  const term = ref.trim();
  const { data } = await db
    .from("docstudio_billing_documents")
    .select("*")
    .or(isUuid(term) ? `id.eq.${term}` : `billing_number.eq.${term}`)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  return (data ?? null) as Loose | null;
};

// -------------------------------------------------------------- the handoff

const createDocument = async (db: Db, input: Loose, actorUserId: string) => {
  const documentType = input.documentType as DocumentType;
  if (!isDocumentType(documentType)) {
    throw new Error(`Unknown document type: ${input.documentType}. Use invoice, quote, proforma or receipt.`);
  }

  const source = input.sourceRef ? await resolveSource(db, String(input.sourceRef)) : null;
  if (input.sourceRef && !source) {
    throw new Error(`Could not find a quote, order or Doc Studio document matching "${input.sourceRef}".`);
  }

  // Idempotent conversion: asking twice returns the draft that already exists.
  if (source) {
    const { data: existing } = await db
      .from("docstudio_billing_documents")
      .select("id,billing_number,document_name,totals,status")
      .eq("source_document_type", source.type)
      .eq("source_document_id", source.id)
      .eq("document_type", documentType)
      .eq("created_by_copilot", true)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return {
        status: "already_exists",
        documentId: existing.id,
        billingNumber: existing.billing_number,
        documentName: existing.document_name,
        totals: existing.totals,
        deepLink: deepLinkFor(existing.id),
        note: `A ${documentType} was already created from ${source.reference}. Returning it rather than making a duplicate.`,
      };
    }
  }

  const issuer = await loadIssuer(db);

  let customer = source?.customer ?? {};
  let ambiguousCustomer: Loose[] | null = null;
  const customerQuery = input.customerRef ? String(input.customerRef) : (customer.name ?? "");
  if (customerQuery) {
    const found = await findCustomer(db, customerQuery);
    if (found) {
      customer = {
        name: found.match.name ?? customer.name,
        company: customer.company ?? found.match.name,
        address: found.match.address ?? customer.address,
        account: found.match.account_number ?? customer.account,
      };
      if (found.ambiguous) ambiguousCustomer = found.candidates;
    }
  }

  const lines = Array.isArray(input.lines) && input.lines.length
    ? input.lines
    : (source?.lines ?? []);

  const { data: numberData, error: numberError } = await db.rpc("next_billing_number", { p_document_type: documentType });
  if (numberError) throw new Error(`Could not issue a document number: ${numberError.message}`);
  const billingNumber = String(numberData ?? "");

  const billingInput: BillingInput = {
    documentType,
    billingNumber,
    date: today(),
    dueDate: input.dueDate ? String(input.dueDate) : undefined,
    poRef: input.poRef ? String(input.poRef) : source?.reference,
    customer,
    lines: mapLinesToBlRows(lines),
    currency: source?.currency,
    vatEnabled: typeof input.vatEnabled === "boolean" ? input.vatEnabled : undefined,
    discount: input.discount,
    shipping: input.shipping,
    notes: input.notes ? String(input.notes) : undefined,
  };

  const content = buildBillingContent(billingInput, issuer, today());
  const totals = computeBillTotals(content);

  const result = await dispatchAdminResourceTool(db, "admin_create_record", {
    resource: "docstudio_billing_documents",
    values: {
      document_name: billingDocumentName(content),
      document_type: documentType,
      billing_number: billingNumber,
      customer_name: content.blToName,
      customer_company: content.blToCompany,
      customer_account: content.selectedBillingCustomer,
      paper_size: content.billPaperSize,
      content,
      totals,
      ...(source ? { source_document_type: source.type, source_document_id: source.id } : {}),
    },
    // docstudio_billing_documents is not a financial-data resource; the access
    // object is passed explicitly so the dispatcher signature stays enforced.
  }, actorUserId, { canAccessFinancialData: false });

  const created = Array.isArray(result.data) ? result.data[0] : result.data;
  const documentId = (created as Loose)?.id;

  return {
    status: "created",
    documentId,
    billingNumber,
    documentName: billingDocumentName(content),
    totals,
    deepLink: documentId ? deepLinkFor(documentId) : null,
    convertedFrom: source ? { type: source.type, reference: source.reference } : null,
    unresolved: unresolvedFields(content),
    ambiguousCustomer: ambiguousCustomer?.map((row) => ({ name: row.name, account: row.account_number })) ?? null,
  };
};

const updateDocument = async (db: Db, input: Loose, actorUserId: string) => {
  const current = await findDocument(db, String(input.documentId ?? ""));
  if (!current) throw new Error(`No Doc Studio document matching "${input.documentId}".`);

  const content: Loose = { ...(current.content ?? {}) };
  if (Array.isArray(input.lines) && input.lines.length) content.blRows = mapLinesToBlRows(input.lines);
  if (input.notes !== undefined) content.blNotes = String(input.notes);
  if (input.discount !== undefined) content.blDiscount = String(input.discount);
  if (input.shipping !== undefined) content.blShipping = String(input.shipping);
  if (input.dueDate !== undefined) content.blDue = String(input.dueDate);

  const totals = computeBillTotals(content);

  await dispatchAdminResourceTool(db, "admin_update_record", {
    resource: "docstudio_billing_documents",
    id: current.id,
    values: {
      content,
      totals,
      document_name: billingDocumentName(content),
      ...(input.status === "draft" || input.status === "saved" ? { status: input.status } : {}),
    },
  }, actorUserId, { canAccessFinancialData: false });

  return {
    status: "updated",
    documentId: current.id,
    billingNumber: current.billing_number,
    totals,
    deepLink: deepLinkFor(current.id),
    unresolved: unresolvedFields(content),
  };
};

const getDocument = async (db: Db, input: Loose) => {
  const row = await findDocument(db, String(input.documentId ?? ""));
  if (!row) throw new Error(`No Doc Studio document matching "${input.documentId}".`);
  const content = (row.content ?? {}) as Loose;
  return {
    documentId: row.id,
    documentType: row.document_type,
    documentName: row.document_name,
    billingNumber: row.billing_number,
    status: row.status,
    createdByCopilot: row.created_by_copilot,
    convertedFrom: row.source_document_type ? { type: row.source_document_type, id: row.source_document_id } : null,
    customer: { name: content.blToName, company: content.blToCompany, address: content.blToAddr, account: content.selectedBillingCustomer },
    date: content.blDate,
    dueDate: content.blDue,
    currency: content.blCurrency,
    lines: content.blRows ?? [],
    totals: row.totals,
    deepLink: deepLinkFor(row.id),
  };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sending a document is the only Doc Studio action that reaches a customer, so
 * it is the only one that does not execute on the model's say-so.
 *
 * Two gates, for two different reasons:
 *   - the printable HTML is produced by the studio in the browser, so a draft
 *     nobody has opened has nothing to send. That is a fact about the data, not
 *     a policy, and no amount of approving changes it.
 *   - anything going to a non-staff address becomes an approval card.
 */
const sendDocument = async (db: Db, input: Loose, actorUserId: string, deps: DocStudioDeps) => {
  const document = await findDocument(db, String(input.documentId ?? ""));
  if (!document) throw new Error(`No Doc Studio document matching "${input.documentId}".`);

  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
  if (!recipients.length) throw new Error("At least one recipient email address is required.");
  const invalid = recipients.filter((email) => !EMAIL_RE.test(email));
  if (invalid.length) throw new Error(`Not valid email addresses: ${invalid.join(", ")}`);

  const html = String(document.rendered_html ?? "");
  if (!html.trim()) {
    return {
      status: "blocked",
      reason: "not_rendered",
      documentId: document.id,
      deepLink: deepLinkFor(document.id),
      message:
        `${document.billing_number || document.document_name} has never been opened in Doc Studio, so its printable version does not exist yet and there is nothing to attach. Open it once at the link below — it renders and saves automatically — then ask me to send it again.`,
    };
  }

  const subject = String(input.subject ?? "").trim() ||
    `${(document.document_type ?? "document").replace(/^./, (c: string) => c.toUpperCase())} ${document.billing_number ?? ""}`.trim();
  const note = String(input.message ?? "").trim();
  const body = note ? `<p>${note.replace(/</g, "&lt;")}</p>${html}` : html;

  // A recipient is internal if it belongs to a staff profile. Everyone else is
  // treated as a customer, whatever the domain looks like.
  const { data: staff } = await db
    .from("profiles")
    .select("email")
    .in("email", recipients);
  const internal = new Set((staff ?? []).map((row: Loose) => String(row.email ?? "").toLowerCase()));
  const external = recipients.filter((email) => !internal.has(email.toLowerCase()));

  if (!external.length && deps.sendEmail) {
    const sent = await deps.sendEmail({ to: recipients, subject, html: body });
    return {
      status: "sent",
      documentId: document.id,
      recipients,
      subject,
      note: "All recipients are internal staff, so this went out immediately without an approval card.",
      messageIds: sent.messageIds ?? [],
    };
  }

  const { data: run, error: runError } = await db.from("copilot_runs").insert({
    workflow: "docstudio_send",
    status: "prepared",
    source_system: "docstudio",
    source_snapshot_at: new Date().toISOString(),
    summary: { documentId: document.id, billingNumber: document.billing_number, recipients: recipients.length },
    requested_by: actorUserId,
  }).select("id").single();
  if (runError) throw new Error(`Could not prepare the send for approval: ${runError.message}`);

  const { data: action, error: actionError } = await db.from("copilot_actions").insert({
    run_id: run.id,
    action_type: "send_docstudio_email",
    risk_level: 3,
    status: "pending_approval",
    title: `Send ${document.billing_number || document.document_name}`,
    summary: `Email ${document.document_type} ${document.billing_number ?? ""} to ${recipients.join(", ")}`.trim(),
    payload: { documentId: document.id, recipients, subject, body },
    idempotency_key: `${run.id}:send_docstudio_email:${document.id}`,
  }).select("id").single();
  if (actionError) throw new Error(`Could not prepare the send for approval: ${actionError.message}`);

  return {
    status: "needs_approval",
    actionId: action.id,
    runId: run.id,
    documentId: document.id,
    recipients,
    external,
    subject,
    message:
      `This send goes to ${external.join(", ")}, outside the business, so it is waiting for your approval. Review and approve it in the Copilot panel and it will go out.`,
  };
};

export type DocStudioDeps = {
  /** Injected by the caller, which owns the request context the mailer needs. */
  sendEmail?: (payload: { to: string[]; subject: string; html: string }) => Promise<{ messageIds?: string[] }>;
};

export const dispatchDocStudioTool = async (
  db: Db,
  name: string,
  input: Record<string, unknown>,
  actorUserId: string,
  deps: DocStudioDeps = {},
) => {
  switch (name) {
    case "docstudio_send_document":
      return sendDocument(db, input, actorUserId, deps);
    case "docstudio_create_document":
      return createDocument(db, input, actorUserId);
    case "docstudio_update_document":
      return updateDocument(db, input, actorUserId);
    case "docstudio_get_document":
      return getDocument(db, input);
    case "docstudio_resolve_customer": {
      const query = typeof input.query === "string" ? input.query.trim() : "";
      if (!query) throw new Error("A customer name or account number is required.");
      const found = await findCustomer(db, query);
      if (!found) return { matches: [] };
      return {
        matches: found.candidates.map((row) => ({
          name: row.name,
          account: row.account_number,
          address: row.address,
          email: row.email,
        })),
        ambiguous: found.ambiguous,
      };
    }
    default:
      throw new Error(`Unknown Doc Studio tool: ${name}`);
  }
};
