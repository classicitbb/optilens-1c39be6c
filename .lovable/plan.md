## Goal
Make the `api-v1` edge function self-describing so other AI tools (Custom GPTs, Cursor, Claude, agents) and humans (Postman, Insomnia) can discover endpoints automatically — no hand-holding.

## What gets added

**1. OpenAPI 3.1 spec** — hand-written, lives at:
```
supabase/functions/api-v1/openapi.ts
```
A single TypeScript module that exports a JS object (so we get type-checking and avoid YAML parsing in Deno). Covers every current resource:
- `catalog`, `contacts`, `customers`, `orders`
- `lenses`, `supplies`, `addons` (with cost fields documented as stripped)
- `moonshot_rocks`, `moonshot_todos`

For each resource we document: `GET /<resource>` (list, with `limit`/`offset`/`order` query params), `GET /<resource>/:id`, `POST /<resource>`, `PATCH /<resource>/:id`, plus the `x-api-key` security scheme, the `catalog` draft-routing behavior, and standard error shapes.

**2. Two new public routes inside the edge function** (no API key required):
- `GET /functions/v1/api-v1/openapi.json` — returns the spec as JSON
- `GET /functions/v1/api-v1/docs` — returns an HTML page that loads Swagger UI from a CDN and points at `./openapi.json`

These are added at the top of the request handler so they short-circuit before the API-key check.

**3. Admin UI hookup** on `/admin/settings/api-keys`:
- A "Documentation" card at the top with two copy-buttons: the Swagger UI URL and the raw `openapi.json` URL.
- A short blurb: "Paste the openapi.json URL into ChatGPT Custom GPT Actions, Cursor, or any AI coding tool to give it full access to this API."

## What this unlocks for other AIs

| Tool | How it consumes the spec |
|---|---|
| **ChatGPT Custom GPT** | Paste the openapi.json URL into "Actions" → it imports every endpoint as a callable tool |
| **Cursor / Claude Code** | Point at the URL or the `openapi.ts` file in the repo |
| **Postman / Insomnia** | Import openapi.json → full collection appears |
| **n8n / Zapier / Make** | "HTTP Request from OpenAPI" node consumes it directly |
| **OpenAI / Anthropic agents** | Standard `openapi_to_functions` converters turn endpoints into tool calls |

## Why public (no auth) for the spec

The spec describes shape only — no data, no secrets. Making it public is the universal standard (Stripe, GitHub, Twilio all do this) and is the **only** way Custom GPT Actions and most agent frameworks can fetch it. Actual data still requires `x-api-key`.

## Out of scope (can do later)

- Auto-generating the spec from zod schemas (would require refactoring the edge function)
- Versioned spec history
- Rate-limit documentation (no rate limits exist yet)

## Files touched

- **new** `supabase/functions/api-v1/openapi.ts` — the spec
- **edit** `supabase/functions/api-v1/index.ts` — add `/openapi.json` and `/docs` routes before auth
- **edit** `src/pages/admin/settings/ApiKeysPage.tsx` — add Documentation card with the two URLs
