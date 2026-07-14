// Innovations -> CV cloud sync receiver (customers, contacts, statements,
// statement_lines, balances, order_activity). New statements auto-enqueue a "statement ready"
// email to the linked customer — see enqueueStatementReadyEmail below.
// Server-to-server. Auth: x-api-key (scope `sync:write`), verified via
// public.verify_api_key. Idempotent upsert by immutable Innovations id.
// Contract: docs/integration-innovations-sync-contract.md
//
//   POST /functions/v1/innovations-sync/<entity>
//   body: { "dry_run": true, "suppress_email"?: true, "records": [ { ...mapped row... } ] }
//   suppress_email (statements only): skip the "statement ready" email even for
//   newly-inserted rows. Use for historical backfills so old statements don't
//   spam every customer on the first sync.
//
// Machine API (no browser origin) -> permissive CORS, matching api-v1.
import { createClient } from "npm:@supabase/supabase-js@2";
import * as React from "npm:react@18.3.1";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { TEMPLATES } from "../_shared/transactional-email-templates/registry.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
  // The local office service reads this catalog from dbo.EFTInstitutions. It
  // intentionally cannot write portal_url or notes: those are verified and
  // curated by admins in the Bank Payment Portals screen.
  banks: {
    table: "bank_payment_portals",
    conflictKey: "innovations_eft_institution_id",
    required: "innovations_eft_institution_id",
    // Reuse the source's existing customer sync authority; an institution
    // directory is required to route customer EFT payments.
    scope: "customers:write",
    allow: ["innovations_eft_institution_id", "bank_name"],
  },
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
      // Payment routing, sourced from dbo.Customers / dbo.EFTInstitutions. Used
      // to resolve "Pay Balance": card capture vs. redirect to the customer's
      // bank via bank_payment_portals (keyed on eft_institution_name).
      "pay_by_card",
      "pay_by_eft",
      "eft_institution_name",
      "default_payment_type",
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
  // Real posted statements, pushed from optilens-local (source: Innovations
  // dbo.FinARStatements). Not derived from CV website orders.
  statements: {
    table: "statements",
    conflictKey: "innovations_statement_id",
    required: "innovations_statement_id",
    scope: "statements:write",
    allow: [
      "innovations_statement_id",
      "innovations_customer_id",
      "from_date",
      "to_date",
      "statement_date",
      "due_date",
      "opening_balance",
      "closing_balance",
      "transactions",
      "payments",
      "finance_charges",
      "discount",
      "allowance",
      "volume_discount",
      "aging_amount_1",
      "aging_amount_2",
      "aging_amount_3",
      "aging_amount_4",
      "status",
      "void",
      "printed",
      "innovations_emailed",
    ],
  },
  // Line items per statement (source: Innovations dbo.FinARStatementItems).
  // No customer/account_number resolution needed — scoped via
  // innovations_statement_id, so this stays on the generic batch-upsert path.
  statement_lines: {
    table: "statement_lines",
    conflictKey: "innovations_statement_item_id",
    required: "innovations_statement_item_id",
    scope: "statements:write",
    allow: [
      "innovations_statement_item_id",
      "innovations_statement_id",
      "order_type",
      "order_type_name",
      "invoice_id",
      "order_id",
      "reference",
      "patient",
      "payment_method",
      "post_date",
      "amount",
    ],
  },
  // Per-customer balance snapshot (source: Innovations dbo.CustomerBalances).
  // Refreshed wholesale on each sync — no history, just current values.
  balances: {
    table: "balances",
    conflictKey: "innovations_customer_id",
    required: "innovations_customer_id",
    scope: "balances:write",
    allow: [
      "innovations_customer_id",
      "credit_limit",
      "current_balance",
      "last_statement_amount",
      "last_statement_date",
      "last_payment_amount",
      "last_payment_date",
    ],
  },
  // Per-customer order-activity snapshot (source: Innovations order/job data,
  // pushed by optilens-local — see docs/codex/SPEC_A_order_activity_kickoff.md).
  // Drives the CRM retention alarm via public.customer_order_health. Lands on
  // the generic batch-upsert path keyed on innovations_customer_id; the
  // order_activity_link_contact trigger resolves contact_id on write. Reuses
  // balances:write — same optilens-local per-customer snapshot authority, so the
  // existing push key needs no new scope.
  order_activity: {
    table: "order_activity",
    conflictKey: "innovations_customer_id",
    required: "innovations_customer_id",
    scope: "balances:write",
    allow: [
      "innovations_customer_id",
      "last_order_date",
      "orders_last_7_days",
      "orders_last_30_days",
      "orders_last_90_days",
      "avg_gap_days",
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

const VERSION = "2026-07-13.1-order-activity";
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
    return await supabase
      .from("customers")
      .update(row)
      .eq("id", (byInnovationsId as any).id);
  }

  const acctNumber = row.account_number;
  if (typeof acctNumber === "string" && acctNumber.trim() !== "") {
    const { data: accountMatches, error: acctErr } = await supabase
      .rpc("find_customer_by_account_number", { p_account_number: acctNumber });
    if (acctErr) return { error: acctErr };
    const byAccountNumber = Array.isArray(accountMatches)
      ? accountMatches.find((match: any) => match && match.innovations_customer_id == null)
      : null;
    if (byAccountNumber) {
      // Adopt the pre-created (e.g. website signup) row: fill in the immutable
      // Innovations id and refresh the rest of the mapped fields.
      return await supabase
        .from("customers")
        .update(row)
        .eq("id", (byAccountNumber as any).id);
    }
  }

  return await supabase.from("customers").insert(row);
}

// Statements/balances arrive keyed only by innovations_customer_id — resolve
// customer_id/account_number against the already-synced customers table (same
// idea as upsertCustomerRow's fallback, just one direction: customers always
// sync before statements/balances in a given run).
async function resolveCustomerLink(
  supabase: ReturnType<typeof createClient>,
  innovationsCustomerId: unknown,
): Promise<{ customer_id: number | null; account_number: string | null }> {
  const { data } = await supabase
    .from("customers")
    .select("id, account_number")
    .eq("innovations_customer_id", innovationsCustomerId as any)
    .maybeSingle();
  if (!data) return { customer_id: null, account_number: null };
  return { customer_id: (data as any).id, account_number: (data as any).account_number ?? null };
}

async function upsertStatementRow(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, unknown>,
): Promise<{ error: { message: string } | null; isNew: boolean }> {
  const link = await resolveCustomerLink(supabase, row.innovations_customer_id);
  const enriched = { ...row, customer_id: link.customer_id, account_number: link.account_number };

  const { data: existing, error: lookupErr } = await supabase
    .from("statements")
    .select("id")
    .eq("innovations_statement_id", row.innovations_statement_id as any)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr, isNew: false };

  if (existing) {
    const { error } = await supabase
      .from("statements")
      .update(enriched)
      .eq("id", (existing as any).id);
    return { error, isNew: false };
  }
  const { error } = await supabase.from("statements").insert(enriched);
  return { error, isNew: !error };
}

async function upsertBalanceRow(
  supabase: ReturnType<typeof createClient>,
  row: Record<string, unknown>,
): Promise<{ error: { message: string } | null }> {
  const link = await resolveCustomerLink(supabase, row.innovations_customer_id);
  const enriched = { ...row, customer_id: link.customer_id, account_number: link.account_number };
  return await supabase
    .from("balances")
    .upsert(enriched, { onConflict: "innovations_customer_id", ignoreDuplicates: false });
}

// Fired once per genuinely NEW statement (never on a resync/update of one we've
// already seen). Renders the same way send-transactional-email does, but
// enqueues directly — that function requires a privileged user JWT, and this
// receiver only ever has a service-role context (x-api-key auth).
async function enqueueStatementReadyEmail(
  supabase: ReturnType<typeof createClient>,
  statementRow: Record<string, unknown>,
): Promise<void> {
  try {
    const custId = statementRow.customer_id;
    if (!custId) return; // no linked customer yet — nothing to email
    const { data: customer } = await supabase
      .from("customers")
      .select("name, email, account_number")
      .eq("id", custId as any)
      .maybeSingle();
    const recipient = (customer as any)?.email;
    if (!recipient || typeof recipient !== "string" || !recipient.trim()) return;

    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("id")
      .eq("email", recipient.toLowerCase())
      .maybeSingle();
    if (suppressed) return;

    const template = TEMPLATES["statement-ready"];
    if (!template) return;

    const templateData = {
      customerName: (customer as any)?.name || "there",
      accountNumber: (customer as any)?.account_number || statementRow.account_number || "",
      periodStart: statementRow.from_date,
      periodEnd: statementRow.to_date,
      closingBalance: Number(statementRow.closing_balance ?? 0),
      dueDate: statementRow.due_date,
      siteUrl: Deno.env.get("APP_BASE_URL") ?? "https://classicvisions.net",
    };

    const html = await renderAsync(React.createElement(template.component, templateData));
    const text = await renderAsync(React.createElement(template.component, templateData), { plainText: true });
    const resolvedSubject = typeof template.subject === "function" ? template.subject(templateData) : template.subject;
    const messageId = crypto.randomUUID();

    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: "statement-ready",
      recipient_email: recipient,
      status: "pending",
    });

    const { error: enqueueError } = await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: recipient,
        from: "classicvisions <noreply@classicvisions.net>",
        sender_domain: "support.classicvisions.net",
        subject: resolvedSubject,
        html,
        text,
        purpose: "transactional",
        label: "statement-ready",
        idempotency_key: messageId,
        queued_at: new Date().toISOString(),
      },
    });
    if (enqueueError) {
      await supabase.from("email_send_log").insert({
        message_id: crypto.randomUUID(),
        template_name: "statement-ready",
        recipient_email: recipient,
        status: "failed",
        error_message: `enqueue failed: ${enqueueError.message}`,
      });
    }
  } catch (err) {
    // Best-effort — a failed email must never fail the statement sync itself.
    console.error("enqueueStatementReadyEmail failed", err);
  }
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

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

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

  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

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
  // Historical backfills (e.g. the first-ever sync of years of statements)
  // must not spam every customer with a "statement ready" email for old,
  // already-known statements. Only real month-end pushes should email.
  const suppressEmail = (raw as any).suppress_email === true;
  const records = (raw as any).records as Record<string, unknown>[];
  if (records.length > MAX_RECORDS_PER_REQUEST) {
    return json({ error: `Too many records. Max ${MAX_RECORDS_PER_REQUEST} per request, got ${records.length}.` }, 413);
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
  } else if (!dryRun && mapped.length && entity === "statements") {
    // Individual resolution per row (needs customer_id/account_number lookup)
    // — and only a genuinely NEW row triggers the "statement ready" email, so
    // resyncing an already-seen statement never re-sends it.
    for (const row of mapped) {
      const { error: rowErr, isNew } = await upsertStatementRow(supabase, row);
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
        if (isNew && !suppressEmail) await enqueueStatementReadyEmail(supabase, row);
      }
    }
  } else if (!dryRun && mapped.length && entity === "balances") {
    // Individual resolution per row (needs customer_id/account_number lookup).
    for (const row of mapped) {
      const { error: rowErr } = await upsertBalanceRow(supabase, row);
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

  // After a real contacts push, re-resolve contacts.linked_customer_id from
  // innovations_parent_customer_id -> customers.innovations_customer_id.
  // Best-effort: a resolver hiccup must never fail the sync itself.
  if (!dryRun && entity === "contacts" && mapped.length) {
    const { error: resolveErr } = await supabase.rpc("resolve_contact_customer_links");
    if (resolveErr) console.error("resolve_contact_customer_links failed", resolveErr);
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
