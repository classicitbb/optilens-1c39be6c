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
import { isAutoNotificationsDisabled } from "../_shared/email/smtp.ts";
import { sendManagedEmail } from "../_shared/email/managed-send.ts";
import { buildOrderHashref, canonicalOrderFor, type OrderKind } from "../_shared/orders/hashref.ts";

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
  // Lens alias catalog (source: Zen DB LensAlias via optilens-local's
  // data/rx/catalog.generated.json — see INNOVA_INTEGRATION_ARCHITECTURE.md
  // §2.1). Read-mostly mirror; changes rarely (a new lens style/colour is a
  // supplier event). Generic batch-upsert keyed on the immutable 13-digit
  // alias. Reuses customers:write — same optilens-local push authority as
  // banks, no new scope needed on the existing API key.
  lens_aliases: {
    table: "innovations_lens_aliases",
    conflictKey: "alias",
    required: "alias",
    scope: "customers:write",
    allow: [
      "alias",
      "material_code",
      "material_description",
      "style_code",
      "style_description",
      "color_code",
      "color_description",
      "mf_type",
      "category",
      "suppliers",
      "pricing_key",
      "is_active",
      "synced_at",
    ],
  },
  // Lens Local's stock-lens catalogue, including the configurator axes. This
  // is intentionally independent of Website Visible/WSPL: Store Variants
  // needs every enabled semi-finished or finished candidate.
  store_lenses: {
    table: "innovations_store_lenses", conflictKey: "innovations_lens_id", required: "innovations_lens_id", scope: "supplies:write",
    allow: ["innovations_lens_id", "name", "lens_state", "material_group", "material", "lens_type", "option_name", "mf_type", "manufacturer", "finish_type", "is_enabled", "synced_at"],
  },
  store_lens_power_rows: {
    table: "innovations_store_lens_power_rows", conflictKey: "innovations_power_row_id", required: "innovations_power_row_id", scope: "supplies:write",
    allow: ["innovations_power_row_id", "innovations_lens_id", "diameter", "sphere", "base", "cylinder", "add", "stock_on_hand", "right_opc", "left_opc", "synced_at"],
  },
  // Physical stocked items (source: Innovations dbo.MiscItems, filtered to
  // "Stocked Item" checked and not Inactive — see docs/ERP_ITEM_SYNC_PLAN.md §7).
  // Replaces manual CSV entry into the Supplies catalog for items that already
  // exist in the ERP. Generic batch-upsert keyed on the immutable MiscItemID;
  // manually-entered rows keep source='manual' until reconciled/backfilled
  // (see docs/ERP_ITEM_SYNC_PLAN.md §3) so a first sync never duplicates them.
  //
  // sell_price is deliberately NOT in this allowlist. The ERP's own Price
  // column is always 0 for stocked items — real prices live in a separate
  // multi-pricelist system with no single canonical value per item — so this
  // sync only ever supplies cost. Setting sell_price for a newly-synced item
  // stays a reviewed staff step through the existing supplies pricing-review
  // UI (src/hooks/usePricingEngine.ts / ImportSuppliesTab.tsx), same as manual
  // entry today — never silently computed and never overwritten by re-sync.
  supplies: {
    table: "supplies",
    conflictKey: "innovations_misc_item_id",
    required: "innovations_misc_item_id",
    scope: "supplies:write",
    allow: [
      "innovations_misc_item_id",
      "sku",
      "name",
      "category",
      "base_price",
      "inventory_qty",
      "is_active",
      "source",
      "last_synced_at",
    ],
  },
};

// Both outboxes hand the office worker the same normalised order alongside
// the raw payload it already consumes. `canonical_order` is the exact model
// the Gatekeeper transport renders its Hashref v2.5 from
// (../_shared/orders/hashref.ts), so an order released through optilens-local
// and the same order released through Gatekeeper describe one thing.
//
// Routing (lab_num / cust_num) is deliberately absent: on this path it comes
// from the office's own data/rx/config.json, which the cloud does not hold.
// `hashref_body` is therefore rendered with placeholders for those two fields
// only — useful for eyeballing an order, not for sending as-is.
//
// Best-effort throughout. A payload the builder rejects (a lens with no
// confirmed alias, say) must still be claimable, so the worker can report the
// real failure back rather than the claim silently disappearing.
function withCanonicalOrder(kind: OrderKind, submission: Record<string, unknown> | null) {
  if (!submission) return submission;
  try {
    const canonical = canonicalOrderFor(kind, submission as any);
    return {
      ...submission,
      canonical_order: canonical,
      hashref_body: buildOrderHashref(canonical, { labNum: "{{lab_num}}", custNum: "{{cust_num}}" }),
    };
  } catch (err) {
    return { ...submission, canonical_order: null, canonical_error: String((err as Error)?.message ?? err) };
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Columns that are NOT NULL with a database default. An explicit null from the
// office payload would trip the not-null constraint instead of falling back to
// the default, so those keys are dropped when the value is null/undefined.
const DROP_IF_NULL = new Set(["country"]);

function pick(row: Record<string, unknown>, allow: string[]): Record<string, unknown> {
  const set = new Set(allow);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!set.has(k)) continue;
    if (DROP_IF_NULL.has(k) && (v === null || v === undefined)) continue;
    out[k] = v;
  }
  return out;
}

// Bump this on every meaningful change. GET /innovations-sync/version is public
// and unauthenticated precisely so a deploy can be verified from anywhere — if
// this string doesn't change after a deploy, the deploy did not land.
const VERSION = "2026-08-12.1-unified-order-dispatch";
const MAX_RECORDS_PER_REQUEST = 1000;

const isBlank = (value: unknown) => value === null || value === undefined || (typeof value === "string" && value.trim() === "");

// Innovations is authoritative for its immutable identifiers, but CRM users
// own the actual contact/customer details after they have been filled in.
// An inbound sync may fill a blank value; it must not replace a non-blank one.
const patchEmptyFields = (
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
  sourceIdentityKeys: string[],
) => Object.entries(incoming).reduce<Record<string, unknown>>((patch, [key, value]) => {
  if (sourceIdentityKeys.includes(key) || (isBlank(existing[key]) && !isBlank(value))) patch[key] = value;
  return patch;
}, {});

// Customers get individual resolution instead of a blind onConflict(innovations_customer_id)
// upsert. Reason: a website signup can pre-create a customers row (company contact +
// account_number, no innovations_customer_id yet — see sync_customer_portal_identity)
// before Innovations ever pushes that account. When Innovations does push it, matching
// only on innovations_customer_id would insert a duplicate row instead of adopting the
// pre-created one. account_number is the sole link between a website account and its
// Innovations account, so it's the fallback match key here.
const isEmailCollision = (err: { message?: string } | null) =>
  !!err && /customers_email_key/i.test(err.message || "");

/**
 * `customers.email` carries a UNIQUE index, but an ERP email is not unique in
 * practice: sibling branch accounts (e.g. Courts Optical Sheraton / Welches)
 * legitimately share one address, and website-signup rows can already hold the
 * address the ERP wants to attach to its own record.
 *
 * Losing the email is annoying; losing the whole customer record — name,
 * address, payment routing — because of the email is much worse. So on a
 * collision we retry once without `email` and report it as a warning. Same
 * shape as the contacts_name_key retry below.
 */
async function writeCustomerWithEmailFallback(
  write: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>,
  payload: Record<string, unknown>,
): Promise<{ error: { message: string } | null; emailConflict?: string }> {
  const { error } = await write(payload);
  if (!isEmailCollision(error) || payload.email === undefined) return { error };
  const { email, ...withoutEmail } = payload;
  const retry = await write(withoutEmail);
  if (retry.error) return { error: retry.error };
  return { error: null, emailConflict: String(email ?? "") };
}

async function upsertCustomerRow(
  supabase: any,
  row: Record<string, unknown>,
): Promise<{ error: { message: string } | null; emailConflict?: string }> {
  const { data: byInnovationsId, error: lookupErr } = await supabase
    .from("customers")
    .select("*")
    .eq("innovations_customer_id", row.innovations_customer_id as any)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr };

  if (byInnovationsId) {
    const patch = patchEmptyFields(byInnovationsId as Record<string, unknown>, row, ["innovations_customer_id"]);
    return await writeCustomerWithEmailFallback(
      (payload) => supabase.from("customers").update(payload).eq("id", (byInnovationsId as any).id),
      patch,
    );
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
      // Adopt the pre-created (e.g. website signup) row. Keep the CRM's
      // populated values and fill only its gaps while adding the immutable
      // Innovations id.
      const { data: existing, error: existingErr } = await supabase
        .from("customers")
        .select("*")
        .eq("id", (byAccountNumber as any).id)
        .maybeSingle();
      if (existingErr) return { error: existingErr };
      const patch = patchEmptyFields((existing ?? {}) as Record<string, unknown>, row, ["innovations_customer_id"]);
      return await writeCustomerWithEmailFallback(
        (payload) => supabase.from("customers").update(payload).eq("id", (byAccountNumber as any).id),
        patch,
      );
    }
  }

  return await writeCustomerWithEmailFallback(
    (payload) => supabase.from("customers").insert(payload),
    row,
  );
}

async function upsertContactRow(
  supabase: any,
  row: Record<string, unknown>,
): Promise<{ error: { message: string } | null; emailConflict?: string }> {
  const { data: existing, error: lookupErr } = await supabase
    .from("contacts")
    .select("*")
    .eq("innovations_contact_id", row.innovations_contact_id as any)
    .maybeSingle();
  if (lookupErr) return { error: lookupErr };

  if (existing) {
    const patch = patchEmptyFields(existing as Record<string, unknown>, row, ["innovations_contact_id", "innovations_parent_customer_id"]);
    return await supabase.from("contacts").update(patch).eq("id", (existing as any).id);
  }

  let { error } = await supabase.from("contacts").insert(row);
  // CRM keeps a unique-name constraint, while ERP contact names can repeat.
  // Preserve the prior receiver behavior for a genuinely new contact.
  if (error && /contacts_name_key|unique/i.test(error.message || "") && row.name) {
    ({ error } = await supabase
      .from("contacts")
      .insert({ ...row, name: `${row.name} (#${row.innovations_contact_id})` }));
  }
  return { error };
}

// Statements/balances arrive keyed only by innovations_customer_id — resolve
// customer_id/account_number against the already-synced customers table (same
// idea as upsertCustomerRow's fallback, just one direction: customers always
// sync before statements/balances in a given run).
async function resolveCustomerLink(
  supabase: any,
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
  supabase: any,
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

async function enqueueStatementDocumentJob(
  supabase: any,
  statementRow: Record<string, unknown>,
  options: { suppress?: boolean } = {},
): Promise<void> {
  const statementId = statementRow.innovations_statement_id;
  if (statementId === undefined || statementId === null) return;
  const isVoid = statementRow.void === true;
  const skipped = options.suppress || isVoid;
  await supabase.from("statement_document_jobs").upsert({
    innovations_statement_id: Number(statementId),
    idempotency_key: `innovations-statement:${statementId}`,
    status: skipped ? "skipped" : "pending",
    skip_reason: options.suppress ? "suppressed_backfill" : isVoid ? "void_statement" : null,
    upload_status: skipped ? "skipped" : "pending",
    email_status: skipped ? "suppressed" : "not_sent",
    completed_at: skipped ? new Date().toISOString() : null,
  }, { onConflict: "innovations_statement_id", ignoreDuplicates: true });
}

async function upsertBalanceRow(
  supabase: any,
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
  supabase: any,
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

    if (await isAutoNotificationsDisabled(supabase, recipient)) {
      await supabase.from("email_send_log").insert({
        message_id: crypto.randomUUID(),
        template_name: "statement-ready",
        recipient_email: recipient,
        status: "suppressed",
        error_message: "Auto notifications disabled for this account",
      });
      return;
    }

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
    const messageId = `statement-ready-${statementRow.innovations_statement_id ?? crypto.randomUUID()}`;

    await sendManagedEmail(supabase as any, {
      messageId,
      to: recipient,
      from: "Classic Visions <noreply@classicvisions.net>",
      subject: resolvedSubject,
      html,
      text,
      label: "statement-ready",
      idempotencyKey: messageId,
    });
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

  // ── Rx submission outbox (office worker pulls approved submissions,
  // submits to InnovaAPI /process_rxi or the file-drop, writes the result
  // back). Mirrors the _requests claim/complete pattern exactly: claim is a
  // conditional UPDATE so two workers can't take the same row. ──
  if (entity === "_rx_submissions") {
    if (!scopes.includes("customers:write")) {
      return json({ error: "Missing required scope: customers:write" }, 403);
    }
    if (req.method === "GET" && id === "next") {
      const { data: pending } = await supabase
        .from("rx_order_submissions")
        .select("id,quote_id,payload,mode,attempts")
        .eq("status", "approved")
        .eq("dispatch_provider", "innovations")
        .order("approved_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!pending) return json({ submission: null });
      const { data: claimed, error: claimErr } = await supabase
        .from("rx_order_submissions")
        .update({ status: "claimed", claimed_at: new Date().toISOString() })
        .eq("id", (pending as any).id)
        .eq("status", "approved")
        .select("id,quote_id,payload,mode,attempts,gatekeeper_order_id")
        .maybeSingle();
      if (claimErr || !claimed) return json({ submission: null }); // lost the race
      return json({ submission: withCanonicalOrder("rx", claimed as any) });
    }
    if (req.method === "POST" && id === "complete") {
      const body = (await req.json().catch(() => null)) as any;
      if (!body || !body.id) {
        return json({ error: "Body must be { id, ok, transport?, result_code?, result_message?, rxt_data?, error? }." }, 400);
      }
      const { data: updated, error: updErr } = await supabase
        .from("rx_order_submissions")
        .update({
          status: body.ok ? "submitted" : "failed",
          transport: body.transport ?? null,
          result_code: body.result_code ?? null,
          result_message: body.result_message ?? null,
          rxt_data: body.rxt_data ?? null,
          last_error: body.ok ? null : (body.error ?? body.result_message ?? "Unknown error"),
          submitted_at: body.ok ? new Date().toISOString() : null,
          attempts: (Number(body.attempts) || 0) + 1,
        })
        .eq("id", body.id)
        .eq("status", "claimed")
        .select("id")
        .maybeSingle();
      if (updErr) return json({ error: "Update failed", detail: updErr.message }, 500);
      if (!updated) return json({ error: "Submission not found or not in claimed state." }, 409);
      return json({ ok: true });
    }
    return json({ error: "Unsupported _rx_submissions operation." }, 404);
  }

  // ── Stock order outbox: same claim/complete pattern as _rx_submissions,
  // separate table (stock_order_submissions), separate status vocabulary
  // (staged/approved/claimed/released/failed/cancelled — "released" instead
  // of "submitted" since there's no InnovaAPI call for stock orders, only
  // the file-drop). See docs/innova-stockhashref-format.md (optilens-local)
  // and the 20260811000000 migration (cvweb-deploy) for the rest of this
  // pipeline. ──
  if (entity === "_stock_submissions") {
    if (!scopes.includes("customers:write")) {
      return json({ error: "Missing required scope: customers:write" }, 403);
    }
    if (req.method === "GET" && id === "next") {
      // dispatch_provider matters as much here as it does on the Rx outbox:
      // without it this worker would claim stock orders staff routed to
      // Gatekeeper and drop them into Innova's Incoming share as well,
      // duplicating every Gatekeeper-bound order at the lab.
      const { data: pending } = await supabase
        .from("stock_order_submissions")
        .select("id,account_id,payload,attempts")
        .eq("status", "approved")
        .eq("dispatch_provider", "innovations")
        .order("approved_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!pending) return json({ submission: null });
      const { data: claimed, error: claimErr } = await supabase
        .from("stock_order_submissions")
        .update({ status: "claimed", claimed_at: new Date().toISOString() })
        .eq("id", (pending as any).id)
        .eq("status", "approved")
        .select("id,account_id,payload,attempts,gatekeeper_order_id")
        .maybeSingle();
      if (claimErr || !claimed) return json({ submission: null }); // lost the race
      return json({ submission: withCanonicalOrder("stock", claimed as any) });
    }
    if (req.method === "POST" && id === "complete") {
      const body = (await req.json().catch(() => null)) as any;
      if (!body || !body.id) {
        return json({ error: "Body must be { id, ok, transport?, filename?, error? }." }, 400);
      }
      const { data: updated, error: updErr } = await supabase
        .from("stock_order_submissions")
        .update({
          status: body.ok ? "released" : "failed",
          transport: body.transport ?? null,
          filename: body.filename ?? null,
          last_error: body.ok ? null : (body.error ?? "Unknown error"),
          released_at: body.ok ? new Date().toISOString() : null,
          attempts: (Number(body.attempts) || 0) + 1,
        })
        .eq("id", body.id)
        .eq("status", "claimed")
        .select("id")
        .maybeSingle();
      if (updErr) return json({ error: "Update failed", detail: updErr.message }, 500);
      if (!updated) return json({ error: "Submission not found or not in claimed state." }, 409);
      return json({ ok: true });
    }
    return json({ error: "Unsupported _stock_submissions operation." }, 404);
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
  // Non-fatal data problems: the record synced, but something was dropped.
  // Kept separate from `errors` so they never inflate the failure count.
  const warnings: string[] = [];

  if (!dryRun && mapped.length && (entity === "customers" || entity === "contacts")) {
    // Customer and contact rows resolve individually. Customers may need to
    // adopt a pre-existing website row; both entities preserve populated CRM
    // fields and only let Innovations fill gaps.
    for (const row of mapped) {
      const { error: rowErr, emailConflict } = entity === "customers"
        ? await upsertCustomerRow(supabase, row)
        : await upsertContactRow(supabase, row);
      if (emailConflict) {
        // Synced, minus the email. Recorded so a real data problem stays
        // visible instead of quietly disappearing into a "success" run.
        warnings.push(`${row[cfg.required]}: email '${emailConflict}' already belongs to another customer — record synced without it`);
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
        if (isNew) await enqueueStatementDocumentJob(supabase, row, { suppress: suppressEmail });
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
    error_summary: [
      ...errors,
      ...warnings.slice(0, 5).map((w) => `warning: ${w}`),
    ].join(" | ") || null,
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
      warnings,
    },
    status === "failed" ? 422 : 200,
  );
});
