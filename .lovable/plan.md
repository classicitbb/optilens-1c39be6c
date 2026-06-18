## Goal
Expose a stable REST API so an external pricelist-wizard app (with AI/logic) can read and write Classic Visions domain data: **price catalog, moonshot, contacts, products, customers, orders**. Authenticated by per-integration API keys, scoped, audited.

## Architecture
One Supabase Edge Function `api-v1` acts as the gateway for all external calls.

```text
external app -> https://.../functions/v1/api-v1/<resource>[/id]
                  headers: x-api-key: <token>
                          ↓
                  verify key, load scopes
                          ↓
                  service-role Supabase client
                          ↓
                  resource handler (read/write)
                          ↓
                  audit log row
```

Why one function, not many: one CORS surface, one auth path, one audit pipeline, easier to version (`/api-v1`, later `/api-v2`).

## Auth model (per-integration API keys)
New tables:
- `api_keys` — `id, name, key_prefix, key_hash, scopes text[], created_by, last_used_at, revoked_at, expires_at`
- `api_audit_log` — `id, api_key_id, method, resource, resource_id, status, request_summary, response_summary, ip, created_at`

Key format: `clv_live_<prefix>_<secret>`; only the SHA-256 hash is stored. Shown to admin **once** at creation.

Scopes are `resource:action` strings:
- `catalog:read`, `catalog:write`
- `contacts:read`, `contacts:write`
- `products:read`, `products:write`
- `customers:read`, `customers:write`
- `orders:read`, `orders:write`
- `moonshot:read`, `moonshot:write`

Admin UI: new page `/admin/integrations/api-keys` to create, name, scope, revoke, rotate keys, and view recent audit log.

## Resources exposed in v1
Each resource gets `GET /list`, `GET /:id`, `POST /` (create), `PATCH /:id` (update). Deletes are intentionally out of scope for v1 (per your earlier policy preference — soft-archive instead where supported).

| Resource | Backing table(s) | Notes |
|---|---|---|
| `catalog` | `price_catalog`, joined lens/addon refs | Cost fields stripped unless key has `catalog:read_cost` scope (separate, admin-only). |
| `contacts` | `contacts` | Honors Caribbean country list, parent_id linkage. |
| `products` | `lenses`, `supplies`, `addons` via a unified product view | Type discriminator in payload (`lens` / `supply` / `addon`). |
| `customers` | `customers` + linked `contacts` | Includes `assigned_pricelist_id`. |
| `orders` | `orders`, `order_items` | Write path goes through `place_customer_order_v2` to preserve governance + payment-link issuance. |
| `moonshot` | Tables backing the Moonshot module (rocks, todos, scorecards, meetings, issues) | Read/write parity with internal UI. |

All write payloads validated with zod. All responses are JSON, paginated with `?limit=&cursor=`, return `{data, next_cursor}`.

## Security
- Key verification compares SHA-256 of provided token against `api_keys.key_hash`; rejects revoked/expired.
- Function runs with service role internally, but every handler enforces scope **before** touching the DB.
- All cost fields hidden by default — matches the existing Viewer/Customer rule (hard rule #7).
- Rate limit: 60 req/min per key (in-memory token bucket; logs `429` on overflow).
- CORS: allow any origin (it's a keyed API), but require `x-api-key` header.
- Every request writes to `api_audit_log`.

## Deliverables
1. **Migration** — `api_keys`, `api_audit_log`, RLS (admin-only), `create_api_key` RPC returning the plaintext key once, `revoke_api_key` RPC.
2. **Edge function** `supabase/functions/api-v1/index.ts` with: auth middleware, scope guard, rate limiter, audit logger, and the six resource handlers.
3. **Admin page** `src/pages/admin/integrations/ApiKeysPage.tsx` — list/create/revoke/rotate keys, view audit log, copy-once key reveal.
4. **Sidebar entry** added under existing Admin → Integrations area.
5. **Public docs page** `/admin/integrations/api-keys/docs` describing endpoints, auth header, examples (curl + fetch), scopes.

## Out of scope (call out, not building in v1)
- Webhooks (you said read+write only) — flagged for v2.
- Delete endpoints.
- Per-user JWT (only API keys).
- OpenAPI spec file — can add later if the external app benefits.

## Open question to confirm before build
The pricelist-wizard will need to **write** to the price catalog (create/update rows). Confirm: should writes go directly into `price_catalog`, or should they create a draft `pricelist_version` that an admin publishes? I'll default to **direct write** for v1 unless you say otherwise.
