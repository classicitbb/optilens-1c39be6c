import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const REDIRECT_URI = "https://qbo.classicvisions.net/qbo/oauth/callback";
const INTUIT_AUTHORIZE = "https://appcenter.intuit.com/connect/oauth2";
const json = (res: any, status: number, body: unknown) => res.status(status).json(body);
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function serviceHeaders() {
  return { apikey: env("SUPABASE_SERVICE_ROLE_KEY"), Authorization: `Bearer ${env("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" };
}

async function supabase(path: string, init: RequestInit = {}) {
  const response = await fetch(`${env("SUPABASE_URL")}${path}`, { ...init, headers: { ...serviceHeaders(), ...(init.headers || {}) } });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}).`);
  return response;
}

async function requireAdmin(req: any) {
  const token = String(req.headers.authorization || "");
  if (!token.startsWith("Bearer ")) return null;
  const userResponse = await fetch(`${env("SUPABASE_URL")}/auth/v1/user`, { headers: { apikey: env("SUPABASE_ANON_KEY"), Authorization: token } });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  const roles = await supabase(`/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&select=id`);
  return (await roles.json()).length ? user : null;
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

export default async function handler(req: any, res: any) {
  const action = String(req.query.action || "");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Referrer-Policy", "no-referrer");
  try {
    if (action === "transaction") {
      const user = await requireAdmin(req);
      if (!user) return json(res, 401, { error: "Authentication required." });
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
      const state = randomBytes(32).toString("base64url");
      const id = randomUUID();
      await supabase("/rest/v1/qbo_oauth_transactions", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ id, state_hash: sha256(state), redirect_uri: REDIRECT_URI, environment: "production", created_by: user.id, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() }) });
      await supabase("/rest/v1/qbo_integration_state?on_conflict=provider", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ provider: "quickbooks_online", status: "connection_pending", created_by: user.id }) });
      return json(res, 201, { transaction_id: id, connect_url: `https://qbo.classicvisions.net/qbo/connect?transaction=${encodeURIComponent(id)}` });
    }
    if (action === "command") {
      const user = await requireAdmin(req); if (!user) return json(res, 401, { error: "Authentication required." });
      if (req.method !== "POST" || !["disconnect", "reconcile"].includes(req.body?.command)) return json(res, 400, { error: "Invalid command." });
      const response = await supabase("/rest/v1/qbo_integration_commands", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ command: req.body.command, requested_by: user.id }) });
      return json(res, 202, { id: (await response.json())[0].id, status: "queued" });
    }
    if (action === "connect") {
      const transaction = String(req.query.transaction || "");
      if (!/^[0-9a-f-]{36}$/i.test(transaction)) return json(res, 400, { error: "Invalid connection request." });
      const query = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${transaction}&select=state_hash,expires_at,callback_received_at,completed_at`);
      const row = (await query.json())[0];
      if (!row || row.callback_received_at || row.completed_at || Date.parse(row.expires_at) <= Date.now()) return json(res, 400, { error: "This connection request is no longer valid." });
      // State is held in an HttpOnly cookie only long enough to start Intuit OAuth.
      const state = randomBytes(32).toString("base64url");
      await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${transaction}`, { method: "PATCH", body: JSON.stringify({ state_hash: sha256(state) }) });
      res.setHeader("Set-Cookie", `qbo_tx=${transaction}; Path=/qbo/oauth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
      const url = new URL(INTUIT_AUTHORIZE);
      url.searchParams.set("client_id", env("QBO_CLIENT_ID")); url.searchParams.set("response_type", "code"); url.searchParams.set("scope", "com.intuit.quickbooks.accounting"); url.searchParams.set("redirect_uri", REDIRECT_URI); url.searchParams.set("state", state);
      return res.redirect(302, url.toString());
    }
    if (action === "handoff/claim") {
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
      const supplied = Buffer.from(String(req.headers["x-qbo-handoff-token"] || "")); const expected = Buffer.from(env("QBO_LOCAL_HANDOFF_TOKEN"));
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(res, 401, { error: "Unauthorized." });
      const id = String(req.body?.transaction_id || ""); if (!/^[0-9a-f-]{36}$/i.test(id)) return json(res, 400, { error: "Invalid transaction." });
      const query = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${id}&select=authorization_code_ciphertext,expires_at,claimed_at,completed_at,environment`);
      const row = (await query.json())[0];
      if (!row?.authorization_code_ciphertext || row.claimed_at || row.completed_at || Date.parse(row.expires_at) <= Date.now()) return json(res, 409, { error: "Authorization handoff is unavailable." });
      const claimed = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${id}&claimed_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ claimed_at: new Date().toISOString(), claimed_by: "optilens-local" }) });
      if (!(await claimed.json()).length) return json(res, 409, { error: "Authorization handoff is unavailable." });
      return json(res, 200, { transaction_id: id, code: decryptCode(row.authorization_code_ciphertext), redirect_uri: REDIRECT_URI, environment: row.environment });
    }
    if (action === "handoff/result") {
      if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
      const supplied = Buffer.from(String(req.headers["x-qbo-handoff-token"] || "")); const expected = Buffer.from(env("QBO_LOCAL_HANDOFF_TOKEN"));
      if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return json(res, 401, { error: "Unauthorized." });
      const body = req.body || {}; if (!body.transaction_id || !["connected", "error", "disconnected", "token_refresh_required"].includes(body.status)) return json(res, 400, { error: "Invalid status." });
      await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${encodeURIComponent(body.transaction_id)}`, { method: "PATCH", body: JSON.stringify({ completed_at: new Date().toISOString(), failure_code: body.status === "error" ? "exchange_failed" : null, failure_message_sanitized: body.status === "error" ? "QuickBooks authorization could not be completed." : null }) });
      await supabase("/rest/v1/qbo_integration_state?on_conflict=provider", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ provider: "quickbooks_online", environment: "production", status: body.status, company_name: body.company_name || null, realm_id_masked: body.realm_id_masked || null, connected_at: body.status === "connected" ? (body.connected_at || new Date().toISOString()) : null, updated_at: new Date().toISOString(), last_error_message_sanitized: body.status === "error" ? "QuickBooks authorization could not be completed." : null }) });
      return json(res, 200, { ok: true });
    }
    if (action === "oauth/callback") {
      const code = String(req.query.code || ""); const state = String(req.query.state || ""); const tx = /qbo_tx=([^;]+)/.exec(String(req.headers.cookie || ""))?.[1];
      if (!code || !state || !tx) return json(res, 400, { error: "The authorization response could not be validated." });
      const query = await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${encodeURIComponent(tx)}&select=id,state_hash,expires_at,callback_received_at,completed_at`);
      const row = (await query.json())[0];
      if (!row || row.state_hash !== sha256(state) || row.callback_received_at || row.completed_at || Date.parse(row.expires_at) <= Date.now()) return json(res, 400, { error: "The authorization response is invalid or expired." });
      await supabase(`/rest/v1/qbo_oauth_transactions?id=eq.${encodeURIComponent(tx)}&callback_received_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ authorization_code_ciphertext: encryptCode(code), callback_received_at: new Date().toISOString(), realm_id_masked: String(req.query.realmId || "").slice(-4) || null }) });
      res.setHeader("Set-Cookie", "qbo_tx=; Path=/qbo/oauth/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
      return res.redirect(303, `${env("QBO_ADMIN_SUCCESS_URL")}?qbo=connection-pending`);
    }
    return json(res, 404, { error: "Not found." });
  } catch (error) { return json(res, 503, { error: "QuickBooks connection is temporarily unavailable." }); }
}
