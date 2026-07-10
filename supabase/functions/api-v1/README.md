# Classic Visions REST API — v1

External REST API for the OptiLens platform. Keyed access to core domain data
(catalog, contacts, customers, orders, products, moonshot tools).

**Base URL**

```
https://<project-ref>.functions.supabase.co/api-v1
```

Inside the platform, this is the deployed `api-v1` edge function. Public docs
are served from the same function:

- Swagger UI: `GET /api-v1/docs`
- OpenAPI 3.1 spec: `GET /api-v1/openapi.json`

Both docs endpoints are **public** (no API key required). The spec describes
shape only — actual data still requires a valid key.

---

## Authentication

All data endpoints require an API key in the `x-api-key` header.

```
x-api-key: cv_live_xxxxxxxxxxxxxxxxxxxxxxxx
```

Keys are issued in the admin panel under **Settings → API Keys**. Each key
carries a list of **scopes** that gate read/write access per resource.

| Resource         | Read scope        | Write scope        |
| ---------------- | ----------------- | ------------------ |
| `catalog`        | `catalog:read`    | `catalog:write`    |
| `contacts`       | `contacts:read`   | `contacts:write`   |
| `customers`      | `customers:read`  | `customers:write`  |
| `orders`         | `orders:read`     | `orders:write`     |
| `lenses`         | `products:read`   | `products:write`   |
| `supplies`       | `products:read`   | `products:write`   |
| `addons`         | `products:read`   | `products:write`   |
| `moonshot_rocks` | `moonshot:read`   | `moonshot:write`   |
| `moonshot_todos` | `moonshot:read`   | `moonshot:write`   |

Auth failures:

| Status | Meaning                          |
| ------ | -------------------------------- |
| 401    | Missing or invalid `x-api-key`   |
| 403    | Key is valid but lacks the scope |

**Cost fields** (`base_price`, `cost`) are stripped from `lenses`, `supplies`,
and `addons` responses — the external API never exposes cost data.

---

## Routes

All resources follow the same shape:

| Method | Path                  | Purpose                  |
| ------ | --------------------- | ------------------------ |
| GET    | `/<resource>`         | List (paginated)         |
| GET    | `/<resource>/<id>`    | Fetch one                |
| POST   | `/<resource>`         | Insert                   |
| PATCH  | `/<resource>/<id>`    | Update                   |

### List query parameters

| Param    | Default            | Notes                                            |
| -------- | ------------------ | ------------------------------------------------ |
| `limit`  | `50` (max `500`)   | Page size                                        |
| `offset` | `0`                | Pagination offset                                |
| `order`  | `created_at.desc`  | `column.asc` or `column.desc`. Falls back to `id` if the default `created_at` column doesn't exist on that table. |

### Discovery

```
GET /api-v1
```

Returns the API name, version, and the list of available resources.
No `x-api-key` required.

---

## Examples

### List lenses

```bash
curl -H "x-api-key: $CV_KEY" \
  "https://<project-ref>.functions.supabase.co/api-v1/lenses?limit=25"
```

```json
{
  "data": [
    {
      "id": "1f8c…",
      "name": "Single Vision 1.50",
      "material": "1.50",
      "web_enabled": true,
      "wspl_enabled": true
    }
  ],
  "count": 312,
  "limit": 25,
  "offset": 0
}
```

### Fetch one customer

```bash
curl -H "x-api-key: $CV_KEY" \
  "https://<project-ref>.functions.supabase.co/api-v1/customers/42"
```

```json
{ "data": { "id": 42, "name": "Acme Optical", "country": "BB" } }
```

### Create a contact

```bash
curl -X POST -H "x-api-key: $CV_KEY" -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com"}' \
  "https://<project-ref>.functions.supabase.co/api-v1/contacts"
```

```json
{ "data": { "id": "9b1d…", "name": "Jane Doe", "email": "jane@example.com" } }
```

### Update an order

```bash
curl -X PATCH -H "x-api-key: $CV_KEY" -H "Content-Type: application/json" \
  -d '{"status":"shipped"}' \
  "https://<project-ref>.functions.supabase.co/api-v1/orders/<order-id>"
```

---

## Catalog writes — draft routing

`POST` and `PATCH` to `/catalog` **never** write directly to the live
`price_catalog`. The API resolves (or creates) a draft `pricelist_version`
bound to the API key and writes rows into `pricelist_catalog_rows` under that
draft.

Responses include `draft_pricelist_version_id` so callers can track which
draft they're mutating. Publishing a draft is an admin-only action inside
the platform.

`PATCH /catalog/<row-id>` only succeeds if the row belongs to the key's own
draft — cross-draft mutations return `404`.

---

## Error shape

All errors return JSON:

```json
{ "error": "Missing required scope: catalog:write" }
```

| Status | Cause                                              |
| ------ | -------------------------------------------------- |
| 400    | Invalid JSON body, bad query, or DB validation     |
| 401    | Missing/invalid API key                            |
| 403    | Insufficient scope                                 |
| 404    | Unknown resource or row not found                  |
| 405    | Method not allowed                                 |
| 500    | Auth verification failure                          |

---

## For AI coders / agents

This API is designed to be self-describing:

1. Fetch `GET /api-v1/openapi.json` — full OpenAPI 3.1 spec, no auth.
2. Or open `GET /api-v1/docs` for a browsable Swagger UI.
3. Paste the spec URL into ChatGPT Custom GPT Actions, Cursor, Postman,
   or any agent framework that consumes OpenAPI — endpoints, params, and
   schemas will be discovered automatically.
4. Auth is `apiKey` in header `x-api-key` (already declared in the spec).

Audit logging is automatic: every request (success or failure) is written
to `api_audit_log` with the key id, method, resource, status, and a request
summary.
