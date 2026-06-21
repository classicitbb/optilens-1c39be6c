
# External app ↔ Lovable Cloud sync via api-v1

## Approach
Your external app (running on your own Supabase project) calls `api-v1` over HTTPS with an API key. Reads come from `catalog_live` (unified lens/supply/addon view) and from individual reference-table endpoints. Writes go to the specific resource the row belongs to. No replication, no webhooks, no copy of the data on your side — Lovable Cloud stays the system of record.

## What's needed in this project

### 1. Verify api-v1 exposes all required resources
Confirm the resource map in `supabase/functions/api-v1/index.ts` includes GET/POST/PATCH for:
- `lenses`, `supplies`, `addons` — main writes
- `catalog_live` — read-only unified view (already there)
- `suppliers`, `materials`, `lenstypes`, `mftypes`, `brands` — reference data

If any are missing, add them to the resource table. No new logic — they use the same generic handler. Each needs a scope name (e.g. `lenses:read`, `lenses:write`).

### 2. Scope model
Two scope tiers per resource: `<resource>:read` and `<resource>:write`. Reference tables get `:read` only by default; add `:write` if your app needs to create new suppliers/materials. API keys are minted in Admin → Settings → API Keys with the exact scopes the consumer needs.

### 3. Deletes
No DELETE endpoint. Document soft-delete pattern: `PATCH /<resource>/<id>` with `{ "is_active": false }`. All listing queries already filter `is_active = true` so soft-deleted rows disappear from `catalog_live` and from the website.

### 4. Conflict handling
Last-write-wins. PATCH replaces the fields you send; omitted fields are untouched. Document this — if both sides edit the same row near-simultaneously, the later PATCH wins silently. Mitigation pattern (optional, documented but not enforced): your app reads `updated_at` before PATCH and includes it; if you want strict optimistic locking later we'd add an `If-Match` style check.

### 5. Docs to add
- `docs/api/external-sync-guide.md` — the main developer/AI-coder doc. Sections:
  - When to use this vs the existing internal Supabase client
  - Base URL, auth, scope model
  - **Read patterns:** unified product list via `catalog_live`, per-resource reads, pagination + order with the `id` fallback
  - **Write patterns:** create lens/supply/addon, update price, toggle web_enabled/wspl_enabled, soft-delete
  - Mapping `catalog_live.product_type` + `product_id` → which resource endpoint to PATCH
  - Reference-data lifecycle (look up by name → POST if missing → use returned id)
  - Error shapes, retries, rate-limit posture, idempotency notes
  - Worked examples: TypeScript (`fetch`), curl, and a Deno edge function in your external project
- `docs/api/api-key-management.md` — operator runbook: minting, scope assignment per consumer, rotation cadence, revocation, where to find `api_audit_log`.
- `docs/api/snippets/` — copy-paste TS client + curl examples your other-app AI coder can drop in.

### 6. What I will NOT touch
- The running app's read/write paths.
- `catalog_live` view (already correct).
- Existing api-v1 ordering fallback, OpenAPI, Swagger UI, or README — those work.
- Auth, RLS, or any schema.

## Limitations to make explicit in the docs
- No webhooks: changes inside Lovable are only visible when your app polls.
- No bulk endpoints: one row per request.
- No DELETE: soft-delete only.
- No `updated_after` filter (yet): if your app needs cheap change polling, that's a future addition — say so explicitly.
- Last-write-wins on concurrent edits.

Approve and I'll: (a) audit `api-v1` for the seven resources above and add any missing ones, (b) write the three doc files.
