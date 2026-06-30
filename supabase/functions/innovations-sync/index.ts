// Innovations -> CV cloud sync receiver (v1: customers, contacts).
// Server-to-server. Auth: x-api-key (scope `sync:write`), verified via
// public.verify_api_key. Idempotent upsert by immutable Innovations id.
// Contract: docs/integration-innovations-sync-contract.md
//
//   POST /functions/v1/innovations-sync/<entity>
//   body: { "dry_run": true, "records": [ { ...mapped row... } ] }
//
// Machine API (no browser origin) -> permissive CORS, matching api-v1.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REQUIRED_SCOPE = "sync:write";

// Per-entity upsert config: target table, conflict key, and the writable
// column allowlist. Anything outside the allowlist is dropped before write.
type EntityConfig = {
  table: string;
  conflictKey: string;
  required: string;
  allow: string[];
};

const ENTITIES: Record<string, EntityConfig> = {
  customers: {
    table: "customers",
    conflictKey: "innovations_customer_id",
    required: "innovations_customer_id",
    allow: [
      "innovations_customer_id", "name", "account_number", "address",
      "country_code", "pipeline_stage", "type", "email", "phone", "notes",
    ],
  },
  contacts: {
    table: "contacts",
    conflictKey: "innovations_contact_id",
    required: "innovations_contact_id",
    allow: [
      "innovations_contact_id", "innovations_parent_customer_id", "name",
      "business_name", "email", "phone", "street", "street2", "city", "state",
      "zip", "country", "country_code", "is_company", "status",
      "pipeline_stage", "type", "notes",
    ],
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pick(row: Record<string, unknown>, allow: string[]): Record<string, unknown> {
  const set = new Set(allow);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (set.has(k)) out[k] = v;
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("innovations-sync");
  const entity = (idx >= 0 ? parts[idx + 1] : parts[parts.length - 1]) ?? "";

  const cfg = ENTITIES[entity];
  if (!cfg) {
    return json({ error: `Unknown or unsupported entity '${entity}'. Supported: ${Object.keys(ENTITIES).join(", ")}.` }, 404);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Auth
  const token = req.headers.get("x-api-key") ?? "";
  if (!token) return json({ error: "Missing x-api-key header." }, 401);
  const { data: keyRows, error: keyErr } = await supabase.rpc("verify_api_key", { p_token: token });
  if (keyErr) return json({ error: "Auth failure", detail: keyErr.message }, 500);
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return json({ error: "Invalid or revoked API key." }, 401);
  const scopes: string[] = key.scopes ?? [];
  if (!scopes.includes(REQUIRED_SCOPE)) {
    return json({ error: `Missing required scope: ${REQUIRED_SCOPE}` }, 403);
  }

  // Body
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as any).records)) {
    return json({ error: "Body must be { dry_run?: boolean, records: [] }." }, 400);
  }
  const dryRun = (raw as any).dry_run !== false; // default true
  const records = (raw as any).records as Record<string, unknown>[];
  const started = new Date().toISOString();

  // Map + validate
  const mapped: Record<string, unknown>[] = [];
  const invalid: { index: number; error: string }[] = [];
  records.forEach((r, i) => {
    if (!r || typeof r !== "object") { invalid.push({ index: i, error: "not an object" }); return; }
    const row = pick(r, cfg.allow);
    if (row[cfg.required] === undefined || row[cfg.required] === null || row[cfg.required] === "") {
      invalid.push({ index: i, error: `missing ${cfg.required}` });
      return;
    }
    mapped.push(row);
  });

  let upserted = 0;
  let failed = invalid.length;
  const errors: string[] = invalid.slice(0, 5).map((x) => `record ${x.index}: ${x.error}`);

  if (!dryRun && mapped.length) {
    // Try a single batch upsert; on failure, isolate per-row and dead-letter.
    const { error: batchErr } = await supabase
      .from(cfg.table)
      .upsert(mapped, { onConflict: cfg.conflictKey, ignoreDuplicates: false });
    if (!batchErr) {
      upserted = mapped.length;
    } else {
      for (const row of mapped) {
        const { error: rowErr } = await supabase
          .from(cfg.table)
          .upsert(row, { onConflict: cfg.conflictKey, ignoreDuplicates: false });
        if (rowErr) {
          failed++;
          if (errors.length < 5) errors.push(`${row[cfg.required]}: ${rowErr.message}`);
          await supabase.from("innovations_sync_dead_letters").insert({
            entity, external_id: String(row[cfg.required]), api_key_id: key.id,
            last_error: rowErr.message, source_payload: row, status: "pending",
          });
        } else {
          upserted++;
        }
      }
    }
  }

  const status = failed === 0 ? "success" : upserted > 0 ? "partial" : "failed";

  // Run log (best-effort)
  await supabase.from("innovations_sync_runs").insert({
    entity, api_key_id: key.id, dry_run: dryRun,
    received: records.length, upserted, failed, status,
    error_summary: errors.length ? errors.join(" | ") : null,
    started_at: started, finished_at: new Date().toISOString(),
  });

  return json({
    entity,
    dry_run: dryRun,
    received: records.length,
    upserted,
    failed,
    status,
    sample: mapped.slice(0, 3),
    errors,
  }, status === "failed" ? 422 : 200);
});
