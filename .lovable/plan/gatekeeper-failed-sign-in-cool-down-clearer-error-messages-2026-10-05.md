# Gatekeeper: failed sign-in cool-down + clearer error messages

## What this does

Two improvements to the Gatekeeper integration on the Integrations settings page, after today's repeated 401 errors:

1. **Failed sign-in cool-down** — once Gatekeeper rejects the saved login, the app stops contacting Gatekeeper until someone reconnects with a new PIN (or 12 hours pass). This protects the lab from Gatekeeper's ~2-sign-ins-per-day block.
2. **Plain-language error messages** — replace the raw "HTTP 401" texts with messages that say what happened, why, and what to do next.

## Current state (verified)

- The cool-down logic already exists in `supabase/functions/gatekeeper-orders/index.ts` (`assertNoRecentAuthRejection`, 12-hour window, checks `gatekeeper_dispatch_logs` for the latest `auth_user` 401/403). It was added last turn.
- The two raw error messages staff see today:
  - `Gatekeeper authentication failed (HTTP 401).` — thrown in `authenticate()` when the saved JWT key/secret is rejected.
  - `Gatekeeper did not accept the PIN (HTTP 401).` — thrown in the `connect` action when the single-use PIN is rejected.
- The settings UI (`src/components/admin/GatekeeperIntegrationTab.tsx`) shows these verbatim in a toast and in the "Last result" line.

## Changes

### 1. Confirm the cool-down is wired in

- Verify `assertNoRecentAuthRejection` is actually called before every `authenticate()` attempt (connect, refresh-contracts, order send, status pull). Add the call anywhere it is missing.
- Keep the existing behaviour: a successful sign-in (e.g. reconnect with a fresh PIN) clears the pause immediately.

### 2. Rewrite the error messages (edge function)

In `supabase/functions/gatekeeper-orders/index.ts`, replace the raw texts with explanatory ones. No behaviour changes — same status codes, same log records.

- **Saved login rejected (401/403):**
  "Gatekeeper rejected the saved login details. This usually means Ocuco has reset or expired your lab's access. Ask Ocuco for a new single-use PIN, then reconnect below. Sign-in is paused until [time] UTC to protect your lab from being blocked."
- **PIN rejected (401):**
  "Gatekeeper did not accept that PIN. Each PIN works only once and must match the lab ID it was issued for. Check the lab ID, or ask Ocuco for a fresh PIN. Do not retry the same PIN — repeated attempts can get the lab blocked."
- Include which environment was contacted (test vs live server) in both messages, since today's confusion was partly test-server vs live-server.
- Keep the technical detail (HTTP status) at the end of the message in brackets for support reference.

### 3. Surface the messages properly in the UI

In `src/components/admin/GatekeeperIntegrationTab.tsx`:

- Show the full error text in the toast (these messages are longer; use the toast description, not the title).
- The "Last result" line under the connection status already shows `last_error` — confirm the new longer text wraps cleanly instead of truncating.

## Verification

- `npx tsgo --noEmit -p tsconfig.app.json` clean.
- Redeploy `gatekeeper-orders` only; run `npm run qa:edge-smoke` (must stay fully green).
- No database migrations. No changes to any other function. No secrets touched.

## Out of scope

- Contacting Ocuco / obtaining a new PIN — that is a phone call or email to Ocuco support; the app cannot fix the rejected credentials itself.
