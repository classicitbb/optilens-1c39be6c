# Work Handoff

- Repository: `classicitbb/optilens-1c39be6c`
- Status: Source complete — deployment pending
- Last synchronized: 2026-09-04

## Current continuation

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

- Passed: `npx vitest run --coverage=false src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/embeddedRxOrderDraft.unit.test.ts` (9 tests), including the public profile/disclosure and in-page launch regression.
- Passed: `npm run build` after the public profile, persona, quote-launch, and saved-Rx changes.
- Passed: focused ESLint with 0 errors (existing warnings remain in the edited legacy files).
- Pending rendered screenshot evidence: the local Vite server started successfully, but Playwright's Chromium binary is absent and its download is blocked by `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Re-run the local desktop/mobile browser check after the workstation trust chain is repaired or a browser binary is installed.
- Passed: `npx vitest run --coverage=false src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/companionAssistantEngine.unit.test.ts` (10 tests).
- Passed: `npx eslint src/components/assistant/CompanionAssistant.tsx src/features/assistant/companionAssistantEngine.ts src/tests/unit/CompanionAssistant.test.tsx src/tests/unit/companionAssistantEngine.unit.test.ts` (three existing warnings in `CompanionAssistant.tsx`; no errors).
- Passed: `npm run build`.
- After deploying the changed `companion-assistant` function, run `npm run qa:edge-smoke`.

## Pending deployment

- Do not deploy the financial capability migration or the updated
  `portal-copilot` function without explicit production approval.
- Customer statement and balance access retains the existing account-level
  feature/tag gate; do not broaden it merely because a user is ERP-linked.
