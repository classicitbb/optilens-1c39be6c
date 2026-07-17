# Send Transactional Email

Internal endpoint for sending a transactional email from a registered
template. This is the "direct email sender" used for order confirmations,
onboarding, statements, and other system-triggered mail (referred to
internally as `/email/send`).

The call does **not** send mail synchronously. It renders the template,
enqueues the message on `transactional_emails`, and returns. The
[`process-email-queue`](../process-email-queue/README.md) dispatcher (runs
every 10 minutes, see `supabase/config.toml`) performs the actual send,
with retry, rate-limit backoff, and dead-letter handling. Delivery status
for every attempt — sent, failed, suppressed, rate_limited, dlq — is
recorded in the `email_send_log` table, keyed by `message_id`.

**Endpoint**

```
POST https://<project-ref>.functions.supabase.co/send-transactional-email
```

## Authentication

Two layers, both required:

1. **Platform JWT gate** — `verify_jwt = true` in `supabase/config.toml`.
   The request needs a valid Supabase `Authorization: Bearer <jwt>` header
   or the gateway rejects it before the function code runs (`401`, empty
   body).
2. **Role check** — inside the function, `requirePrivilegedAccess` requires
   the authenticated user to have the `admin` or `operator` role. A valid
   but under-privileged JWT gets `403`.

There is no separate API key for this endpoint — it's called from other
privileged edge functions and admin-authenticated contexts, not from the
public website or Doc Studio.

## Request body

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `templateName` (or `template_name`) | string | **Yes** | Must match a key in the template registry (see below). Unknown values return `404`. |
| `recipientEmail` (or `recipient_email`) | string | Conditional | Required unless the resolved template defines a fixed `to` (e.g. internal notification templates that always go to the site owner). Must be a syntactically valid email address. |
| `templateData` (or `template_data`) | object | No | Passed through to the React Email template as props. Fields required by the specific template (e.g. `orderNumber`) are validated at render time — see **Errors** below. |
| `idempotencyKey` (or `idempotency_key`) | string | No | Defaults to a generated UUID. Pass your own to dedupe retried calls upstream of the queue. |

### Available `templateName` values

`order-confirmation`, `welcome`, `welcome-pricelist`, `abandoned-cart`,
`admin-error-notification`, `contact-inquiry-notification`,
`inquiry-confirmation`, `statement-ready`

(Source of truth: `supabase/functions/_shared/transactional-email-templates/registry.ts`.)

## Responses

**Success — `200`**

```json
{ "success": true, "queued": true }
```

**Suppressed recipient — `200`**

The address is on `suppressed_emails` (bounced / unsubscribed). Not an
error — the request was valid, the send was intentionally skipped.

```json
{ "success": false, "reason": "email_suppressed" }
```

**Errors**

| Status | Cause |
| --- | --- |
| `400` | Invalid JSON body, missing `templateName`, missing `recipientEmail` (with no fixed-recipient template), malformed `recipientEmail`, or the template failed to render because required `templateData` fields were missing/invalid. |
| `401` | Missing/invalid Supabase JWT (platform gate), or failed `requirePrivilegedAccess` check. |
| `403` | Authenticated but not `admin`/`operator`. |
| `404` | `templateName` not in the registry. |
| `405` | Method other than `POST` (or `OPTIONS` for preflight). |
| `500` | Server misconfiguration, or a downstream Supabase call (suppression check, unsubscribe-token lookup, queue insert) failed. |

All error responses share the shape:

```json
{ "error": "<human-readable message>" }
```

Every render/enqueue failure is also written to `email_send_log` with
`status: 'failed'` and an `error_message`, so a `400`/`500` here always has
a matching row you can look up by `message_id` — nothing fails silently.

## Example

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/send-transactional-email" \
  -H "Authorization: Bearer $SUPABASE_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "templateName": "order-confirmation",
    "recipientEmail": "customer@example.com",
    "templateData": { "orderNumber": "CV-10482" }
  }'
```

## Related

- [`process-email-queue`](../process-email-queue/) — dispatcher/worker that drains the queue this endpoint writes to.
- [`preview-transactional-email`](../preview-transactional-email/) — unauthenticated preview rendering for the same template registry (no send, no queue).
- `docs/edge-function-operations.md` — deploy pipeline and health monitoring for all edge functions, including this one.
- `email_send_log`, `email_send_state`, `suppressed_emails`, `email_unsubscribe_tokens` — supporting tables (see `supabase/migrations/20260409175611_email_infra.sql`).
