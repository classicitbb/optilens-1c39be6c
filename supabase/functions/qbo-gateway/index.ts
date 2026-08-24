// Narrow server-side broker for the Vercel QBO gateway.
//
// The Vercel project must not receive the Lovable/Supabase service-role key.
// Instead, it presents a per-integration x-api-key. This function validates
// that scoped key, then uses Lovable Cloud's managed service role internally
// for the small QBO data surface below.

import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_TABLES = new Set([
  "user_roles",
  "qbo_oauth_transactions",
  "qbo_integration_state",
  "qbo_integration_commands",
]);
const ALLOWED_RPCS = new Set(["qbo_consume_rate_limit"]);
const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function serviceHeaders() {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("Missing managed Supabase service key.");
  return { apikey: key, Authorization: `Bearer ${key}` };
}

function allowedPath(path: string) {
  const parsed = new URL(path, "https://qbo-gateway.invalid");
  if (parsed.searchParams.has("select") && parsed.searchParams.get("select")?.includes(";")) {
    return false;
  }
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0] !== "rest" || parts[1] !== "v1") return false;
  if (parts[2] === "rpc") return parts.length === 3 + 1 && ALLOWED_RPCS.has(parts[3]);
  return parts.length >= 3 && parts.length <= 4 && ALLOWED_TABLES.has(parts[2]);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const token = req.headers.get("x-api-key")?.trim() ?? "";
  if (!token) return json({ error: "Missing x-api-key header." }, 401);
  const { data: keyRows, error: keyError } = await supabase.rpc("verify_api_key", { p_token: token });
  if (keyError) return json({ error: "API key verification failed." }, 500);
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key || !Array.isArray(key.scopes) || !key.scopes.includes("gateway:agent")) {
    return json({ error: "Invalid or insufficient API key." }, 403);
  }

  const input = await req.json().catch(() => null) as {
    path?: unknown;
    method?: unknown;
    headers?: unknown;
    body?: unknown;
  } | null;
  const path = typeof input?.path === "string" ? input.path : "";
  const method = typeof input?.method === "string" ? input.method.toUpperCase() : "GET";
  if (!path || !allowedPath(path) || !ALLOWED_METHODS.has(method)) {
    return json({ error: "QBO gateway path is not allowed." }, 403);
  }

  const forwarded = input?.headers && typeof input.headers === "object" ? input.headers as Record<string, unknown> : {};
  const headers: Record<string, string> = {
    ...serviceHeaders(),
    "Content-Type": "application/json",
  };
  if (typeof forwarded.Prefer === "string") headers.Prefer = forwarded.Prefer;

  const body = method === "GET" ? undefined : JSON.stringify(input?.body ?? null);
  const response = await fetch(`${Deno.env.get("SUPABASE_URL")}${path}`, { method, headers, body });
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: { "Content-Type": response.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
  });
});
