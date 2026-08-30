# Scotia/IPG diagnostics: response logging, admin health check, iframe removal

Goal: when the Fiserv hosted page refuses a transaction, capture exactly what the gateway said, give admins a one-click signed probe that reports whether the store is accepted for Connect hosted-page transactions, and delete the dead iframe path from checkout and the admin test.

## 1. Capture the exact gateway response

New table `public.scotia_gateway_events` records every prepare and every inbound gateway response:

- `id`, `created_at`, `kind` (`prepare` | `return` | `notify` | `probe`), `oid`, `store_id`, `env`
- `outcome` (`ok` | `hash_invalid` | `declined` | `error`), `approved`
- `fail_rc`, `fail_reason`, `approval_code`, `association_response_code`, `terminal_id`, `endpoint_url`, `http_status`
- `request_params` jsonb (signed form params minus the hash), `response_params` jsonb (every field Fiserv sent), `notes`

Card-like fields (`cardnumber`, `cvv2`, `cvm`, `track1`, `track2`, `expmonth`, `expyear`) are redacted before write. The shared secret and the computed hash are never stored. Row insert happens only through the service role in edge functions; RLS allows SELECT to staff (`has_staff_role()`), plus `GRANT SELECT` to `authenticated` and `GRANT ALL` to `service_role` — no anon access.

Wire the writes in:
- `supabase/functions/scotia-payment/index.ts` — log each `prepare` (params + resolved store/env) so a later failure can be matched to what was actually signed.
- `supabase/functions/scotia-return/index.ts` — log the full raw POST for every return, not just hash failures; keep the existing `console.error` lines and add `fail_rc` / `fail_reason` / `approval_code` extraction.
- `supabase/functions/scotia-notify/index.ts` — same for the server-to-server callback.

The hosted page currently fails before any return POST, so the probe below is what captures that case.

## 2. Admin IPG health check (signed probe)

Add a `action: "probe"` branch to `scotia-payment` (admin role required, same check the existing `testMode` uses):

1. Build and sign a real minimum-amount sale form for the configured store/env.
2. Server-side `POST` it to the gateway URL and read the HTML response body (never shown to a buyer; nothing is charged because the hosted page is only rendered, not completed).
3. Classify the body: hosted payment page rendered ("select payment method"), store-level rejection ("transaction may not be completed successfully"), hash rejection, or transport/HTTP error. Extract any `fail_rc` / error code present in the markup.
4. Write a `probe` row to `scotia_gateway_events` and return `{ accepted, classification, httpStatus, detail, snippet }` — a short sanitized HTML excerpt, no secrets.

Admin UI, in the existing consolidated Scotia section of `src/pages/admin/settings/IntegrationsPage.tsx`:
- "Run IPG health check" button showing a clear verdict: gateway accepts this store for Connect hosted-page transactions / gateway rejects the store / configuration or hash problem / unreachable.
- Show store id, environment, currency, timestamp, and the classification detail so it can be forwarded to Scotia support.
- A "Recent gateway events" list (last ~20 rows from `scotia_gateway_events`) with outcome, oid, fail code, and an expandable raw-parameter view.

## 3. Remove all iframe code

- `src/lib/payments/scotiaConnect.ts` — delete `submitScotiaForm`, the `hostURI` input field, and the iframe-mode comments; keep `redirectToScotiaPayment` as the only submission path.
- `supabase/functions/scotia-payment/index.ts` — drop `hostURI` from the prepare schema and from the signed params.
- `src/pages/CheckoutPage.tsx` and `src/pages/admin/settings/IntegrationsPage.tsx` — remove remaining iframe wording; the test dialog keeps redirect-only behaviour.
- Update `src/tests/integration/scotiaRedirectFlow.integration.test.ts` comments/assertions accordingly, and add a test that `prepare` never emits `hostURI`.

## Technical notes

- One migration: create the table, indexes on `created_at` and `oid`, RLS + GRANTs.
- Edge functions to redeploy: `scotia-payment`, `scotia-return`, `scotia-notify`. Run `npm run qa:edge-smoke` after the deploy, per repo rule.
- No change to settlement logic, order state, or the return redirect contract.
- The probe is admin-only and rate-limited to one run per 10 seconds per user to avoid hammering Fiserv.

## Verification

1. Run the health check from Integrations — expect it to reproduce the current store rejection and name the exact classification/code, which is the evidence Scotia support needs.
2. Confirm `scotia_gateway_events` gains a `probe` row and that no card data or secret appears in it.
3. Attempt a checkout payment — a single top-level redirect, no iframe anywhere, and a `prepare` row recorded.
4. `npx tsgo --noEmit -p tsconfig.app.json`, `npm run test -- --runInBand`, `npm run build`, `npm run qa:edge-smoke`.
