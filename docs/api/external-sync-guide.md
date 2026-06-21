# External Sync Guide — Manipulate Classic Visions product data from another app

Audience: developers (and AI coding assistants) building an external app — typically a
separate Supabase project, a Next.js app, a Deno/Node worker, etc. — that needs to
**read and write product data** in the Classic Visions Lovable Cloud database.

This is the contract for talking to that data **from outside Lovable**. The internal
Lovable app keeps using `@supabase/supabase-js` directly. You should not.

---

## TL;DR

```
Base URL:   https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/api-v1
Auth:       header `x-api-key: <token>`
Discovery:  GET /docs            (Swagger UI)
            GET /openapi.json    (machine-readable spec)
            supabase/functions/api-v1/README.md
```

- Lovable Cloud is the **system of record**. There is no replica on your side.
- Reads pull live data over HTTPS. Writes land directly in Cloud Postgres.
- No webhooks, no bulk endpoints, no DELETE. Soft-delete via `PATCH { is_active: false }`.
- Conflict policy: **last-write-wins**. PATCH replaces only the fields you send.

---

## 1. When to use this vs the internal client

| Situation | Use |
|---|---|
| Code running **inside** the Lovable project (`src/**`, this repo's edge functions) | `@/integrations/supabase/client` |
| Code running in **any other project / server / edge function / browser app** | `api-v1` over HTTPS with `x-api-key` |

You cannot connect to the Lovable Cloud Postgres directly from outside — there is no
public connection string and no service-role key issued. `api-v1` is the only door.

---

## 2. Auth & scopes

Every request must include `x-api-key: <token>`. Tokens are minted in the admin UI
(Admin → Settings → API Keys) with a fixed list of scopes. The function rejects
requests whose key is missing the scope required for the route.

Scope model: **`<resource>:read`** for GETs, **`<resource>:write`** for POST/PATCH.

| Resource | Read scope | Write scope |
|---|---|---|
| `catalog_live` (read-only unified view) | `catalog:read` | n/a |
| `lenses` | `products:read` | `products:write` |
| `supplies` | `products:read` | `products:write` |
| `addons` | `products:read` | `products:write` |
| `suppliers` | `reference:read` | `reference:write` |
| `materials` | `reference:read` | `reference:write` |
| `lenstypes` | `reference:read` | `reference:write` |
| `mftypes` | `reference:read` | `reference:write` |
| `brands` | `reference:read` | `reference:write` |
| `contacts`, `customers`, `orders` | `<r>:read` | `<r>:write` |

Grant only the scopes the consumer needs. A typical product-management app gets:
`catalog:read`, `products:read`, `products:write`, `reference:read`.
Add `reference:write` only if the app creates new suppliers/materials/lens types.

**Never put the key in a browser bundle.** Proxy through an edge function or server
route in your own app and read the key from a runtime secret there.

---

## 3. Routes

```
GET    /<resource>             # list  (?limit=&offset=&order=col.asc|desc)
GET    /<resource>/<id>        # one row
POST   /<resource>             # create
PATCH  /<resource>/<id>        # partial update — only fields sent are changed
```

- `limit` default 50, max 500.
- `order` defaults to `created_at.desc`. If the table has no `created_at` column,
  the function silently retries ordered by `id` so a valid resource never 400s
  purely over ordering. Pass `order` explicitly to override (e.g. `name.asc`).
- Response envelope (list): `{ data: [...], count, limit, offset }`.
- Response envelope (single): `{ data: {...} }`.
- Errors: `{ error: string, detail?: string }` with appropriate HTTP status.

There is **no DELETE**. Soft-delete via PATCH:

```http
PATCH /lenses/<id>
{ "is_active": false }
```

All listing queries and the storefront filter `is_active = true`, so soft-deleted
rows disappear from `catalog_live` and from the website.

---

## 4. Reading product data — unified vs per-resource

### 4a. Unified read (recommended)

`catalog_live` is a read-only Postgres view that UNION ALLs lenses, supplies and
addons into one stream with consistent columns:

```
id (composite text, e.g. "lens:<uuid>")
product_type     ("lens" | "supply" | "addon")
product_id       (the underlying row id)
sku, name, category
supplier_id, supplier_name
cost, sell_price, currency
web_enabled, wspl_enabled, is_active
created_at, updated_at
lenstype, material, mftype   (lens rows only; NULL for supplies/addons)
```

Use it whenever you want one list of "all our products" without worrying about
which table a row lives in.

```ts
const res = await fetch(`${BASE}/catalog_live?limit=100&order=updated_at.desc`, {
  headers: { "x-api-key": API_KEY },
});
const { data, count } = await res.json();
```

### 4b. Per-resource read

When you need columns that don't make it into `catalog_live` (full lens spec,
supply pack sizes, etc.):

```ts
const res = await fetch(`${BASE}/lenses?limit=200`, {
  headers: { "x-api-key": API_KEY },
});
```

---

## 5. Writing product data

`catalog_live` is read-only. To **write** a product, hit the resource its row
came from. The `product_type` column on the view tells you which:

| `product_type` | Write endpoint |
|---|---|
| `lens`   | `/lenses` |
| `supply` | `/supplies` |
| `addon`  | `/addons` |

### 5a. Create a lens

```ts
const res = await fetch(`${BASE}/lenses`, {
  method: "POST",
  headers: { "x-api-key": API_KEY, "content-type": "application/json" },
  body: JSON.stringify({
    sku: "CV-1.60-AR",
    name: "Single Vision 1.60 AR",
    base_price: 12.5,                // USD — see Pricing Currency Strategy
    supplier_id: "<uuid>",
    material_id: "<uuid>",
    lenstype_id: "<uuid>",
    mftype_id:  "<uuid>",
    web_enabled: true,
    show_in_ws_pricelist: true,
    is_active: true,
  }),
});
const { data } = await res.json(); // 201 with the row
```

### 5b. Update a price

```ts
await fetch(`${BASE}/lenses/<id>`, {
  method: "PATCH",
  headers: { "x-api-key": API_KEY, "content-type": "application/json" },
  body: JSON.stringify({ base_price: 13.25 }),
});
```

### 5c. Toggle channel flags

```ts
await fetch(`${BASE}/lenses/<id>`, {
  method: "PATCH",
  headers: { "x-api-key": API_KEY, "content-type": "application/json" },
  body: JSON.stringify({ web_enabled: false, show_in_ws_pricelist: true }),
});
```

> `web_enabled` controls availability on the Rx order form / website.
> `show_in_ws_pricelist` (lenses) / `stk_wspl` (supplies) controls the
> wholesale stock pricelist. Both are independent.

### 5d. Soft-delete

```ts
await fetch(`${BASE}/lenses/<id>`, {
  method: "PATCH",
  headers: { "x-api-key": API_KEY, "content-type": "application/json" },
  body: JSON.stringify({ is_active: false }),
});
```

### Response note: cost fields stripped

For lenses/supplies/addons, the API response strips `base_price` / `cost` to
match the Viewer/Customer privacy posture. The values **are still written** to
the database — they are just not echoed back. If you need to confirm a write,
re-read with a key that has the appropriate read scope, or rely on the 2xx
status and the row id.

---

## 6. Reference data lifecycle

Lenses, supplies and addons reference lookup tables (`suppliers`, `materials`,
`lenstypes`, `mftypes`, `brands`) by id. Recommended pattern in your app:

```ts
async function resolveSupplierId(name: string): Promise<string> {
  // 1. Look up by name.
  const list = await fetch(
    `${BASE}/suppliers?order=name.asc&limit=500`,
    { headers: { "x-api-key": API_KEY } },
  ).then((r) => r.json());
  const hit = list.data.find((s: any) => s.name.toLowerCase() === name.toLowerCase());
  if (hit) return hit.id;

  // 2. Create if missing (requires reference:write).
  const created = await fetch(`${BASE}/suppliers`, {
    method: "POST",
    headers: { "x-api-key": API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ name }),
  }).then((r) => r.json());
  return created.data.id;
}
```

Cache resolved ids in your app; reference rows change rarely.

---

## 7. Pagination & change polling

There is **no `updated_after` filter today.** To detect changes from your side:

- Cheap-and-correct: page through `?order=updated_at.desc` and stop when you
  pass the last `updated_at` you saw. Run on a cron (e.g. every 60s).
- Lazy: re-pull everything and diff against your local copy.

If you need a real `updated_after=<iso>` param or webhooks later, open a request
in this repo and we'll add it to `api-v1`.

---

## 8. Concurrency / conflict policy

**Last-write-wins.** PATCH replaces only the fields in the request body; omitted
fields are untouched. If two clients PATCH the same row simultaneously, whichever
arrives second wins silently. The API does not support optimistic locking
(`If-Match` / `updated_at` guards) yet.

If this matters for your workflow:
- Pull → mutate → PATCH **immediately** to shrink the race window, or
- Open a request to add `If-Match`-style guards to `api-v1`.

---

## 9. Errors

| Status | Meaning |
|---|---|
| 400 | Bad input (invalid JSON, FK violation, NOT NULL violation, RLS reject). `error` carries the Postgres message. |
| 401 | Missing or invalid `x-api-key`. |
| 403 | Key is valid but lacks the required scope. The response names the scope. |
| 404 | Unknown resource, or id not found. |
| 405 | Wrong HTTP method for that route. |
| 5xx | Auth RPC failure or unexpected server error. Retry with backoff. |

Every request is recorded in `api_audit_log` (api_key_id, method, resource,
resource_id, status, request/response summary, ip). Use it to debug failed calls.

---

## 10. Worked examples

### TypeScript client wrapper

```ts
// optilens-client.ts
const BASE = process.env.OPTILENS_API_URL!;
const KEY  = process.env.OPTILENS_API_KEY!;

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "x-api-key": KEY,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`${method} ${path} → ${res.status}: ${err.error ?? "failed"}`);
  }
  return res.json() as Promise<T>;
}

export const optilens = {
  listCatalog:  (q = "") => req<{ data: any[]; count: number }>("GET",  `/catalog_live?${q}`),
  getLens:      (id: string) => req<{ data: any }>("GET",  `/lenses/${id}`),
  createLens:   (row: object) => req<{ data: any }>("POST", `/lenses`, row),
  updateLens:   (id: string, patch: object) => req<{ data: any }>("PATCH", `/lenses/${id}`, patch),
  softDeleteLens: (id: string) => req<{ data: any }>("PATCH", `/lenses/${id}`, { is_active: false }),
};
```

### curl

```bash
# List 10 most-recently-updated products
curl -sS \
  -H "x-api-key: $OPTILENS_API_KEY" \
  "https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/api-v1/catalog_live?limit=10&order=updated_at.desc"

# Update a lens price
curl -sS -X PATCH \
  -H "x-api-key: $OPTILENS_API_KEY" \
  -H "content-type: application/json" \
  -d '{"base_price": 14.0}' \
  "https://xstmeirxhfbiyayrrsob.supabase.co/functions/v1/api-v1/lenses/<id>"
```

### Deno edge function in your other Supabase project

```ts
// supabase/functions/sync-products/index.ts
const BASE = Deno.env.get("OPTILENS_API_URL")!;
const KEY  = Deno.env.get("OPTILENS_API_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const since = url.searchParams.get("since") ?? "1970-01-01";
  let offset = 0;
  const all: any[] = [];
  while (true) {
    const res = await fetch(
      `${BASE}/catalog_live?limit=500&offset=${offset}&order=updated_at.desc`,
      { headers: { "x-api-key": KEY } },
    );
    const { data, count } = await res.json();
    const fresh = data.filter((r: any) => r.updated_at > since);
    all.push(...fresh);
    if (fresh.length < data.length || offset + data.length >= count) break;
    offset += data.length;
  }
  // ... upsert `all` into your own Supabase here ...
  return new Response(JSON.stringify({ pulled: all.length }), {
    headers: { "content-type": "application/json" },
  });
});
```

---

## 11. Limits & known gaps (be explicit with your AI coder)

- **No webhooks.** Changes made inside Lovable are only visible when your app polls.
- **No bulk endpoints.** One row per request. For initial loads, parallelise carefully.
- **No DELETE.** Soft-delete only.
- **No `updated_after` filter** today — see §7.
- **No optimistic locking** — see §8.
- **Cost fields stripped on response** for products — see §5.
- **Browser exposure is forbidden** — proxy through a server you control.

If any of these become blockers, file a request against `supabase/functions/api-v1/`
and we'll extend it. The function is small and additions are cheap.
