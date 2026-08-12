// Gatekeeper outbound order sender.  This function never pulls job status;
// it only connects, refreshes the sender's contract list, and submits an
// explicitly released order while retaining Gatekeeper's immediate receipt.
//
// It carries BOTH order types — prescription orders (rx_order_submissions)
// and stock/SKU orders (stock_order_submissions) — through the one shared
// Hashref v2.5 writer in ../_shared/orders/hashref.ts, which is also the
// text the optilens-local worker receives for the Innovations transport.
// Same order, same bytes, whichever route staff pick.

import { createCorsPolicy, getCorsHeaders, handleCorsPreflight, rejectDisallowedOrigin } from "../_shared/http/cors.ts";
import { requirePrivilegedAccess } from "../_shared/http/auth.ts";
import { buildOrderHashref, canonicalOrderFor, text, type OrderKind } from "../_shared/orders/hashref.ts";

const corsPolicy = createCorsPolicy({
  allowHeaders: "authorization, x-client-info, apikey, content-type",
  allowMethods: "POST, OPTIONS",
});

type GatekeeperContract = {
  hash_routing?: string;
  webrx_lab_id_origin?: string;
  webrx_retailer_name_origin?: string;
  origin_type?: string;
  webrx_lab_id_receiver?: string;
  webrx_retailer_name_receiver?: string;
  receiver_type?: string;
};

type GatekeeperCredentials = {
  environment: "staging" | "production";
  enabled: boolean;
  jwt_key: string;
  jwt_secret: string;
  auth_token: string | null;
  auth_token_expires_at: string | null;
  last_auth_refresh_at: string | null;
  receiver_lab_id: string;
  receiver_retailer_name: string;
  hash_routing: string;
};

type GatekeeperConnectionCredentials = Pick<GatekeeperCredentials, "environment" | "jwt_key" | "jwt_secret" | "auth_token" | "auth_token_expires_at" | "last_auth_refresh_at"> & {
  origin_lab_id: string;
  lab_name: string;
};

type Submission = {
  id: string;
  gatekeeper_order_id: number | null;
  payload: Record<string, unknown>;
};

// The two outboxes differ only in which table and which columns hold the
// order; everything downstream of the claim is identical.
const ORDER_TABLES: Record<OrderKind, { table: string; columns: string }> = {
  rx: { table: "rx_order_submissions", columns: "id,gatekeeper_order_id,payload" },
  stock: { table: "stock_order_submissions", columns: "id,gatekeeper_order_id,payload" },
};

function orderKindFrom(value: unknown): OrderKind {
  return text(value, 10) === "stock" ? "stock" : "rx";
}

const GATEKEEPER_BASE_URLS = {
  staging: "https://gatekeeper-staging.opticalonline.com",
  production: "https://gatekeeper.opticalonline.com",
} as const;

// ---------------------------------------------------------------------------
// Dispatch logging: every Gatekeeper HTTP call and every terminal failure is
// written to public.gatekeeper_dispatch_logs with the full (redacted) request
// and response, and failures raise an admin notification.
// ---------------------------------------------------------------------------

type DispatchLog = {
  admin: any;
  action: string;
  actorUserId: string | null;
  orderKind?: OrderKind | null;
  submissionId?: string | null;
};

const SNAPSHOT_LIMIT = 8000;
const SECRET_KEYS = ["jwt_secret", "jwt_key", "pin_code", "pinCode", "auth_token", "authorization", "password"];

function redact(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return depth > 4 ? "[array]" : value.slice(0, 50).map((item) => redact(item, depth + 1));
  if (typeof value === "object") {
    if (depth > 4) return "[object]";
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SECRET_KEYS.some((secret) => key.toLowerCase() === secret.toLowerCase()) ? "[redacted]" : redact(item, depth + 1);
    }
    return out;
  }
  if (typeof value === "string") return value.length > SNAPSHOT_LIMIT ? `${value.slice(0, SNAPSHOT_LIMIT)}…[truncated]` : value;
  return value;
}

async function recordDispatchLog(log: DispatchLog | null, entry: {
  phase: string;
  success: boolean;
  endpoint?: string | null;
  method?: string | null;
  status?: number | null;
  durationMs?: number | null;
  request?: unknown;
  response?: unknown;
  errorMessage?: string | null;
  alert?: boolean;
}) {
  if (!log) return;
  const payload = {
    p_action: log.action,
    p_success: entry.success,
    p_phase: entry.phase,
    p_order_kind: log.orderKind ?? null,
    p_submission_id: log.submissionId ?? null,
    p_endpoint: entry.endpoint ?? null,
    p_http_method: entry.method ?? null,
    p_http_status: entry.status ?? null,
    p_duration_ms: entry.durationMs ?? null,
    p_request: (redact(entry.request ?? {}) ?? {}) as Record<string, unknown>,
    p_response: (redact(entry.response ?? {}) ?? {}) as Record<string, unknown>,
    p_error_message: entry.errorMessage ?? null,
    p_actor_user_id: log.actorUserId,
    p_alert: entry.alert ?? false,
  };
  if (!entry.success) {
    console.error("gatekeeper dispatch failure", JSON.stringify(payload));
  }
  const { error } = await log.admin.rpc("log_gatekeeper_dispatch", payload);
  if (error) console.error("gatekeeper dispatch log write failed", error.message);
}

// Single place where Gatekeeper is called, so no request can escape logging.
async function gatekeeperFetch(log: DispatchLog | null, phase: string, url: string, init: RequestInit, requestSnapshot?: unknown, expectedStatuses: number[] = []) {
  const startedAt = Date.now();
  const method = (init.method ?? "GET").toUpperCase();
  try {
    const response = await fetch(url, init);
    const raw = await response.text();
    let body: any = {};
    try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw: raw.slice(0, SNAPSHOT_LIMIT) }; }
    const expectedResponse = response.ok || expectedStatuses.includes(response.status);
    await recordDispatchLog(log, {
      phase,
      success: expectedResponse,
      endpoint: url.split("?")[0],
      method,
      status: response.status,
      durationMs: Date.now() - startedAt,
      request: requestSnapshot ?? null,
      response: { body, headers: { "content-type": response.headers.get("content-type") } },
      errorMessage: expectedResponse ? null : `Gatekeeper responded HTTP ${response.status}`,
      alert: !expectedResponse,
    });
    return { response, body };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordDispatchLog(log, {
      phase,
      success: false,
      endpoint: url.split("?")[0],
      method,
      status: null,
      durationMs: Date.now() - startedAt,
      request: requestSnapshot ?? null,
      response: { network_error: message },
      errorMessage: `Network error calling Gatekeeper: ${message}`,
      alert: true,
    });
    throw error;
  }
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...getCorsHeaders(req, corsPolicy) },
  });
}

function baseUrl(environment: "staging" | "production") {
  return GATEKEEPER_BASE_URLS[environment];
}

async function readJson(response: Response): Promise<any> {
  return await response.json().catch(() => ({}));
}

async function authenticate(environment: "staging" | "production", jwtKey: string, jwtSecret: string, log: DispatchLog | null): Promise<string> {
  const url = new URL("/api/v2/auth_user", baseUrl(environment));
  url.searchParams.set("jwt_key", jwtKey);
  url.searchParams.set("jwt_secret", jwtSecret);
  const { response, body } = await gatekeeperFetch(log, "auth_user", url.toString(), { method: "POST" }, { environment, jwt_key: "[redacted]" });
  if (!response.ok || !text(body?.auth_token)) throw new Error(`Gatekeeper authentication failed (HTTP ${response.status}).`);
  return String(body.auth_token);
}

const CONTRACT_PATHS = [
  // The Ocuco "Order Sending" spec documents the prose path as
  // /api/v2/orders/contract_available but captions the actual endpoint as
  // GET /api/v2/operations/contract_available — try the operations path first.
  "/api/v2/operations/contract_available",
  "/api/v2/orders/contract_available",
  "/api/v2/orders/contracts_available",
  "/api/v2/contract_available",
  "/api/v2/orders/contract_availables",
];

async function contractsFor(environment: "staging" | "production", authToken: string, log: DispatchLog | null): Promise<GatekeeperContract[] | null> {
  for (const path of CONTRACT_PATHS) {
    // Gatekeeper v2 accepts the 24-hour token either as a bearer header or as
    // an auth_token query parameter; send both so a path change is the only
    // remaining failure mode.
    const url = new URL(`${baseUrl(environment)}${path}`);
    url.searchParams.set("auth_token", authToken);
    const { response, body } = await gatekeeperFetch(log, "contract_available", url.toString(), {
      headers: { Authorization: `Bearer ${authToken}`, Accept: "application/json" },
    }, { environment, path }, [404]);
    if (response.status === 404) continue;
    if (!response.ok) throw new Error(`Gatekeeper contract lookup failed (HTTP ${response.status}).`);
    const lab = body?.message?.lab ?? body?.lab ?? {};
    const contracts = lab.contractSending ?? body?.contractSending ?? body?.message?.contractSending ?? [];
    if (!Array.isArray(contracts)) throw new Error("Gatekeeper returned an invalid contract list.");
    return contracts as GatekeeperContract[];
  }
  return null;
}



function sanitizeContracts(contracts: GatekeeperContract[]) {
  return contracts.map((contract) => ({
    origin_lab_id: text(contract.webrx_lab_id_origin),
    origin_retailer_name: text(contract.webrx_retailer_name_origin),
    receiver_lab_id: text(contract.webrx_lab_id_receiver),
    receiver_retailer_name: text(contract.webrx_retailer_name_receiver),
  }));
}

async function credentialsFor(authContext: any): Promise<GatekeeperCredentials> {
  const { data, error } = await authContext.supabaseAdminClient.rpc("get_gatekeeper_credentials");
  const config = (Array.isArray(data) ? data[0] : data) as GatekeeperCredentials | null;
  if (error || !config?.jwt_key || !config?.jwt_secret || !config?.receiver_lab_id || !config?.hash_routing) {
    throw new Error("Gatekeeper is not connected with an active sending contract.");
  }
  if (!config.enabled) throw new Error("Gatekeeper outbound delivery is disabled in Integrations.");
  return config;
}

async function connectionCredentialsFor(authContext: any): Promise<GatekeeperConnectionCredentials> {
  const { data, error } = await authContext.supabaseAdminClient.rpc("get_gatekeeper_connection_credentials");
  const config = (Array.isArray(data) ? data[0] : data) as GatekeeperConnectionCredentials | null;
  if (error || !config?.jwt_key || !config?.jwt_secret || !config?.origin_lab_id || !config?.lab_name) {
    throw new Error("Gatekeeper has not been connected yet.");
  }
  return config;
}

async function validAuthToken(authContext: any, config: Pick<GatekeeperCredentials, "environment" | "jwt_key" | "jwt_secret" | "auth_token" | "auth_token_expires_at" | "last_auth_refresh_at">, log: DispatchLog | null): Promise<string> {
  const expiresAt = config.auth_token_expires_at ? Date.parse(config.auth_token_expires_at) : 0;
  if (config.auth_token && Number.isFinite(expiresAt) && expiresAt > Date.now() + 60_000) return config.auth_token;
  const refreshedAt = config.last_auth_refresh_at ? Date.parse(config.last_auth_refresh_at) : 0;
  if (Number.isFinite(refreshedAt) && Date.now() - refreshedAt < 12 * 60 * 60 * 1000) {
    throw new Error("Gatekeeper token is unavailable and may not be refreshed more than twice in 24 hours.");
  }
  const token = await authenticate(config.environment, config.jwt_key, config.jwt_secret, log);
  const { error } = await authContext.supabaseAdminClient.rpc("cache_gatekeeper_auth_token", {
    p_auth_token: token,
    p_actor_user_id: authContext.user.id,
  });
  if (error) throw new Error(`Gatekeeper token was created but could not be stored: ${error.message}`);
  return token;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req, corsPolicy);
  if (preflight) return preflight;
  const disallowedOrigin = rejectDisallowedOrigin(req, corsPolicy);
  if (disallowedOrigin) return disallowedOrigin;
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  // The scheduled status pull has no interactive user, so it authenticates
  // with a shared cron secret instead of an admin session. Every other action
  // still requires a signed-in admin.
  const cronSecret = Deno.env.get("GATEKEEPER_CRON_SECRET") ?? "";
  const presentedCronSecret = req.headers.get("x-gatekeeper-cron-secret") ?? "";
  const isCron = !!cronSecret && presentedCronSecret === cronSecret;

  const authContext = isCron
    ? {
        supabaseAdminClient: createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
          { auth: { persistSession: false } },
        ),
        user: { id: null as string | null },
      }
    : await requirePrivilegedAccess(req, getCorsHeaders(req, corsPolicy), {
        allowedRoles: ["admin"], sourceFunction: "gatekeeper-orders",
      });
  if (authContext instanceof Response) return authContext;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const action = text(body?.action, 40);
  if (!body || !["connect", "refresh-contracts", "send", "preview", "pull-statuses"].includes(action)) {
    return json(req, { error: "Unsupported action." }, 400);
  }
  if (isCron && action !== "pull-statuses") {
    return json(req, { error: "The scheduled caller may only pull statuses." }, 403);
  }


  const log: DispatchLog = {
    admin: authContext.supabaseAdminClient,
    action,
    actorUserId: authContext.user?.id ?? null,
    orderKind: null,
    submissionId: null,
  };

  try {

    if (action === "connect") {
      const environment = body.environment === "production" ? "production" : "staging";
      const originLabId = text(body.originLabId, 30);
      const labName = text(body.labName, 100);
      const pinCode = text(body.pinCode, 100);
      if (!originLabId || !labName || !pinCode) return json(req, { error: "Origin lab ID, lab name, and the single-use PIN are required." }, 400);
      const pinUrl = new URL("/api/v1/legacy_orders/lab_access_with_pin", baseUrl(environment));
      pinUrl.searchParams.set("webrx_lab_id", originLabId);
      pinUrl.searchParams.set("pin_code", pinCode);
      const { response: pinResponse, body: pinBody } = await gatekeeperFetch(log, "lab_access_with_pin", pinUrl.toString(), {}, { environment, webrx_lab_id: originLabId, pin_code: "[redacted]" });
      const lab = pinBody?.message?.lab ?? pinBody?.lab ?? {};
      if (!pinResponse.ok || !text(lab.jwt_key) || !text(lab.jwt_secret)) {
        throw new Error(`Gatekeeper did not accept the PIN (HTTP ${pinResponse.status}).`);
      }
      const authToken = await authenticate(environment, String(lab.jwt_key), String(lab.jwt_secret), log);

      const suppliedContracts = Array.isArray(lab.contractSending) ? lab.contractSending as GatekeeperContract[] : [];
      // Persist the single-use-PIN result before a separate contract lookup.
      // If Gatekeeper's second call is temporarily unavailable, the durable JWT
      // credentials remain available for a safe retry instead of being lost.
      const { error: credentialError } = await authContext.supabaseAdminClient.rpc("store_gatekeeper_connection", {
        p_environment: environment,
        p_origin_lab_id: text(lab.webrx_lab_id || originLabId, 30),
        p_lab_name: labName,
        p_jwt_key: String(lab.jwt_key),
        p_jwt_secret: String(lab.jwt_secret),
        p_auth_token: authToken,
        p_contracts: suppliedContracts,
        p_actor_user_id: authContext.user.id,
      });
      if (credentialError) throw new Error(`Gatekeeper credentials could not be saved: ${credentialError.message}`);
      const refreshedContracts = await contractsFor(environment, authToken, log);
      if (!refreshedContracts) {
        return json(req, {
          ok: true,
          refreshed: false,
          contracts: sanitizeContracts(suppliedContracts),
          message: `Gatekeeper's contract endpoint is not available on ${environment}; contracts returned during connection remain stored.`,
        });
      }
      const { error } = await authContext.supabaseAdminClient.rpc("store_gatekeeper_connection", {
        p_environment: environment,
        p_origin_lab_id: text(lab.webrx_lab_id || originLabId, 30),
        p_lab_name: labName,
        p_jwt_key: String(lab.jwt_key),
        p_jwt_secret: String(lab.jwt_secret),
        p_auth_token: authToken,
        p_contracts: refreshedContracts,
        p_actor_user_id: authContext.user.id,
      });
      if (error) throw new Error(`Gatekeeper connected but credentials could not be saved: ${error.message}`);
      return json(req, { ok: true, refreshed: true, contracts: sanitizeContracts(refreshedContracts) });
    }

    if (action === "refresh-contracts") {
      const config = await connectionCredentialsFor(authContext);
      const authToken = await validAuthToken(authContext, config, log);
      const contracts = await contractsFor(config.environment, authToken, log);
      if (!contracts) {
        return json(req, {
          ok: true,
          refreshed: false,
          preserved: true,
          message: `Gatekeeper's contract endpoint is not available on ${config.environment}; existing stored contracts are unchanged.`,
        });
      }
      const { error } = await authContext.supabaseAdminClient.rpc("replace_gatekeeper_contracts", {
        p_contracts: contracts,
        p_actor_user_id: authContext.user.id,
      });
      if (error) throw new Error(`Gatekeeper contracts could not be refreshed: ${error.message}`);
      return json(req, { ok: true, refreshed: true, contracts: sanitizeContracts(contracts) });
    }

    const orderKind = orderKindFrom(body.orderKind);
    log.orderKind = orderKind;
    const { table, columns } = ORDER_TABLES[orderKind];
    const submissionId = text(body.submissionId, 64);
    log.submissionId = submissionId || null;
    if (!submissionId) return json(req, { error: "A submission ID is required." }, 400);

    // Preview renders exactly what a send would transmit, from the same
    // builder, without claiming the row or contacting Gatekeeper. It is what
    // both order forms show in their "Preview file" pane, so what staff read
    // there is the order itself and not a separate approximation of it.
    if (action === "preview") {
      const { data: row, error: readError } = await authContext.supabaseAdminClient
        .from(table)
        .select(columns)
        .eq("id", submissionId)
        .maybeSingle();
      if (readError) throw new Error(`Could not read the submission: ${readError.message}`);
      if (!row) return json(req, { error: "Submission not found." }, 404);
      const config = await credentialsFor(authContext).catch(() => null);
      const hashref = buildOrderHashref(canonicalOrderFor(orderKind, row as Submission), {
        // Without a connected contract there is nothing to route to yet, but
        // the order body is still worth showing; the placeholders make it
        // obvious which two fields the contract supplies.
        labNum: config?.receiver_lab_id || "<lab_num>",
        custNum: config?.receiver_retailer_name || "<cust_num>",
      });
      return json(req, { ok: true, orderKind, hashref, routed: !!config });
    }

    const { data: claimed, error: claimError } = await authContext.supabaseAdminClient
      .from(table)
      .update({ status: "claimed", claimed_at: new Date().toISOString() })
      .eq("id", submissionId)
      .eq("status", "approved")
      .eq("dispatch_provider", "gatekeeper")
      .select(columns)
      .maybeSingle();
    if (claimError) throw new Error(`Could not claim Gatekeeper submission: ${claimError.message}`);
    if (!claimed) return json(req, { error: "Submission is not awaiting Gatekeeper delivery." }, 409);

    let receiptAccepted = false;

    try {
      const config = await credentialsFor(authContext);
      const authToken = await validAuthToken(authContext, config, log);
      const rxContent = buildOrderHashref(canonicalOrderFor(orderKind, claimed as Submission), {
        labNum: config.receiver_lab_id,
        custNum: config.receiver_retailer_name,
      });
      const { response, body: responseBody } = await gatekeeperFetch(
        log,
        "push_order_to_lab",
        `${baseUrl(config.environment)}/api/v2/orders/push_order_to_lab`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ order: { hash_routing: config.hash_routing, rx_content: rxContent, tr_content: "" } }),
        },
        { environment: config.environment, hash_routing: config.hash_routing, rx_content: rxContent },
      );
      if (!response.ok || !responseBody?.message) {
        throw new Error(`Gatekeeper rejected the order (HTTP ${response.status}).`);
      }
      const receipt = responseBody.message;
      // Do not convert an externally accepted order into a retryable failure
      // if recording its local receipt happens to fail. A retry could create a
      // duplicate Rx at the lab.
      receiptAccepted = true;
      const { error } = await authContext.supabaseAdminClient.rpc("record_gatekeeper_result", {
        p_submission_id: submissionId,
        p_success: true,
        p_order_kind: orderKind,
        p_receipt: receipt,
      });
      if (error) throw new Error(`Gatekeeper accepted the order but the receipt could not be recorded: ${error.message}`);
      return json(req, { ok: true, orderKind, receipt: { id: receipt.id ?? null, guid: receipt.guid ?? null, created_at: receipt.created_at ?? null } });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!receiptAccepted) {
        await authContext.supabaseAdminClient.rpc("record_gatekeeper_result", {
          p_submission_id: submissionId, p_success: false, p_order_kind: orderKind, p_error_message: message,
        });
      }
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gatekeeper operation failed.";
    await recordDispatchLog(log, {
      phase: "request_failed",
      success: false,
      request: { action, orderKind: log.orderKind, submissionId: log.submissionId, body: redact(body) },
      response: { stack: error instanceof Error ? error.stack?.slice(0, 4000) ?? null : null },
      errorMessage: message,
      status: 502,
      alert: true,
    });
    return json(req, { error: message }, 502);
  }
});
