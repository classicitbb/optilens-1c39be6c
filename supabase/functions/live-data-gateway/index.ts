import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { requireAuthenticatedUser } from "../_shared/http/auth.ts";
import {
  createCorsPolicy,
  getCorsHeaders,
  handleCorsPreflight,
  rejectDisallowedOrigin,
} from "../_shared/http/cors.ts";

const VERSION = "2026-07-14.1";
const REQUEST_TTL_MS = 30_000;
const AGENT_ONLINE_MS = 12_000;
const MAX_RESPONSE_BYTES = 1_000_000;
const AGENT_SCOPES = new Set(["gateway:agent", "customers:write", "contacts:write"]);

const OPERATIONS = {
  "innovations.customer_account": { source: "innovations", feature: "statements" },
  "innovations.customer_statement": { source: "innovations", feature: "statements" },
  "innovations.customer_orders": { source: "innovations", feature: "private-orders" },
  "optilens.customer_deliveries": { source: "optilens", feature: "private-orders" },
} as const;

type Operation = keyof typeof OPERATIONS;
type JsonObject = Record<string, unknown>;

type CustomerMapping = {
  id: number;
  account_number: string | null;
  innovations_customer_id: number | null;
};

type PortalProfile = {
  crm_customer_id: number | null;
  crm_contact_id: string | null;
  portal_access_status: string | null;
};

const corsPolicy = createCorsPolicy({
  allowHeaders:
    "authorization, x-client-info, apikey, content-type, x-api-key, x-request-id, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  allowMethods: "POST, OPTIONS",
});

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req, corsPolicy), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function isObject(value: unknown): value is JsonObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function integer(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function dateOnly(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function sanitizeArguments(operation: Operation, raw: unknown): JsonObject {
  const input = isObject(raw) ? raw : {};
  if (operation === "innovations.customer_statement") {
    const statementId = integer(input.statement_id);
    if (!statementId) throw new Error("statement_id must be a positive integer.");
    return { statement_id: statementId };
  }

  if (operation === "innovations.customer_orders") {
    const fromDate = dateOnly(input.from_date);
    const toDate = dateOnly(input.to_date);
    return {
      ...(fromDate ? { from_date: fromDate } : {}),
      ...(toDate ? { to_date: toDate } : {}),
      ...(input.status_scope === "active" ? { status_scope: "active" } : {}),
    };
  }

  if (operation === "optilens.customer_deliveries") {
    const fromDate = dateOnly(input.from_date);
    const toDate = dateOnly(input.to_date);
    const closedSince = dateOnly(input.closed_since);
    return {
      ...(fromDate ? { from_date: fromDate } : {}),
      ...(toDate ? { to_date: toDate } : {}),
      ...(input.include_open === true ? { include_open: true } : {}),
      ...(closedSince ? { closed_since: closedSince } : {}),
    };
  }

  return {};
}

function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticateAgent(req: Request, supabase: SupabaseClient) {
  const token = req.headers.get("x-api-key")?.trim() ?? "";
  if (!token) return { response: json(req, { error: "Missing x-api-key header." }, 401) };
  const { data, error } = await supabase.rpc("verify_api_key", { p_token: token });
  if (error) return { response: json(req, { error: "Agent authentication failed.", detail: error.message }, 500) };
  const key = Array.isArray(data) ? data[0] : data;
  if (!key) return { response: json(req, { error: "Invalid or revoked API key." }, 401) };
  const scopes: string[] = Array.isArray(key.scopes) ? key.scopes : [];
  if (!scopes.some((scope) => AGENT_SCOPES.has(scope))) {
    return { response: json(req, { error: "Missing required scope: gateway:agent" }, 403) };
  }
  return { key };
}

async function cleanup(supabase: SupabaseClient) {
  const now = new Date().toISOString();
  await supabase
    .from("live_data_gateway_requests")
    .update({
      status: "expired",
      error_code: "request_expired",
      error_message: "The live source did not answer before the request expired.",
      completed_at: now,
    })
    .in("status", ["pending", "claimed"])
    .lte("expires_at", now);
  await supabase.from("live_data_gateway_requests").delete().lte("purge_after", now);
}

function statementPayload(row: JsonObject): JsonObject {
  return {
    id: row.innovations_statement_id ?? row.id,
    account_number: row.account_number ?? null,
    statement_date: row.statement_date ?? null,
    period_start: row.from_date ?? null,
    period_end: row.to_date ?? null,
    volume_discount: row.volume_discount ?? null,
    opening_balance: row.opening_balance ?? null,
    transactions: row.transactions ?? null,
    closing_balance: row.closing_balance ?? null,
    payments: row.payments ?? null,
    finance_charges: row.finance_charges ?? null,
    discount: row.discount ?? null,
    allowance: row.allowance ?? null,
    discounts_allowance: Number(row.discount ?? 0) + Number(row.allowance ?? 0),
    aging_amount_1: row.aging_amount_1 ?? null,
    aging_amount_2: row.aging_amount_2 ?? null,
    aging_amount_3: row.aging_amount_3 ?? null,
    aging_amount_4: row.aging_amount_4 ?? null,
    due_date: row.due_date ?? null,
    status: row.status ?? null,
    void: row.void ?? null,
    printed: row.printed ?? null,
  };
}

function statementLinePayload(row: JsonObject): JsonObject {
  return {
    id: row.id ?? null,
    statement_id: row.innovations_statement_id ?? row.statement_id ?? null,
    account_number: row.account_number ?? null,
    order_type_name: row.order_type_name ?? null,
    invoice_id: row.invoice_id ?? null,
    order_id: row.order_id ?? null,
    reference: row.reference ?? null,
    patient: row.patient ?? null,
    payment_method: row.payment_method ?? null,
    post_date: row.post_date ?? null,
    amount: row.amount ?? null,
  };
}

async function cachedStatements(supabase: SupabaseClient, customer: CustomerMapping) {
  const select = "id,innovations_statement_id,account_number,statement_date,from_date,to_date,volume_discount,opening_balance,transactions,closing_balance,payments,finance_charges,discount,allowance,aging_amount_1,aging_amount_2,aging_amount_3,aging_amount_4,due_date,status,void,printed,synced_at";
  const query = (column: string, value: string | number) => supabase
    .from("statements")
    .select(select)
    .eq(column, value)
    .order("statement_date", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(24);

  const attempts: Array<[string, string | number | null]> = [
    ["customer_id", customer.id],
    ["innovations_customer_id", customer.innovations_customer_id],
    ["account_number", customer.account_number],
  ];

  for (const [column, value] of attempts) {
    if (value === null || value === "") continue;
    const { data, error } = await query(column, value);
    if (!error && data && data.length > 0) return data as JsonObject[];
  }
  return [];
}

async function cachedBalance(supabase: SupabaseClient, customer: CustomerMapping) {
  const select = "account_number,credit_limit,current_balance,last_payment_amount,last_payment_date,last_statement_amount,last_statement_date,synced_at";
  const attempts: Array<[string, string | number | null]> = [
    ["customer_id", customer.id],
    ["innovations_customer_id", customer.innovations_customer_id],
    ["account_number", customer.account_number],
  ];

  for (const [column, value] of attempts) {
    if (value === null || value === "") continue;
    const { data, error } = await supabase
      .from("balances")
      .select(select)
      .eq(column, value)
      .order("synced_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    if (!error && data) return data as JsonObject;
  }
  return null;
}

function hasLiveCustomerLink(customer: CustomerMapping | null): customer is CustomerMapping {
  return !!customer && (!!customer.account_number || !!customer.innovations_customer_id);
}

async function customerById(supabase: SupabaseClient, id: number | null) {
  if (!id) return null;
  const { data } = await supabase
    .from("customers")
    .select("id,account_number,innovations_customer_id")
    .eq("id", id)
    .maybeSingle();
  return data as CustomerMapping | null;
}

async function customerByInnovationsId(supabase: SupabaseClient, innovationsCustomerId: number | null) {
  if (!innovationsCustomerId) return null;
  const { data } = await supabase
    .from("customers")
    .select("id,account_number,innovations_customer_id")
    .eq("innovations_customer_id", innovationsCustomerId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data as CustomerMapping | null;
}

async function customerByContactId(supabase: SupabaseClient, contactId: string | null) {
  if (!contactId) return null;
  const { data } = await supabase
    .from("customers")
    .select("id,account_number,innovations_customer_id")
    .eq("contact_id", contactId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data as CustomerMapping | null;
}

async function mappedCustomerFromPortalContact(supabase: SupabaseClient, contactId: string | null) {
  if (!contactId) return null;
  const { data: contact } = await supabase
    .from("contacts")
    .select("parent_id,linked_customer_id,innovations_parent_customer_id")
    .eq("id", contactId)
    .maybeSingle();
  const contactMapping = contact as { parent_id?: unknown; linked_customer_id?: unknown; innovations_parent_customer_id?: unknown } | null;
  const linkedCustomer = await customerById(supabase, integer(contactMapping?.linked_customer_id));
  if (hasLiveCustomerLink(linkedCustomer)) return linkedCustomer;
  const innovationsCustomer = await customerByInnovationsId(supabase, integer(contactMapping?.innovations_parent_customer_id));
  if (hasLiveCustomerLink(innovationsCustomer)) return innovationsCustomer;

  if (typeof contactMapping?.parent_id !== "string") {
    const contactCustomer = await customerByContactId(supabase, contactId);
    return hasLiveCustomerLink(contactCustomer) ? contactCustomer : null;
  }
  const { data: parent } = await supabase
    .from("contacts")
    .select("id,linked_customer_id,innovations_parent_customer_id")
    .eq("id", contactMapping.parent_id)
    .maybeSingle();
  const parentMapping = parent as { id?: unknown; linked_customer_id?: unknown; innovations_parent_customer_id?: unknown } | null;
  const parentLinkedCustomer = await customerById(supabase, integer(parentMapping?.linked_customer_id));
  if (hasLiveCustomerLink(parentLinkedCustomer)) return parentLinkedCustomer;
  const parentInnovationsCustomer = await customerByInnovationsId(supabase, integer(parentMapping?.innovations_parent_customer_id));
  if (hasLiveCustomerLink(parentInnovationsCustomer)) return parentInnovationsCustomer;
  const parentContactCustomer = typeof parentMapping?.id === "string"
    ? await customerByContactId(supabase, parentMapping.id)
    : null;
  if (hasLiveCustomerLink(parentContactCustomer)) return parentContactCustomer;
  const contactCustomer = await customerByContactId(supabase, contactId);
  return hasLiveCustomerLink(contactCustomer) ? contactCustomer : null;
}

async function cachedLiveDataResponse(
  supabase: SupabaseClient,
  operation: Operation,
  customer: CustomerMapping,
  argumentsBody: JsonObject,
) {
  if (operation === "innovations.customer_account") {
    const [balance, statements] = await Promise.all([
      cachedBalance(supabase, customer),
      cachedStatements(supabase, customer),
    ]);
    if (!balance && statements.length === 0) return null;
    return {
      customer: { name: null, account_number: customer.account_number ?? balance?.account_number ?? null },
      balance,
      statements: statements.map(statementPayload),
      retrieved_at: new Date().toISOString(),
      source_status: "cached",
    };
  }

  if (operation === "innovations.customer_statement") {
    const statementId = integer(argumentsBody.statement_id);
    if (!statementId) return null;
    const { data: statement } = await supabase
      .from("statements")
      .select("id,customer_id,innovations_customer_id,innovations_statement_id,account_number,statement_date,from_date,to_date,volume_discount,opening_balance,transactions,closing_balance,payments,finance_charges,discount,allowance,aging_amount_1,aging_amount_2,aging_amount_3,aging_amount_4,due_date,status,void,printed,synced_at")
      .eq("innovations_statement_id", statementId)
      .maybeSingle();
    if (!statement) return null;
    const statementRow = statement as JsonObject;
    const belongsToCustomer =
      statementRow.customer_id === customer.id ||
      statementRow.innovations_customer_id === customer.innovations_customer_id ||
      (!!statementRow.account_number && statementRow.account_number === customer.account_number);
    if (!belongsToCustomer) return null;
    const { data: lines } = await supabase
      .from("statement_lines")
      .select("id,innovations_statement_id,order_type,order_type_name,invoice_id,order_id,reference,patient,payment_method,post_date,amount")
      .eq("innovations_statement_id", statementId)
      .order("post_date", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });
    return {
      statement: statementPayload(statementRow),
      lines: (lines ?? []).map((line) => statementLinePayload(line as JsonObject)),
      retrieved_at: new Date().toISOString(),
      source_status: "cached",
    };
  }

  return null;
}

function offlineLiveDataResponse(operation: Operation, customer: CustomerMapping) {
  const base = {
    retrieved_at: new Date().toISOString(),
    source_status: "offline",
    fallback: true,
    error: "The private live-data connector is offline.",
  };

  if (operation === "optilens.customer_deliveries") {
    return { ...base, deliveries: [] };
  }

  if (operation === "innovations.customer_orders") {
    return { ...base, orders: [] };
  }

  if (operation === "innovations.customer_account") {
    return {
      ...base,
      customer: { name: null, account_number: customer.account_number ?? null },
      balance: null,
      statements: [],
    };
  }

  if (operation === "innovations.customer_statement") {
    return { ...base, statement: null, lines: [] };
  }

  return null;
}

function isFallbackableSourceFailure(code: unknown, message: unknown) {
  const normalizedCode = typeof code === "string" ? code.toUpperCase() : "";
  const normalizedMessage = typeof message === "string" ? message.toLowerCase() : "";
  return (
    normalizedCode === "ELOGIN" ||
    normalizedCode === "ETIMEOUT" ||
    normalizedCode === "ESOCKET" ||
    normalizedCode === "ECONNRESET" ||
    normalizedCode === "SOURCE_ERROR" ||
    normalizedMessage.includes("login failed") ||
    normalizedMessage.includes("password of the account has expired") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("connection")
  );
}

function customerFromRequestRow(row: { website_customer_id?: unknown; target?: unknown }): CustomerMapping {
  const target = isObject(row.target) ? row.target : {};
  return {
    id: integer(row.website_customer_id) ?? 0,
    account_number: typeof target.account_number === "string" && target.account_number.trim()
      ? target.account_number.trim()
      : null,
    innovations_customer_id: integer(target.innovations_customer_id),
  };
}

async function fallbackForFailedRequest(
  supabase: SupabaseClient,
  operation: Operation,
  row: { website_customer_id?: unknown; target?: unknown; arguments?: unknown; error_code?: unknown; error_message?: unknown },
) {
  const customer = customerFromRequestRow(row);
  const argumentsBody = isObject(row.arguments) ? row.arguments : {};
  const cached = await cachedLiveDataResponse(supabase, operation, customer, argumentsBody);
  const fallback = cached
    ? { ...cached, fallback: true, source_status: "cached" }
    : offlineLiveDataResponse(operation, customer);
  if (!fallback) return null;
  return {
    ...fallback,
    source_error: {
      code: typeof row.error_code === "string" ? row.error_code : "source_error",
      message: typeof row.error_message === "string" ? row.error_message : "The private source request failed.",
    },
  };
}

async function clientContext(req: Request) {
  const auth = await requireAuthenticatedUser(req, getCorsHeaders(req, corsPolicy));
  if (auth instanceof Response) return { response: auth };

  const { data: roles } = await auth.supabaseAdminClient.from("user_roles").select("role").eq("user_id", auth.user.id);
  const isStaff = (roles ?? []).some((row: { role: string }) => ["admin", "editor", "author"].includes(row.role));

  let profile: PortalProfile | null = null;
  if (!isStaff) {
    const { data: syncedIdentity } = await auth.supabaseAdminClient.rpc("sync_customer_portal_identity", { p_user_id: auth.user.id });
    const syncedRow = Array.isArray(syncedIdentity) ? syncedIdentity[0] : syncedIdentity;
    if (syncedRow) {
      profile = {
        crm_customer_id: integer(syncedRow.crm_customer_id),
        crm_contact_id: typeof syncedRow.crm_contact_id === "string" ? syncedRow.crm_contact_id : null,
        portal_access_status: typeof syncedRow.portal_access_status === "string" ? syncedRow.portal_access_status : null,
      };
    }
  }

  if (!profile) {
    const { data, error: profileError } = await auth.supabaseAdminClient
      .from("profiles")
      .select("crm_customer_id,crm_contact_id,portal_access_status")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (profileError) return { response: json(req, { error: "Could not resolve portal identity." }, 500) };
    profile = data as PortalProfile | null;
  }

  return { auth, profile, isStaff };
}

async function handleClientRequest(req: Request, body: JsonObject) {
  const context = await clientContext(req);
  if (context.response) return context.response;
  const { auth, profile, isStaff } = context;
  const operation = typeof body.operation === "string" ? body.operation as Operation : "" as Operation;
  const config = OPERATIONS[operation];
  if (!config) return json(req, { error: "Unsupported live-data operation." }, 400);

  let argumentsBody: JsonObject;
  try {
    argumentsBody = sanitizeArguments(operation, body.arguments);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : "Invalid arguments." }, 400);
  }

  const requestedCustomerId = isStaff ? integer(body.website_customer_id) : null;
  const websiteCustomerId = requestedCustomerId ?? integer(profile?.crm_customer_id);
  if (!websiteCustomerId) {
    const offline = offlineLiveDataResponse(operation, { id: 0, account_number: null, innovations_customer_id: null } as CustomerMapping);
    if (offline) return json(req, { ...offline, source_status: "unlinked", error: "No approved customer account is linked to this user." }, 200);
    return json(req, { error: "No approved customer account is linked to this user." }, 403);
  }

  if (!isStaff) {
    const { data: override } = await auth.supabaseAdminClient
      .from("customer_portal_feature_overrides")
      .select("enabled")
      .eq("user_id", auth.user.id)
      .eq("feature_key", config.feature)
      .maybeSingle();
    if (override?.enabled === false || (override?.enabled !== true && profile?.portal_access_status !== "approved_customer")) {
      return json(req, { error: "This live-data feature is not enabled for the customer account." }, 403);
    }
  }

  const { data: customer, error: customerError } = await auth.supabaseAdminClient
    .from("customers")
    .select("id,account_number,innovations_customer_id")
    .eq("id", websiteCustomerId)
    .maybeSingle();
  if (customerError || !customer) return json(req, { error: "Customer account mapping was not found." }, 404);

  let resolvedCustomer = customer as CustomerMapping;
  let resolvedWebsiteCustomerId = websiteCustomerId;
  if (!isStaff) {
    const mappedCustomer = await mappedCustomerFromPortalContact(auth.supabaseAdminClient, profile?.crm_contact_id ?? null);
    if (hasLiveCustomerLink(mappedCustomer) && mappedCustomer.id !== resolvedCustomer.id) {
      resolvedCustomer = mappedCustomer;
      resolvedWebsiteCustomerId = mappedCustomer.id;
      await auth.supabaseAdminClient.from("profiles").update({ crm_customer_id: mappedCustomer.id }).eq("user_id", auth.user.id);
    }
  }

  if (!hasLiveCustomerLink(resolvedCustomer)) {
    const offline = offlineLiveDataResponse(operation, resolvedCustomer);
    if (offline) return json(req, { ...offline, source_status: "unlinked", error: "Customer account is not linked to Innovations or OptiLens Local." }, 200);
    return json(req, { error: "Customer account is not linked to Innovations or OptiLens Local." }, 409);
  }

  await cleanup(auth.supabaseAdminClient);
  const onlineAfter = new Date(Date.now() - AGENT_ONLINE_MS).toISOString();
  const { data: agents } = await auth.supabaseAdminClient
    .from("live_data_gateway_agents")
    .select("capabilities,last_seen_at")
    .gte("last_seen_at", onlineAfter);
  const hasAgent = (agents ?? []).some((agent: { capabilities?: string[] }) =>
    Array.isArray(agent.capabilities) && agent.capabilities.includes(operation)
  );
  if (!hasAgent) {
    const cached = await cachedLiveDataResponse(auth.supabaseAdminClient, operation, resolvedCustomer, argumentsBody);
    if (cached) return json(req, cached, 200);
    const offline = offlineLiveDataResponse(operation, resolvedCustomer);
    if (offline) return json(req, offline, 200);
    return json(req, { error: "The private live-data connector is offline." }, 503);
  }

  const now = Date.now();
  const { data: requestRow, error: insertError } = await auth.supabaseAdminClient
    .from("live_data_gateway_requests")
    .insert({
      requested_by: auth.user.id,
      website_customer_id: resolvedWebsiteCustomerId,
      source: config.source,
      operation,
      target: {
        website_customer_id: resolvedWebsiteCustomerId,
        innovations_customer_id: resolvedCustomer.innovations_customer_id ?? null,
        account_number: resolvedCustomer.account_number ?? null,
      },
      arguments: argumentsBody,
      expires_at: new Date(now + REQUEST_TTL_MS).toISOString(),
      purge_after: new Date(now + 5 * 60_000).toISOString(),
    })
    .select("id,status,requested_at,expires_at")
    .single();
  if (insertError) return json(req, { error: "Could not queue the live-data request.", detail: insertError.message }, 500);
  return json(req, { request_id: requestRow.id, status: requestRow.status, expires_at: requestRow.expires_at, poll_after_ms: 500 }, 202);
}

async function handleClientStatus(req: Request, body: JsonObject) {
  const context = await clientContext(req);
  if (context.response) return context.response;
  const { auth } = context;
  const requestId = typeof body.request_id === "string" ? body.request_id : "";
  if (!requestId) return json(req, { error: "request_id is required." }, 400);
  await cleanup(auth.supabaseAdminClient);

  const { data: row, error } = await auth.supabaseAdminClient
    .from("live_data_gateway_requests")
    .select("id,status,operation,website_customer_id,target,arguments,response_payload,error_code,error_message,requested_at,completed_at,expires_at")
    .eq("id", requestId)
    .eq("requested_by", auth.user.id)
    .maybeSingle();
  if (error || !row) return json(req, { error: "Live-data request was not found." }, 404);
  if (row.status === "completed") {
    await auth.supabaseAdminClient.from("live_data_gateway_requests").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    return json(req, {
      request_id: row.id,
      status: row.status,
      operation: row.operation,
      retrieved_at: row.completed_at,
      data: row.response_payload,
    });
  }
  if (row.status === "failed") {
    const operation = typeof row.operation === "string" && row.operation in OPERATIONS ? row.operation as Operation : null;
    if (operation && isFallbackableSourceFailure(row.error_code, row.error_message)) {
      const fallback = await fallbackForFailedRequest(auth.supabaseAdminClient, operation, row);
      if (fallback) {
        await auth.supabaseAdminClient.from("live_data_gateway_requests").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
        return json(req, {
          request_id: row.id,
          status: "completed",
          operation,
          retrieved_at: row.completed_at ?? new Date().toISOString(),
          data: fallback,
        });
      }
    }
    return json(req, { request_id: row.id, status: row.status, error: row.error_message, code: row.error_code }, 200);
  }
  if (row.status === "expired") return json(req, { request_id: row.id, status: row.status, error: row.error_message, code: row.error_code }, 504);
  return json(req, { request_id: row.id, status: row.status, expires_at: row.expires_at, poll_after_ms: 500 }, 202);
}

async function handleAgent(req: Request, action: string, body: JsonObject) {
  const supabase = adminClient();
  const agentAuth = await authenticateAgent(req, supabase);
  if (agentAuth.response) return agentAuth.response;
  const key = agentAuth.key;
  await cleanup(supabase);

  if (action === "agent.heartbeat") {
    const capabilities = Array.isArray(body.capabilities)
      ? body.capabilities.filter((value): value is Operation => typeof value === "string" && value in OPERATIONS)
      : [];
    const { error } = await supabase.from("live_data_gateway_agents").upsert({
      api_key_id: key.id,
      agent_name: typeof body.agent_name === "string" ? body.agent_name.slice(0, 100) : "OptiLens Local",
      agent_version: typeof body.agent_version === "string" ? body.agent_version.slice(0, 60) : null,
      capabilities,
      last_seen_at: new Date().toISOString(),
      last_error: typeof body.last_error === "string" ? body.last_error.slice(0, 500) : null,
    }, { onConflict: "api_key_id" });
    return error ? json(req, { error: "Heartbeat failed.", detail: error.message }, 500) : json(req, { ok: true, version: VERSION });
  }

  if (action === "agent.next") {
    const { data, error } = await supabase.rpc("claim_live_data_gateway_request", { p_agent_key_id: key.id });
    if (error) return json(req, { error: "Could not claim a live-data request.", detail: error.message }, 500);
    const requestRow = Array.isArray(data) ? data[0] ?? null : data ?? null;
    return json(req, { request: requestRow });
  }

  if (action === "agent.complete") {
    const requestId = typeof body.request_id === "string" ? body.request_id : "";
    if (!requestId || typeof body.ok !== "boolean") return json(req, { error: "request_id and ok are required." }, 400);
    if (body.ok && JSON.stringify(body.data ?? null).length > MAX_RESPONSE_BYTES) {
      return json(req, { error: "Live-data response exceeds the 1 MB limit." }, 413);
    }
    const update = body.ok
      ? {
          status: "completed",
          response_payload: body.data ?? null,
          error_code: null,
          error_message: null,
          completed_at: new Date().toISOString(),
        }
      : {
          status: "failed",
          response_payload: null,
          error_code: typeof body.error_code === "string" ? body.error_code.slice(0, 100) : "source_error",
          error_message: typeof body.error_message === "string" ? body.error_message.slice(0, 1000) : "The private source request failed.",
          completed_at: new Date().toISOString(),
        };
    const { data, error } = await supabase
      .from("live_data_gateway_requests")
      .update(update)
      .eq("id", requestId)
      .eq("status", "claimed")
      .eq("claimed_by", key.id)
      .select("id")
      .maybeSingle();
    if (error) return json(req, { error: "Could not complete the live-data request.", detail: error.message }, 500);
    if (!data) return json(req, { error: "Request is no longer claimable by this agent." }, 409);
    return json(req, { ok: true });
  }

  return json(req, { error: "Unsupported agent action." }, 404);
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const rejectedOrigin = rejectDisallowedOrigin(req, corsPolicy);
  if (rejectedOrigin) return rejectedOrigin;
  if (req.method !== "POST") return json(req, { error: "Method not allowed." }, 405);

  const raw = await req.json().catch(() => null);
  if (!isObject(raw)) return json(req, { error: "JSON object body required." }, 400);
  const action = typeof raw.action === "string" ? raw.action : "";
  if (action === "version") return json(req, { name: "live-data-gateway", version: VERSION, operations: Object.keys(OPERATIONS) });
  if (action.startsWith("agent.")) return handleAgent(req, action, raw);
  if (action === "request") return handleClientRequest(req, raw);
  if (action === "status") return handleClientStatus(req, raw);
  return json(req, { error: "Unsupported action." }, 404);
});

