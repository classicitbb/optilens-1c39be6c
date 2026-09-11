# Work Handoff

- Repository: `classicitbb/optilens-1c39be6c`
- Status: Database and Edge deployed — frontend publish and production reconnection pending
- Last synchronized: 2026-09-11

## Current continuation

The 2026-09-11 repair is implemented locally across pricelist saves,
Gatekeeper polling/dispatch, shipment supplier defaults, and assistant-created
ticket attachments. Migrations
`20260911201657_pricelist_override_provenance_and_safe_materialization.sql`
and `20260911201702_gatekeeper_status_backoff_and_rx_fallback.sql` are deployed,
along with the changed `gatekeeper-orders` Edge Function. The frontend remains
to be published.

Before implementation, the live `pricelist_line_overrides` table had 481 rows
and three duplicate logical-key groups. An exact off-repository snapshot was
captured; the migration intentionally does not deduplicate those groups or
attempt to recreate previously deleted prices. The live Gatekeeper connection
was staging; outbound delivery, status polling, and cron job 233 were disabled
without changing its credential.

Focused validation passes: 22 Vitest tests across six files, full quiet ESLint,
PR checks, and the production build. The full Vitest sweep has two known
unrelated CRLF-sensitive failures in
`assistantUserMemory.integration.test.ts`. Live catalog verification confirms
271 manual plus 210 generated overrides and the production-only route guard.
`npm run qa:edge-smoke` was attempted after deployment, but all 40 probes failed
before HTTP because this workstation cannot complete certificate revocation
checking; the separate Lovable deployment completed. Required next action:
publish the frontend, then keep polling disabled until an administrator
supplies a fresh production Gatekeeper PIN and a read-only
authentication/contract/status pull succeeds. A real fallback order requires
separate approval and authoritative OptiLens Local proof.

HA Optical's production stock-order catalog is live and orderable. The live
database repair corrected `get_stock_order_catalog`, converts stock-lens pair
prices to per-lens order prices, fixes the three incorrect Innova family links,
and adds the missing SKU variants. The corresponding source migration is
`supabase/migrations/20260909203000_fix_ha_stock_order_catalog.sql`.

Order `DC30B7E3` was released to Innovations on 2026-09-09 with reference
`H A STOCK ORDER`, 17 lines, 36 pieces, and an authoritative $1,403.00 total.
The local source also removes `setStaged(null)` from stock-order line edits so
autosave updates one draft instead of creating a new draft for every edit.
That frontend fix is tested but not deployed. Passed: `npm run build` and
`npx vitest run --coverage=false src/tests/integration/adminStockOrdersRouteAccessibility.integration.test.ts`
(7 tests). Next action: publish the normal website frontend release containing
`src/pages/admin/StockOrderBuilderPage.tsx`, then verify that two consecutive
SKU scans retain one draft id.

The previously active Scotia continuation remains below.

The approved Scotia card-payment work is implemented in source: statement
amounts no longer wrap; `/admin/settings/payment-activity` is an admin-only,
minimal confirmation ledger; and the statement dialog requests saved-card
tokenization before the hosted Scotia redirect. The new migration
`20260904170609_card_payment_activity_and_statement_token_save.sql` creates a
security-invoker activity projection, clears existing raw Scotia request and
response parameter bags, and persists a provider token only after a signed
approved statement callback. Scotia event logging now retains only scalar
reconciliation fields. `supabase/functions/scotia-return/index.ts` adds the
safe saved-card confirmation flag.

- Passed: `npm run lint`; focused
  `adminPaymentActivityRouteAccessibility.integration.test.ts` (4 tests);
  `npm run build`; and `npm run qa:pr-checks`. A local browser visit to the
  admin route redirected an unauthenticated user to sign-in, confirming the
  route guard.
- Known baseline test failure: `npm run test -- --runInBand` stops at three
  existing admin-route tests that still assert the superseded `lazy(() =>
  import(...))` loader rather than the repository-wide `lazyWithRetry` loader
  now used in `AdminRoutes.tsx`. The new payment-route test uses the current
  loader contract and passes.
- Blocker: local Supabase Docker engine is unavailable, so generated types and
  local database/RLS tests could not run; the Deno CLI is also absent, so the
  Edge Function unit test cannot run locally. The local UI shows its expected
  unavailable-data state until the migration is deployed.
- Approval required: apply the migration and deploy `scotia-return` before any
  shared-environment verification or safe test transaction.
- Next action: after approval, deploy the migration and `scotia-return`, run
  `npm run qa:edge-smoke`, then complete one approved non-production Scotia
  statement payment with and without the save-card option.

## Completed work

Iris's authorized internal operations prompt now recognizes the approved
employee shorthand: Roy, Randall, Russell, Lily, Tia, Kevin, Greg, and
Gregory are unique first-name references; Lisa must be specified as Lisa J or
Lisa K. The roster rule is documented in `docs/ai-assistant-identity.md` and
is intentionally excluded from the public assistant context.

The staff-only walk-in payment flow is staged at
`/admin/settings/walk-in-payments`. A staff member creates a server-side,
exact-amount `walk_in_payments` intent, then reaches the existing full-page
Scotia/Fiserv hosted card flow. Both signed callback paths settle that same
intent idempotently and the page shows/prints only the stored receipt fields
and masked card information. The website has no card entry controls. The
future QR/payment-link decision is documented in
`docs/scotia-ecom-hosted-payment-integration.md`: do not turn a Direct Sale
form post into a public link; first confirm that the merchant account supports
a hosted pay-by-link API, then bind a one-time opaque expiry token to the
server-stored amount.

External Edge verification completed on 2026-09-02 with an existing staff
session: the route rendered, amount/customer/order/reason controls accepted
real sequential keyboard input, controls were enabled and not readonly, and no
card-number/CVV/expiry fields were present. The Take payment button was not
submitted, so no payment intent or gateway transaction was created.

The public Companion Assistant now displays an in-progress state while its AI
generation request runs. Its deterministic high-confidence match is displayed
only when that request fails, making the grounded AI answer the visitor's first
answer. `supabase/functions/_shared/aiIdentity.ts` and
`docs/ai-assistant-identity.md` define Iris's public customer-experience and
authorized business-operations fronts, including her proactive operating
posture and hard authority boundaries. The staged portrait in the public
assistant header now opens an in-page Iris profile with the approved title,
bio, fictional-avatar/AI disclosure, and explicit separation between public
guidance and the separately authorized operations workspace. Her shared prompt
uses she/her pronouns and a poised, warm, feminine, capable voice while
retaining the existing anti-impersonation and authority limits. Quote/support
launch compatibility now stays on the current page rather than opening or
redirecting to a standalone assistant window.

`public/images/iris/iris-ai-operations-partner.png` is a staged fictional AI
portrait. No external account, email identity, LinkedIn profile, Supabase
authorization change, or Edge Function deployment has
been performed; those actions require explicit approval.

The business owner approved actor-scoped Iris access, with a customer portal
user limited to their ERP-linked account, financial data reduced for users
without that capability, and a future admin-only controlled SQL gateway using
fresh single-use authorization. The complete contract is
`docs/iris-data-access-contract.md`. The staged migration
`20260830140634_iris_financial_data_capability.sql` exposes a server-side
admin-only capability, and `portal-copilot` now passes that resolved value into
the financial-marked typed resources. `admin_*` typed tools remain the only
Admin Copilot data path; the direct SQL gateway has not been implemented.

## Verification

- Rx mount compatibility repair (2026-09-07): assistant handoffs now emit
  `plastic`/`grooved`, and restored drafts normalize historical `full`/`supra`
  before validation, pricing, summaries, or printing. The focused mount
  regression assertions pass. The broader prefill test file retains its known
  unrelated `#ftemple` assertion failure because that control is absent from
  the current markup.

- Passed: `npx vitest run --coverage=false src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/embeddedRxOrderDraft.unit.test.ts` (9 tests), including the public profile/disclosure and in-page launch regression.
- Passed: `npm run build` after the public profile, persona, quote-launch, and saved-Rx changes.
- Passed: focused ESLint with 0 errors (existing warnings remain in the edited legacy files).
- Pending rendered screenshot evidence: the local Vite server started successfully, but Playwright's Chromium binary is absent and its download is blocked by `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Re-run the local desktop/mobile browser check after the workstation trust chain is repaired or a browser binary is installed.
- Passed: `npx vitest run --coverage=false src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/companionAssistantEngine.unit.test.ts` (10 tests).
- Passed: `npx eslint src/components/assistant/CompanionAssistant.tsx src/features/assistant/companionAssistantEngine.ts src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/companionAssistantEngine.unit.test.ts` (three existing warnings in `CompanionAssistant.tsx`; no errors).
- Passed: `npm run build`.
- After deploying the changed `companion-assistant` function, run `npm run qa:edge-smoke`.

## Pending deployment

- Do not deploy `20260902154434_staff_walk_in_payments.sql` or the changed
  `scotia-payment`, `scotia-return`, and `scotia-notify` functions without
  explicit approval. After a non-production deployment, sign in as an
  admin/operator, type a test amount and customer name in an external Edge or
  Chrome session, complete Scotia's approved test-card flow, and verify the
  settled receipt plus masked card output. The existing gateway configuration
  must be confirmed first; no production payment or credential was used here.

- Do not deploy the financial capability migration or the updated
  `portal-copilot` function without explicit production approval.
- Customer statement and balance access retains the existing account-level
  feature/tag gate; do not broaden it merely because a user is ERP-linked.
