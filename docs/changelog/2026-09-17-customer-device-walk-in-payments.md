# Customer-device walk-in payments

## Metadata
- Date (UTC): `2026-09-17`
- Release train / version: `2026-09-17`
- Owner: Payments
- Related PRs: branch `claude/adoring-mendel-jmshw6`

## Plan
- Problem statement: walk-in customers are asked to hand their card to staff at the
  counter, and some do not want to. There is also no way to take a card payment from
  a customer who is not physically present.
- Scope: three customer-device payment paths (assisted claim code, emailed pay link,
  unassisted self-service), a public `/pay` page, and the supporting token,
  rate-limit and reconciliation model.
- Non-goals: refunds and voids, per-location payment routing, changes to the existing
  statement (`STMT-`) or order checkout flows, adopting the orphan
  `order_payment_links` table.

## Release Notes
- **Settings → Walk-in Payments** now offers three ways to take a payment:
  **Take card now** (unchanged, uses the shop device), **Publish link** (the customer
  scans the counter QR code and types a short code the cashier reads out), and
  **Request by email** (the customer gets a one-time pay link valid for 72 hours and
  can pay from anywhere).
- The staff screen updates by itself the moment the customer's payment goes through,
  so the cashier knows when to hand over the glasses.
- A walk-in can also pay with no staff involvement by scanning the counter QR code and
  entering their own amount, between BBD $20 and BBD $500. These appear in a
  **needs matching** list on the same page so they can be attached to an order.
- Walk-in payment amounts are now recorded in Barbados dollars, which is what the bank
  has always charged. Receipts previously showed the raw code `840`.
- Rollout: the self-service option is available only once Cloudflare Turnstile keys are
  configured; until then it is hidden and refuses to start payments. The assisted and
  email options do not depend on it.

## Technical Changelog
- Files/modules changed: new `supabase/functions/walkin-pay/`, new public
  `src/pages/PayPage.tsx` and `src/pages/PayResultPage.tsx`,
  `src/lib/payments/walkInPay.ts`, `src/components/payments/TurnstileWidget.tsx`,
  `src/features/admin/walk-in-payments/*`; extended
  `src/pages/admin/WalkInPaymentsPage.tsx`, `supabase/functions/scotia-payment`,
  `supabase/functions/scotia-return`, `supabase/functions/_shared/scotia/ipgConnect.ts`,
  `supabase/functions/_shared/email/*`, `src/components/seo/Seo.tsx`,
  `src/routes/public/PublicRoutes.tsx`, `src/config/routeRegistry.ts`.
- Data model/API implications: migration
  `20260917101500_customer_device_walk_in_payments.sql` adds `origin`,
  `link_token_hash`, `claim_code_hash`, `link_expires_at`, `token_used_at`,
  `claim_attempts`, `published_at`, `contact_id`, `needs_matching`, `matched_by` and
  `matched_at` to `walk_in_payments`; adds `walk_in_payment_settings` and
  `public_payment_attempts`; adds `publish_walk_in_payment`,
  `resolve_walk_in_payment_link`, `create_self_serve_walk_in_payment`,
  `match_walk_in_payment` and `record_public_payment_attempt`; corrects the `currency`
  CHECK from `'840'` to `'052'` and backfills existing rows; and publishes
  `walk_in_payments` for realtime.
- Security/privacy implications: link tokens and claim codes are stored only as
  SHA-256 hashes and are returned in plaintext exactly once. `anon` has no access to
  `walk_in_payments` and cannot execute the public RPCs; all anonymous access goes
  through `walkin-pay` (`verify_jwt = false`, authenticated by token in code) using the
  service role, which returns only the name, amount and reason for the one payment the
  caller holds a token for. `scotia-payment` stays JWT-verified and staff-gated, so the
  existing order, statement and staff walk-in signing paths are unchanged. Wrong,
  expired, spent and non-existent links all return one identical message so the page is
  not an oracle. Self-service additionally requires Cloudflare Turnstile (fail closed),
  a durable per-IP rate limit, database-enforced amount bounds and an admin kill
  switch. No PAN, CVV, expiry or card token is accepted anywhere in this change.

## Validation
- Automated checks run: `npm run lint` (0 errors), `npm run test -- --runInBand`
  (911 passing; the 3 remaining failures are pre-existing generated-type drift from the
  prior shipment Document AI work), `npm run build`, and a new integration suite
  `src/tests/integration/customerDeviceWalkInPayments.integration.test.ts`.
- Manual verification: the migration was applied to a scratch PostgreSQL 16 instance
  seeded with the pre-migration schema, and the RPCs were exercised directly — currency
  backfill, publish, resolve by code (including lower-case and hyphenated input),
  wrong-code rejection, single-use redemption, replay rejection, expiry rejection,
  emailed-token resolution, self-service bounds, kill switch, queue matching,
  non-staff rejection, `anon` denial on both the table and the RPCs, and the rate
  limiter tripping on the sixth attempt.
- Known risks + mitigations: a published link is single-use, so a declined card needs a
  fresh link from staff — the public result page tells the customer this. Live
  end-to-end verification against the Scotia test gateway has not been run, and the
  Edge Functions are not deployed; `npm run qa:edge-smoke` is required after deploy.
  Self-service stays disabled until `TURNSTILE_SECRET_KEY` and
  `VITE_TURNSTILE_SITE_KEY` are configured.
