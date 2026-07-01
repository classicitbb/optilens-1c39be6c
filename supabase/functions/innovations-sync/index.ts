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

// Per-entity upsert config: target table, conflict key, the write scope required
// (reusing the existing per-resource scopes shown in the admin API Keys screen),
// and the writable column allowlist. Anything outside the allowlist is dropped.
type EntityConfig = {
  table: string;
  conflictKey: string;
  required: string;
  scope: string;
  allow: string[];
};

const ENTITIES: Record<string, EntityConfig> = {
  customers: {
    table: "customers",
    conflictKey: "innovations_customer_id",
    required: "innovations_customer_id",
    scope: "customers:write",
    // `type` and `pipeline_stage` are intentionally excluded — they carry CHECK
    // constraints (customers_type_check) whose allowed values we don't set from
    // the ERP. Dropped here so the office payload can't trip them regardless.
    allow: [
      "innovations_customer_id",
      "name",
      "account_number",
      "address",
      "country_code",
      "email",
      "phone",
      "notes",
    ],
  },
  contacts: {
    table: "contacts",
    conflictKey: "innovations_contact_id",
    required: "innovations_contact_id",
    scope: "contacts:write",
    allow: [
      "innovations_contact_id",
      "innovations_parent_customer_id",
      "name",
      "business_name",
      "email",
      "phone",
      "street",
      "street2",
      "city",
      "state",
      "zip",
      "country",
      "country_code",
      "is_company",
      "status",
      "pipeline_stage",
      "type",
      "notes",
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

const VERSION = "2026-07-01.2-account-number-link";
const MAX_RECORDS_PER_REQUEST = 1000;

// Customers get individual resolution instead of a blind onConflict(innovations_customer_id)
// upsert. Reason: a website signup can pre-create a customers row (company contact +
// account_number, no innovations_customer_id yet — see sync_customer_portal_identity)
// before Innovations ever pushes that account. When Innovations does push it, matching
// only on innovations_customer_id would insert a duplicate row instead of adopting the
// pre-created one. account_number is the sole link between a website account and its
// Innovations account, so it's the fallback match key here.
async function upsertCustomerRow(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  const { data: byInnovationsId, error: lookupErr } = await supabase
    .from("customers")
    .select("id")
    .eq("innovations_customer_id", row.innovations_customer_id as any)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr };

  if (byInnovationsId) {
    return await supabase.from("customers").update(row).eq("id", (byInnovationsId as any).id);
  }

  const acctNumber = row.account_number;
  if (typeof acctNumber === "string" && acctNumber.trim() !== "") {
    const { data: byAccountNumber, error: acctErr } = await supabase
      .from("customers")
      .select("id")
      .eq("account_number", acctNumber as any)
      .is("innovations_customer_id", null)
      .maybeSingle();
    if (acctErr) return { error: acctErr };
    if (byAccountNumber) {
      // Adopt the pre-created (e.g. website signup) row: fill in the immutable
      // Innovations id and refresh the rest of the mapped fields.
      return await supabase.from("customers").update(row).eq("id", (byAccountNumber as any).id);
    }
  }

  return await supabase.from("customers").insert(row);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("innovations-sync");
  const entity = (idx >= 0 ? parts[idx + 1] : parts[parts.length - 1]) ?? "";
  const id = (idx >= 0 ? parts[idx + 2] : undefined) ?? ""; // e.g. _requests/<id>

  // Public version check (no auth) — lets us confirm a deploy actually landed.
  if (req.method === "GET" && (!entity || entity === "innovations-sync" || entity === "version")) {
    return json({ name: "innovations-sync", version: VERSION, entities: Object.keys(ENTITIES) });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );


  // Auth (all paths)
  const token = req.headers.get("x-api-key") ?? "";
  if (!token) return json({ error: "Missing x-api-key header." }, 401);
  const { data: keyRows, error: keyErr } = await supabase.rpc("verify_api_key", { p_token: token });
  if (keyErr) return json({ error: "Auth failure", detail: keyErr.message }, 500);
  const key = Array.isArray(keyRows) ? keyRows[0] : keyRows;
  if (!key) return json({ error: "Invalid or revoked API key." }, 401);
  const scopes: string[] = key.scopes ?? [];

  // Control plane: the office agent claims/completes CV-initiated "Sync now"
  // requests (the cloud cannot call the office, so it queues; the office polls).
  if (entity === "_requests") {
    if (!scopes.includes("customers:write") && !scopes.includes("contacts:write")) {
      return json({ error: "Missing required scope: customers:write or contacts:write" }, 403);
    }
    if (req.method === "GET" && id === "next") {
      const { data: pending } = await supabase
        .from("innovations_sync_requests")
        .select("id,entities")
        .eq("status", "pending")
        .order("requested_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!pending) return json({ request: null });
      const { data: claimed, error: claimErr } = await supabase
        .from("innovations_sync_requests")
        .update({ status: "claimed", claimed_at: new Date().toISOString() })
        .eq("id", (pending as any).id)
        .eq("status", "pending")
        .select("id,entities")
        .maybeSingle();
      if (claimErr || !claimed) return json({ request: null }); // lost the race
      return json({ request: claimed });
    }
    if (req.method === "POST" && id === "complete") {
      const body = (await req.json().catch(() => null)) as any;
      if (!body || !body.id) return json({ error: "Body must be { id, ok, result }." }, 400);
      const { data: updated, error: updErr } = await supabase
        .from("innovations_sync_requests")
        .update({
          status: body.ok ? "done" : "failed",
          finished_at: new Date().toISOString(),
          result: body.result ?? null,
        })
        .eq("id", body.id)
        .eq("status", "claimed")
        .select("id")
        .maybeSingle();
      if (updErr) return json({ error: "Update failed", detail: updErr.message }, 500);
      if (!updated) return json({ error: "Request not found or not in claimed state." }, 409);
      return json({ ok: true });
    }
    return json({ error: "Unsupported _requests operation." }, 404);
  }

  const cfg = ENTITIES[entity];
  if (!cfg) {
    return json(
      { error: `Unknown or unsupported entity '${entity}'. Supported: ${Object.keys(ENTITIES).join(", ")}.` },
      404,
    );
  }
  if (!scopes.includes(cfg.scope)) {
    return json({ error: `Missing required scope: ${cfg.scope}` }, 403);
  }

  // Body
  const raw = await req.json().catch(() => null);
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as any).records)) {
    return json({ error: "Body must be { dry_run?: boolean, records: [] }." }, 400);
  }
  const dryRun = (raw as any).dry_run !== false; // default true
  const records = (raw as any).records as Record<string, unknown>[];
  if (records.length > MAX_RECORDS_PER_REQUEST) {
    return json(
      { error: `Too many records. Max ${MAX_RECORDS_PER_REQUEST} per request, got ${records.length}.` },
      413,
    );
  }
  const started = new Date().toISOString();

  // Map + validate
  const mapped: Record<string, unknown>[] = [];
  const invalid: { index: number; error: string }[] = [];
  records.forEach((r, i) => {
    if (!r || typeof r !== "object") {
      invalid.push({ index: i, error: "not an object" });
      return;
    }
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

  if (!dryRun && mapped.length && entity === "customers") {
    // Individual resolution per row — see upsertCustomerRow for why this can't
    // be a blind onConflict batch upsert.
    for (const row of mapped) {
      const { error: rowErr } = await upsertCustomerRow(supabase, row);
      if (rowErr) {
        failed++;
        if (errors.length < 5) errors.push(`${row[cfg.required]}: ${rowErr.message}`);
        await supabase.from("innovations_sync_dead_letters").insert({
          entity,
          external_id: String(row[cfg.required]),
          api_key_id: key.id,
          last_error: rowErr.message,
          source_payload: row,
          status: "pending",
        });
      } else {
        upserted++;
      }
    }
  } else if (!dryRun && mapped.length) {
    // Try a single batch upsert; on failure, isolate per-row and dead-letter.
    const { error: batchErr } = await supabase
      .from(cfg.table)
      .upsert(mapped, { onConflict: cfg.conflictKey, ignoreDuplicates: false });
    if (!batchErr) {
      upserted = mapped.length;
    } else {
      for (const row of mapped) {
        let { error: rowErr } = await supabase
          .from(cfg.table)
          .upsert(row, { onConflict: cfg.conflictKey, ignoreDuplicates: false });
        // Contacts have a unique-name constraint (used by CRM name-upserts, so it
        // stays). ERP names legitimately repeat — on a name collision, retry once
        // with a unique suffix so the person still lands as a distinct row.
        if (rowErr && entity === "contacts" && /contacts_name_key|unique/i.test(rowErr.message || "") && row.name) {
          const retryRow = { ...row, name: `${row.name} (#${row.innovations_contact_id})` };
          const retry = await supabase
            .from(cfg.table)
            .upsert(retryRow, { onConflict: cfg.conflictKey, ignoreDuplicates: false });
          rowErr = retry.error;
        }
        if (rowErr) {
          failed++;
          if (errors.length < 5) errors.push(`${row[cfg.required]}: ${rowErr.message}`);
          await supabase.from("innovations_sync_dead_letters").insert({
            entity,
            external_id: String(row[cfg.required]),
            api_key_id: key.id,
            last_error: rowErr.message,
            source_payload: row,
            status: "pending",
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
    entity,
    api_key_id: key.id,
    dry_run: dryRun,
    received: records.length,
    upserted,
    failed,
    status,
    error_summary: errors.length ? errors.join(" | ") : null,
    started_at: started,
    finished_at: new Date().toISOString(),
  });

  return json(
    {
      entity,
      dry_run: dryRun,
      received: records.length,
      upserted,
      failed,
      status,
      sample: mapped.slice(0, 3),
      errors,
    },
    status === "failed" ? 422 : 200,
  );
});
