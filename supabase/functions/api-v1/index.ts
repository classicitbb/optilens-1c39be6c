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
    table: "catalog_live",
    readScope: "catalog:read",
    writeScope: "catalog:write",
    // Writes route to pricelist_catalog_rows (handled specially below).
    insertable: [
      "row_label", "category", "section_key", "sort_order",
      "lens_id", "supply_id", "addon_id",
      "price", "currency", "notes", "is_active",
    ],
    updatable: [
      "row_label", "category", "section_key", "sort_order",
      "price", "currency", "notes", "is_active",
    ],
  },
  contacts: {
    table: "contacts",
    readScope: "contacts:read",
    writeScope: "contacts:write",
    insertable: [
      "name", "first_name", "last_name", "email", "phone", "mobile",
      "type", "is_company", "business_name", "parent_id",
      "address", "city", "state", "zip", "country",
      "status", "pipeline_stage", "notes",
    ],
    updatable: [
      "name", "first_name", "last_name", "email", "phone", "mobile",
      "type", "is_company", "business_name", "parent_id",
      "address", "city", "state", "zip", "country",
      "status", "pipeline_stage", "notes",
    ],
  },
  customers: {
    table: "customers",
    readScope: "customers:read",
    writeScope: "customers:write",
    idType: "int",
    insertable: [
      "name", "email", "phone", "address",
      "pipeline_stage", "contact_id", "assigned_pricelist_id",
    ],
    updatable: [
      "name", "email", "phone", "address",
      "pipeline_stage", "contact_id", "assigned_pricelist_id",
    ],
  },
  orders: {
    table: "orders",
    readScope: "orders:read",
    writeScope: "orders:write",
    // user_id, totals, payment fields are NOT writable via external API.
    insertable: [
      "status", "customer_name", "contact_email", "contact_phone",
      "shipping_address", "billing_address", "checkout_method",
    ],
    updatable: [
      "status", "customer_name", "contact_email", "contact_phone",
      "shipping_address", "billing_address",
    ],
  },
  lenses: {
    table: "lenses",
    readScope: "products:read",
    writeScope: "products:write",
    costFields: ["base_price", "cost"],
    // base_price/cost are intentionally NOT in the allowlist.
    insertable: [
      "name", "supplier_id", "brand_id", "material_id", "mftype_id",
      "lenstype_id", "finishtype_id", "index_value", "sell_price",
      "sph_min", "sph_max", "cyl_min", "cyl_max", "add_min", "add_max",
      "is_active", "show_in_pricelist", "show_in_ws_pricelist", "show_on_website",
      "full_lab", "notes", "pricing_category", "pricing_index",
    ],
    updatable: [
      "name", "supplier_id", "brand_id", "material_id", "mftype_id",
      "lenstype_id", "finishtype_id", "index_value", "sell_price",
      "sph_min", "sph_max", "cyl_min", "cyl_max", "add_min", "add_max",
      "is_active", "show_in_pricelist", "show_in_ws_pricelist", "show_on_website",
      "full_lab", "notes", "pricing_category", "pricing_index",
    ],
  },
  supplies: {
    table: "supplies",
    readScope: "products:read",
    writeScope: "products:write",
    costFields: ["base_price", "cost"],
    insertable: [
      "name", "category", "description", "sku", "sell_price", "unit",
      "quantity_per_unit", "is_active", "show_on_website", "image_url",
      "notes", "supplier_id", "brand_id", "preferred", "stocked",
      "show_in_pricelist", "bin", "detail", "currency",
      "bb_item", "duty_added", "vat_paid", "labour_added", "stk_wspl",
    ],
    updatable: [
      "name", "category", "description", "sku", "sell_price", "unit",
      "quantity_per_unit", "is_active", "show_on_website", "image_url",
      "notes", "supplier_id", "brand_id", "preferred", "stocked",
      "show_in_pricelist", "bin", "detail", "currency",
      "bb_item", "duty_added", "vat_paid", "labour_added", "stk_wspl",
    ],
  },
  addons: {
    table: "addons",
    readScope: "products:read",
    writeScope: "products:write",
    costFields: ["cost"],
    insertable: [
      "name", "sku", "category", "description", "price",
      "is_active", "is_auto", "auto_rule", "show_on_website",
      "sort_order", "supplier_id",
    ],
    updatable: [
      "name", "sku", "category", "description", "price",
      "is_active", "is_auto", "auto_rule", "show_on_website",
      "sort_order", "supplier_id",
    ],
  },
  moonshot_rocks: { table: "rocks", readScope: "moonshot:read", writeScope: "moonshot:write" },
  moonshot_todos: { table: "todos", readScope: "moonshot:read", writeScope: "moonshot:write" },
};

function pickFields(body: Record<string, any>, allowed?: string[]): Record<string, any> {
  if (!allowed || allowed.length === 0) return body;
  const allow = new Set(allowed);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(body)) {
    if (allow.has(k)) out[k] = v;
  }
  return out;
}

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
      const orderParam = url.searchParams.get("order");
      const orderProvided = !!orderParam;
      const order = orderParam ?? "created_at.desc";
      const [col, dir] = order.split(".");
      const ascending = (dir || "desc") === "asc";
      const orderCol = col || "created_at";
      const runList = (oc: string) =>
        supabase.from(cfg.table).select("*", { count: "exact" })
          .range(offset, offset + limit - 1)
          .order(oc, { ascending });
      let { data, error, count } = await runList(orderCol);
      // Not every table has the default `created_at` column. If the caller did
      // not request an explicit order, fall back to the primary key.
      if (
        error &&
        !orderProvided &&
        (error.code === "42703" || /does not exist/i.test(error.message ?? ""))
      ) {
        ({ data, error, count } = await runList("id"));
      }
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
