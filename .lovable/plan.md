## 1. Rename "Payment Gateway" → "Integrations"

The route `/admin/settings/integrations` is already correctly named, but the sidebar label and page heading still say "Payment Gateway". Rename only the user-facing labels — leave route paths, query keys, type names, and the Scotia settings logic alone (they refer to the actual gateway config, not the menu label).

Files to change:

- `src/features/admin/core/config/apps.ts` (line 155) — sidebar label `Payment Gateway` → `Integrations`.
- `src/pages/admin/settings/IntegrationsPage.tsx` (line 158) — H1 `Payment Gateway` → `Integrations`. Keep the "Payment gateway" card title inside the page (line 147) since that card specifically describes the Scotia payment gateway subsection.

Not changing:

- `syncProgressSource.ts` notification titles — those describe the Scotia gateway status, not the menu.
- `AdminSidebar.tsx` query key — internal identifier.

## 2. QA the innovations-sync edge function

Review `supabase/functions/innovations-sync/index.ts` against the sync contract (`docs/integration-innovations-sync-contract.md`) and known DB tables. Findings so far from a read-through:

**Correct / looks good**

- CORS + OPTIONS handling appropriate for machine API.
- Auth flow: `x-api-key` → `verify_api_key` RPC → scope check per entity.
- Idempotent upsert on `innovations_customer_id` / `innovations_contact_id`.
- Mass-assignment protection via `allow` allowlist (drops `type`/`pipeline_stage` which have CHECK constraints).
- Dry-run default = true (safe).
- Per-row fallback + dead-letter capture on batch failure.
- Contacts name-collision retry with `(#<id>)` suffix.
- Run log written to `innovations_sync_runs`.
- `_requests/next` claim uses optimistic concurrency (re-filter on `status='pending'`).

**Issues to fix / verify**

1. **Statements/Invoices/Balances entities missing.** Contract v1 lists customers, contacts, balances, invoices, statements. Only customers + contacts are wired. Decision needed: implement now, or explicitly document as "phase 1 only" and update the contract doc.
2. `**_requests/next` scope check** requires `customers:write` OR `contacts:write` but the error message only says "Missing required scope: customers:write". Fix message to reflect the OR.
3. `**_requests/complete` does not verify the request belongs to a claimed state** — a caller with a valid key could mark any request done. Add `.eq('status','claimed')` guard and/or return the affected row count.
4. `**dry_run` still writes a run-log entry** with `upserted=0` — fine, but confirm this is intended (adds noise to `innovations_sync_runs`). Consider skipping the log when `dry_run=true`, or tagging it clearly.
5. `**api_key_id` on dead-letter/run rows** — verify column exists in `innovations_sync_dead_letters` and `innovations_sync_runs` (schema shows 9/12 columns respectively — needs confirmation via `supabase--read_query`).
6. **Per-row fallback is sequential** — fine for small batches, but 1000-record batches will be slow. Acceptable for v1; note in runbook.
7. **No max-batch-size limit** — a caller could POST 100k records. Add a soft cap (e.g. 1000) returning 413 to protect the function.
8. **Contact name-retry only catches `contacts_name_key|unique**` — verify the actual constraint name in DB; if it's just "duplicate key" the regex may miss it.
9. **Version string `2026-06-30.4-fixes**` — bump when shipping any change so `GET /version` reflects deploy.

**QA test plan (after any change, or as validation now)**

- `GET /functions/v1/innovations-sync/version` → returns JSON with entities list.
- `POST` without `x-api-key` → 401.
- `POST` with key lacking scope → 403.
- `POST customers` with `dry_run:true` and 2 valid + 1 invalid record → 200, `upserted:0`, `failed:1`, `sample` shows 2 mapped rows.
- `POST customers` with `dry_run:false` twice with same `innovations_customer_id` → second call updates in place, no duplicate.
- `POST contacts` with duplicate `name` → retry path triggers, row lands with `(#id)` suffix.
- Force a row error (bad `country_code` length) → dead-letter row appears, run status = `partial`.
- `GET _requests/next` with pending row → returns request; second concurrent call returns null.
- `POST _requests/complete` with `{id, ok:true}` → row moves to `done`.

## Order of work

1. Apply the 2 label edits.
2. Address `_requests/complete` guard + scope error message + batch-size cap (small, low-risk).
3. Run the QA test plan against the deployed function; report results.
4. Flag statements/invoices/balances as a separate follow-up (needs new columns/tables per contract §3).

## Question for you

Do you want me to (a) just do the rename + safe QA fixes above (items 2–3, 7 in Issues), or (b) also implement the missing balances/invoices/statements entities in the same pass? only do A