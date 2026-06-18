// External REST API v1 — keyed access to core domain data.
// Auth: x-api-key header. Verified via public.verify_api_key RPC.
// Routes: /api-v1/<resource>[/<id>]
//   GET  /<resource>           -> list (?limit=&offset=&order=)
//   GET  /<resource>/<id>      -> single
//   POST /<resource>           -> insert
//   PATCH /<resource>/<id>     -> update
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildOpenApiSpec, SWAGGER_UI_HTML } from "./openapi.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

type ResourceConfig = {
  table: string;
  readScope: string;
  writeScope: string;
  costFields?: string[]; // stripped from responses
  idType?: "uuid" | "int";
  insertable?: string[]; // allowlist of writable columns; default = all
  updatable?: string[];
};

const RESOURCES: Record<string, ResourceConfig> = {
  catalog: {
    table: "price_catalog",
    readScope: "catalog:read",
    writeScope: "catalog:write",
  },
  contacts: {
    table: "contacts",
    readScope: "contacts:read",
    writeScope: "contacts:write",
  },
  customers: {
    table: "customers",
    readScope: "customers:read",
    writeScope: "customers:write",
    idType: "int",
  },
  orders: {
    table: "orders",
    readScope: "orders:read",
    writeScope: "orders:write",
  },
  lenses: {
    table: "lenses",
    readScope: "products:read",
    writeScope: "products:write",
    costFields: ["base_price", "cost"],
  },
  supplies: {
    table: "supplies",
    readScope: "products:read",
    writeScope: "products:write",
    costFields: ["base_price", "cost"],
  },
  addons: {
    table: "addons",
    readScope: "products:read",
    writeScope: "products:write",
    costFields: ["cost"],
  },
  // Moonshot — generic tables (read/write parity). Update as needed.
  moonshot_rocks: { table: "rocks", readScope: "moonshot:read", writeScope: "moonshot:write" },
  moonshot_todos: { table: "todos", readScope: "moonshot:read", writeScope: "moonshot:write" },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripCost(rows: any, fields?: string[]): any {
  if (!fields || fields.length === 0) return rows;
  const strip = (r: any) => {
    if (!r || typeof r !== "object") return r;
    const out = { ...r };
    for (const f of fields) delete out[f];
    return out;
  };
  return Array.isArray(rows) ? rows.map(strip) : strip(rows);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  // strip /functions/v1/api-v1 prefix
  const parts = url.pathname.split("/").filter(Boolean);
  const apiIdx = parts.indexOf("api-v1");
  const segments = apiIdx >= 0 ? parts.slice(apiIdx + 1) : parts;
  const [resource, id] = segments;

  // Public docs endpoints — no API key required.
  const serverUrl = `${url.origin}/functions/v1/api-v1`;
  if (req.method === "GET" && resource === "openapi.json") {
    return new Response(JSON.stringify(buildOpenApiSpec(serverUrl)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (req.method === "GET" && resource === "docs") {
    return new Response(SWAGGER_UI_HTML, {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  if (!resource) {
    return json({
      name: "Classic Visions API",
      version: "v1",
      resources: Object.keys(RESOURCES),
    });
  }

  const cfg = RESOURCES[resource];
  if (!cfg) return json({ error: `Unknown resource '${resource}'.` }, 404);

  // Auth
  const token = req.headers.get("x-api-key") ?? "";
  if (!token) return json({ error: "Missing x-api-key header." }, 401);

  const { data: keyRows, error: keyErr } = await supabase.rpc("verify_api_key", { p_token: token });
  if (keyErr) return json({ error: "Auth failure", detail: keyErr.message }, 500);
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return json({ error: "Invalid or revoked API key." }, 401);

  const scopes: string[] = key.scopes ?? [];
  const needsWrite = req.method === "POST" || req.method === "PATCH";
  const required = needsWrite ? cfg.writeScope : cfg.readScope;
  if (!scopes.includes(required)) {
    return json({ error: `Missing required scope: ${required}` }, 403);
  }

  let status = 200;
  let respBody: any = null;

  try {
    if (req.method === "GET" && !id) {
      const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 500);
      const offset = parseInt(url.searchParams.get("offset") ?? "0", 10) || 0;
      const order = url.searchParams.get("order") ?? "created_at.desc";
      const [col, dir] = order.split(".");
      const q = supabase.from(cfg.table).select("*", { count: "exact" })
        .range(offset, offset + limit - 1)
        .order(col || "created_at", { ascending: (dir || "desc") === "asc" });
      const { data, error, count } = await q;
      if (error) throw error;
      respBody = { data: stripCost(data, cfg.costFields), count, limit, offset };
    } else if (req.method === "GET" && id) {
      const { data, error } = await supabase.from(cfg.table).select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!data) { status = 404; respBody = { error: "Not found" }; }
      else respBody = { data: stripCost(data, cfg.costFields) };
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "Invalid JSON body." }, 400);
      if (resource === "catalog") {
        // Route catalog writes through this key's draft pricelist_version.
        // If the draft has been saved as a usable template, we keep using
        // that same version — never write directly to the live price_catalog.
        const { data: draftId, error: draftErr } = await supabase.rpc(
          "api_get_or_create_catalog_draft",
          { p_api_key_id: key.id },
        );
        if (draftErr) throw draftErr;
        const row = { ...body, pricelist_version_id: draftId };
        const { data, error } = await supabase
          .from("pricelist_catalog_rows")
          .insert(row)
          .select()
          .maybeSingle();
        if (error) throw error;
        status = 201;
        respBody = { data, draft_pricelist_version_id: draftId };
      } else {
        const { data, error } = await supabase.from(cfg.table).insert(body).select().maybeSingle();
        if (error) throw error;
        status = 201;
        respBody = { data: stripCost(data, cfg.costFields) };
      }
    } else if (req.method === "PATCH" && id) {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== "object") return json({ error: "Invalid JSON body." }, 400);
      if (resource === "catalog") {
        const { data: draftId, error: draftErr } = await supabase.rpc(
          "api_get_or_create_catalog_draft",
          { p_api_key_id: key.id },
        );
        if (draftErr) throw draftErr;
        // Scope the update to the key's own draft so callers cannot mutate
        // rows belonging to other pricelist versions.
        const { data, error } = await supabase
          .from("pricelist_catalog_rows")
          .update(body)
          .eq("id", id)
          .eq("pricelist_version_id", draftId)
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!data) { status = 404; respBody = { error: "Row not found in current draft." }; }
        else respBody = { data, draft_pricelist_version_id: draftId };
      } else {
        const { data, error } = await supabase.from(cfg.table).update(body).eq("id", id).select().maybeSingle();
        if (error) throw error;
        respBody = { data: stripCost(data, cfg.costFields) };
      }
    } else {
      status = 405;
      respBody = { error: "Method not allowed." };
    }
  } catch (err: any) {
    status = 400;
    respBody = { error: err?.message ?? "Request failed" };
  }

  // Audit (best-effort)
  await supabase.from("api_audit_log").insert({
    api_key_id: key.id,
    method: req.method,
    resource,
    resource_id: id ?? null,
    status,
    request_summary: { path: url.pathname, query: Object.fromEntries(url.searchParams) },
    response_summary: status >= 400 ? respBody : { ok: true },
    ip: req.headers.get("x-forwarded-for") ?? null,
  });

  return json(respBody, status);
});
