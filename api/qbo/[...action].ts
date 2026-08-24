/// <reference types="node" />
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const INTUIT_AUTHORIZE = "https://appcenter.intuit.com/connect/oauth2";
type GatewayRequest = { method?: string; query: Record<string, string | string[] | undefined>; headers: Record<string, string | string[] | undefined>; body?: Record<string, unknown> };
type GatewayResponse = { status: (status: number) => GatewayResponse; json: (body: unknown) => void; redirect: (status: number, url: string) => void; setHeader: (name: string, value: string) => void };
type TransactionRow = { authorization_code_ciphertext?: string; callback_received_at?: string; claimed_at?: string; completed_at?: string; environment?: string; expires_at: string; realm_id_masked?: string; state_hash?: string };
const json = (res: GatewayResponse, status: number, body: unknown) => res.status(status).json(body);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function gatewayEnvironment() {
  const value = String(process.env.QBO_GATEWAY_ENVIRONMENT || "").trim().toLowerCase();
  if (value !== "sandbox" && value !== "production") throw new Error("Invalid QBO gateway environment.");
  return value;
}

function redirectUri(environment: string) {
  const expected = environment === "sandbox"
    ? "https://qbo-sandbox.classicvisions.net/qbo/oauth/callback"
    : "https://qbo.classicvisions.net/qbo/oauth/callback";
  const configured = env("QBO_REDIRECT_URI");
  if (configured !== expected) throw new Error("Invalid QBO redirect URI.");
  return configured;
}

function gatewayRoot(environment: string) {
  return environment === "sandbox" ? "https://qbo-sandbox.classicvisions.net" : "https://qbo.classicvisions.net";
}

async function supabase(path: string, init: RequestInit = {}) {
  const headers = init.headers instanceof Headers
    ? Object.fromEntries(init.headers.entries())
    : (init.headers || {}) as Record<string, string>;
  let body: unknown = null;
  if (typeof init.body === "string" && init.body.length) body = JSON.parse(init.body);
  const response = await fetch(`${env("SUPABASE_URL")}/functions/v1/qbo-gateway`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": env("QBO_LOVABLE_API_KEY") },
    body: JSON.stringify({ path, method: init.method || "GET", headers: { Prefer: headers.Prefer || headers.prefer }, body }),
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  return response;
}

async function requireAdmin(req: GatewayRequest) {
  const token = String(req.headers.authorization || "");
  if (!token.startsWith("Bearer ")) return null;
  const userResponse = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: token } });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  const roles = await supabase(`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&select=id`);
  return (await roles.json()).length ? user : null;
}

function cors(req: GatewayRequest, res: GatewayResponse) {
  const allowed = env("QBO_ADMIN_ORIGIN");
  const origin = String(req.headers.origin || "");
  if (origin !== allowed) return false;
  res.setHeader("Access-Control-Allow-Origin", allowed);
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Vary", "Origin");
  return true;
}

async function consumeRateLimit(req: GatewayRequest, action: string) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const remote = forwarded || String(req.headers["x-real-ip"] || "unknown");
  const key = sha256(`${env("QBO_GATEWAY_RATE_LIMIT_SECRET")}:${action}:${remote}`);
  const response = await supabase("/rest/v1/rpc/qbo_consume_rate_limit", { method: "POST", body: JSON.stringify({ p_bucket_key: `${action}:${key}`, p_limit: 20, p_window_seconds: 60 }) });
  return (await response.json()) === true;
}

function encryptCode(code: string) {
  const key = Buffer.from(env("QBO_CODE_HANDOFF_ENCRYPTION_KEY"), "base64url");
  if (key.length !== 32) throw new Error("Invalid QBO code handoff key.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url");
}
function decryptCode(value: string) {
  const key = Buffer.from(env("QBO_CODE_HANDOFF_ENCRYPTION_KEY"), "base64url"); const input = Buffer.from(value, "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, input.subarray(0, 12)); decipher.setAuthTag(input.subarray(12, 28));
  return Buffer.concat([decipher.update(input.subarray(28)), decipher.final()]).toString("utf8");
}

export default async function handler(req: GatewayRequest, res: GatewayResponse) {
  const rawAction = req.query.action ?? req.query["...action"];
  const action = Array.isArray(rawAction) ? rawAction.join("/") : String(rawAction || "");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  try {
    const environment = gatewayEnvironment();
    const REDIRECT_URI = redirectUri(environment);
    const root = gatewayRoot(environment);
    if (action === "transaction") {
      if (!cors(req, res)) return json(res, 403, { error: "Origin not allowed." });
      if (req.method === "OPTIONS") return res.status(204).json({});
      const user = await requireAdmin(req);
      if (!user) return json(res, 401, { error: "Authentication required." });
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
      const state = randomBytes(32).toString("base64url");
      const id = randomUUID();
      await supabase("/rest/v1/qbo_oauth_transactions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id, state_hash: sha256(state), redirect_uri: REDIRECT_URI, environment, created_by: user.id, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() }) });
      await supabase(`/rest/v1/qbo_integration_state?on_conflict=provider,environment`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ provider: "quickbooks_online", environment, status: "connection_pending", created_by: user.id }) });
      return json(res, 201, { transaction_id: id, environment, connect_url: `${root}/qbo/connect?transaction=${encodeURIComponent(id)}` });
    }
    if (action === "command") {
      if (!cors(req, res)) return json(res, 403, { error: "Origin not allowed." });
      if (req.method === "OPTIONS") return res.status(204).json({});
      const user = await requireAdmin(req); if (!user) return json(res, 401, { error: "Authentication required." });
      const command = String(req.body?.command || "");
      if (req.method !== "POST" || !["disconnect", "reconcile"].includes(command)) return json(res, 400, { error: "Invalid command." });
      const response = await supabase("/rest/v1/qbo_integration_commands", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ command, environment, requested_by: user.id }) });
      return json(res, 202, { id: (await response.json())[0].id, status: "queued" });
    }
    if (action === "connect") {
      if (!(await consumeRateLimit(req, action))) return json(res, 429, { error: "Too many requests." });
      const transaction = String(req.query.transaction || "");
      if (!/^[0-9a-f-]{36}$/i.test(transaction)) return json(res, 400, { error: "Invalid connection request." });
      const query = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${transaction}&environment=eq.${environment}&select=state_hash,expires_at,callback_received_at,completed_at`);
      const row = (await query.json())[0] as TransactionRow | undefined;
      if (!row || row.callback_received_at || row.completed_at || Date.parse(row.expires_at) <= Date.now()) return json(res, 400, { error: "This connection request is no longer valid." });
      // State is held in an HttpOnly cookie only long enough to start Intuit OAuth.
      const state = randomBytes(32).toString("base64url");
      await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${transaction}&environment=eq.${environment}`, { method: "PATCH", body: JSON.stringify({ state_hash: sha256(state) }) });
      res.setHeader("Set-Cookie", `qbo_tx=${transaction}; Path=/qbo/oauth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
      const url = new URL(INTUIT_AUTHORIZE);
      url.searchParams.set("client_id", env("QBO_CLIENT_ID")); url.searchParams.set("response_type", "code"); url.searchParams.set("scope", "com.intuit.quickbooks.accounting"); url.searchParams.set("redirect_uri", REDIRECT_URI); url.searchParams.set("state", state);
      return res.redirect(302, url.toString());
    }
    // Intuit requires a public disconnect URL. Actual disconnection is always
    // initiated by an authenticated admin through the queued command endpoint.
    if (action === "disconnect") {
      if (!(await consumeRateLimit(req, action))) return json(res, 429, { error: "Too many requests." });
      return json(res, 200, { ok: true });
    }
    if (action === "handoff/claim") {
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
      const supplied = Buffer.from(String(req.headers["x-qbo-handoff-token"] || "")); const expected = Buffer.from(env("QBO_LOCAL_HANDOFF_TOKEN"));
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(res, 401, { error: "Unauthorized." });
      const id = String(req.body?.transaction_id || ""); if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: "Invalid transaction." });
      const query = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${id}&environment=eq.${environment}&select=authorization_code_ciphertext,expires_at,claimed_at,completed_at,environment,redirect_uri`);
      const row = (await query.json())[0] as TransactionRow | undefined;
      if (!row?.authorization_code_ciphertext || row.claimed_at || row.completed_at || Date.parse(row.expires_at) <= Date.now()) return json(res, 409, { error: "Authorization handoff is unavailable." });
      const claimed = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${id}&environment=eq.${environment}&claimed_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ claimed_at: new Date().toISOString(), claimed_by: "optilens-local" }) });
      if (!(await claimed.json()).length) return json(res, 409, { error: "Authorization handoff is unavailable." });
      const handoff = JSON.parse(decryptCode(row.authorization_code_ciphertext)) as { code: string; realm_id: string };
      if (!handoff.code || !handoff.realm_id) return json(res, 409, { error: "Authorization handoff is unavailable." });
      return json(res, 200, { transaction_id: id, code: handoff.code, realm_id: handoff.realm_id, redirect_uri: REDIRECT_URI, environment: row.environment });
    }
    if (action === "handoff/result") {
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
      const supplied = Buffer.from(String(req.headers["x-qbo-handoff-token"] || "")); const expected = Buffer.from(env("QBO_LOCAL_HANDOFF_TOKEN"));
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(res, 401, { error: "Unauthorized." });
      const body = (req.body || {}) as Record<string, unknown>;
      const status = typeof body.status === "string" ? body.status : "";
      if (!body.transaction_id || !["connected", "error", "disconnected", "token_refresh_required"].includes(status)) return json(res, 400, { error: "Invalid status." });
      await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${encodeURIComponent(String(body.transaction_id))}&environment=eq.${environment}&claimed_at=not.is.null&completed_at=is.null`, { method: "PATCH", body: JSON.stringify({ completed_at: new Date().toISOString(), authorization_code_ciphertext: null, failure_code: status === "error" ? "exchange_failed" : null, failure_message_sanitized: status === "error" ? "QuickBooks authorization could not be completed." : null }) });
      await supabase(`/rest/v1/qbo_integration_state?on_conflict=provider,environment`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ provider: "quickbooks_online", environment, status, company_name: body.company_name || null, realm_id_masked: body.realm_id_masked || null, connected_at: status === "connected" ? (body.connected_at || new Date().toISOString()) : null, updated_at: new Date().toISOString(), last_error_message_sanitized: status === "error" ? "QuickBooks authorization could not be completed." : null }) });
      return json(res, 200, { ok: true });
    }
    if (action === "commands/claim") {
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
      const supplied = Buffer.from(String(req.headers["x-qbo-handoff-token"] || "")); const expected = Buffer.from(env("QBO_LOCAL_HANDOFF_TOKEN"));
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(res, 401, { error: "Unauthorized." });
      const pending = await supabase(`/rest/v1/qbo_integration_commands?environment=eq.${environment}&status=eq.queued&order=requested_at.asc&limit=1&select=id,command,environment`); const command = (await pending.json())[0];
      if (!command) return json(res, 200, { command: null });
      const claimed = await supabase(`/rest/v1/qbo_integration_commands?id=eq.${command.id}&environment=eq.${environment}&status=eq.queued`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "claimed", claimed_at: new Date().toISOString() }) });
      return json(res, 200, { command: (await claimed.json())[0] || null });
    }
    if (action === "commands/result") {
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
      const supplied = Buffer.from(String(req.headers["x-qbo-handoff-token"] || "")); const expected = Buffer.from(env("QBO_LOCAL_HANDOFF_TOKEN"));
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(res, 401, { error: "Unauthorized." });
      const body = (req.body || {}) as Record<string, unknown>;
      const status = typeof body.status === "string" ? body.status : "";
      if (!body.id || !["completed", "error"].includes(status)) return json(res, 400, { error: "Invalid result." });
      await supabase(`/rest/v1/qbo_integration_commands?id=eq.${encodeURIComponent(String(body.id))}&environment=eq.${environment}&status=eq.claimed`, { method: "PATCH", body: JSON.stringify({ status, completed_at: new Date().toISOString(), result_sanitized: body.result_sanitized || null, error_message_sanitized: status === "error" ? "The Local QBO command could not be completed." : null }) });
      if (body.command === "reconcile") await supabase(`/rest/v1/qbo_integration_state?provider=eq.quickbooks_online&environment=eq.${environment}`, { method: "PATCH", body: JSON.stringify({ last_reconciliation_status: status === "completed" ? "completed" : "error", last_reconciliation_at: new Date().toISOString(), updated_at: new Date().toISOString() }) });
      if (body.command === "disconnect" && status === "completed") await supabase(`/rest/v1/qbo_integration_state?provider=eq.quickbooks_online&environment=eq.${environment}`, { method: "PATCH", body: JSON.stringify({ status: "disconnected", company_name: null, realm_id_masked: null, connected_at: null, updated_at: new Date().toISOString() }) });
      return json(res, 200, { ok: true });
    }
    if (action === "oauth/callback") {
      if (!(await consumeRateLimit(req, action))) return json(res, 429, { error: "Too many requests." });
      const code = String(req.query.code || ""); const state = String(req.query.state || ""); const tx = /qbo_tx=([^;]+)/.exec(String(req.headers.cookie || ""))?.[1];
      if (!code || !state || !tx) return json(res, 400, { error: "The authorization response could not be validated." });
      const query = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${encodeURIComponent(tx)}&environment=eq.${environment}&select=id,state_hash,expires_at,callback_received_at,completed_at`);
      const row = (await query.json())[0] as TransactionRow | undefined;
      if (!row || row.state_hash !== sha256(state) || row.callback_received_at || row.completed_at || Date.parse(row.expires_at) <= Date.now()) return json(res, 400, { error: "The authorization response is invalid or expired." });
      const realmId = String(req.query.realmId || "");
      if (!realmId) return json(res, 400, { error: "The authorization response could not be validated." });
      const callback = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${encodeURIComponent(tx)}&environment=eq.${environment}&callback_received_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ authorization_code_ciphertext: encryptCode(JSON.stringify({ code, realm_id: realmId })), callback_received_at: new Date().toISOString(), realm_id_masked: realmId.slice(-4) || null }) });
      if (!(await callback.json()).length) return json(res, 400, { error: "The authorization response is invalid or expired." });
      res.setHeader("Set-Cookie", "qbo_tx=; Path=/qbo/oauth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
      return res.redirect(303, `${env("QBO_ADMIN_SUCCESS_URL")}?qbo=connection-pending`);
    }
    return json(res, 404, { error: "Not found." });
  } catch (error) { return json(res, 503, { error: "QuickBooks connection is temporarily unavailable." }); }
}
