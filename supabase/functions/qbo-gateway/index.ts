// qbo-gateway — narrow, allowlisted PostgREST proxy for the QBO OAuth gateway
// (Vercel) and OptiLens Local. Those callers have no Supabase session and must
// never hold the service role key; they authenticate with a scoped x-api-key
// (scope `gateway:agent`) and this function performs the privileged call with
// the platform-managed service role, which is never returned to the caller.
//
//   POST /functions/v1/qbo-gateway
//   body: { "path": "/rest/v1/qbo_integration_state?select=*", "method": "GET",
//           "headers": { "Prefer": "return=representation" }, "body": {...} }
//
// Only the tables/RPC in ALLOWED_RESOURCES are reachable. Everything else 403s.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUIRED_SCOPE = "gateway:agent";

const ALLOWED_TABLES = new Set([
  "user_roles",
  "qbo_oauth_transactions",
  "qbo_integration_state",
  "qbo_integration_commands",
]);

const ALLOWED_RPCS = new Set(["qbo_consume_rate_limit"]);

const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

// Headers a caller may pass through to PostgREST. Auth headers are never
// forwarded: this function supplies them from the managed service role.
const FORWARDABLE_HEADERS = new Set(["prefer", "range", "range-unit", "content-type", "accept"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function resolveTarget(rawPath: unknown): { path: string } | { error: string } {
  if (typeof rawPath !== "string" || rawPath.trim() === "") {
    return { error: "`path` is required." };
  }
  const path = rawPath.trim();
  if (!path.startsWith("/rest/v1/")) return { error: "Path is not allowed." };
  if (path.includes("..")) return { error: "Path is not allowed." };

  const afterPrefix = path.slice("/rest/v1/".length);
  const [resourcePart] = afterPrefix.split("?");
  const segments = resourcePart.split("/").filter(Boolean);

  if (segments[0] === "rpc") {
    if (segments.length !== 2 || !ALLOWED_RPCS.has(segments[1])) {
      return { error: "Path is not allowed." };
    }
    return { path };
  }

  if (segments.length !== 1 || !ALLOWED_TABLES.has(segments[0])) {
    return { error: "Path is not allowed." };
  }
  return { path };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Gateway is not configured." }, 500);

  const token = req.headers.get("x-api-key")?.trim() ?? "";
  if (!token) return json({ error: "Missing x-api-key header." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.rpc("verify_api_key", { p_token: token });
  if (error) return json({ error: "Authentication failed." }, 500);
  const key = Array.isArray(data) ? data[0] : data;
  if (!key) return json({ error: "Invalid or revoked API key." }, 401);
  const scopes: string[] = Array.isArray(key.scopes) ? key.scopes : [];
  if (!scopes.includes(REQUIRED_SCOPE)) {
    return json({ error: `Missing required scope: ${REQUIRED_SCOPE}` }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  const target = resolveTarget(payload.path);
  if ("error" in target) return json({ error: target.error }, 403);

  const method = String(payload.method ?? "GET").toUpperCase();
  if (!ALLOWED_METHODS.has(method)) return json({ error: "Method is not allowed." }, 405);

  const headers = new Headers({
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  });
  const requestedHeaders = payload.headers;
  if (requestedHeaders && typeof requestedHeaders === "object" && !Array.isArray(requestedHeaders)) {
    for (const [name, value] of Object.entries(requestedHeaders as Record<string, unknown>)) {
      if (FORWARDABLE_HEADERS.has(name.toLowerCase()) && typeof value === "string") {
        headers.set(name, value);
      }
    }
  }

  const hasBody = method !== "GET" && payload.body !== undefined && payload.body !== null;

  let upstream: Response;
  try {
    upstream = await fetch(`${supabaseUrl}${target.path}`, {
      method,
      headers,
      body: hasBody
        ? typeof payload.body === "string"
          ? payload.body
          : JSON.stringify(payload.body)
        : undefined,
    });
  } catch (fetchError) {
    console.error("qbo-gateway upstream request failed", fetchError);
    return json({ error: "Upstream request failed." }, 502);
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      ...corsHeaders,
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      ...(upstream.headers.get("content-range")
        ? { "Content-Range": upstream.headers.get("content-range")! }
        : {}),
    },
  });
});
