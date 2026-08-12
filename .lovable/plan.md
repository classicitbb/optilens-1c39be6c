# Gatekeeper delivery: smoke fix, payload tests, status polling, stuck orders

Four related items, in the order they should ship.

## 1. Fix the scotia-notify smoke failure

`scotia-notify` is a server-to-server webhook from the payment gateway. It only answers
`GET` (a version ping) and `POST` (the notification) and returns `405` for anything else,
including the `OPTIONS` preflight the smoke script sends. No browser ever calls it, so
there is nothing to fix in the function — the smoke script is asserting a browser contract
against a webhook.

Fix: add `scotia-notify` to the `NO_CORS_FUNCTIONS` list in `scripts/edge_functions_smoke.mjs`
(the same treatment `process-email-queue` and other non-browser functions already get), so
the check becomes "booted and routing, not 5xx". Add a short comment saying why.

Then rerun `npm run qa:edge-smoke` and confirm a clean pass.

## 2. Automated tests for order payload field constraints

`supabase/functions/_shared/orders/hashref.ts` already enforces the Gatekeeper spec rules
(lowercase `agent_name`, `lab_num` zero-padded 001-999, 3-digit `cust_seq_num`), but nothing
locks that behaviour in. Extend `src/tests/unit/orderHashref.unit.test.ts` with a constraint
block covering both order kinds (Rx and stock) and each routing shape:

- `lab_num` zero-pads (`"5"` -> `"005"`), passes through `"742"`, and rejects `0`, `1000`,
  and non-numeric values.
- `cust_seq_num` is always exactly three digits, derived from the order number, for both
  Rx and stock orders.
- `cust_num` is passed through unchanged for a name-style retailer receiver, and stays a
  plain integer string for the Labzilla-style numeric receiver.
- `agent_name` is always lowercase regardless of input casing.
- A table-driven case list runs every receiver/routing combination through the same
  assertions so a new receiver type cannot be added without covering it.

## 3. Status polling, throttled to once per 5 minutes

Gatekeeper's spec forbids pulling statuses more often than every 5 minutes.

- Add a `pull_statuses` action to `supabase/functions/gatekeeper-orders/index.ts` that
  looks up submitted orders with a Gatekeeper receipt, queries Gatekeeper's status endpoint
  keyed on `PoNumber`, and writes the latest status/tracking text back to the submission row.
- Enforce the throttle server-side: a `last_status_pull_at` timestamp on the Gatekeeper
  settings row; any call inside 5 minutes returns the previous result without contacting
  Gatekeeper. This holds even if the UI or cron misbehaves.
- Schedule it with a pg_cron job every 5 minutes, reusing the existing scheduled-function
  pattern.
- Surface the result on `/admin/website/rx-submissions`: a "Lab status" column showing the
  latest status plus a relative "checked N min ago", refreshing on the page's existing
  30-second query interval.

## 4. Why some rows have Gatekeeper receipts and others don't — plus a resend button

Confirmed from the submissions table: six rows sit at `status = approved`,
`dispatch_provider = gatekeeper`, `attempts = 0`, `claimed_at = null`. They were released
during the window when the contract lookup was returning 502, so the release RPC marked
them approved but the follow-up `send` call never reached Gatekeeper. Rows created after
that fix show `status = submitted`, `transport = gatekeeper` and a receipt code.

Nothing retries them: the release mutation approves and sends in one shot, and the outbox
UI only renders actions for `pending_review` and `failed`. An approved-but-unsent row is a
dead end.

Fix:

- Show a **Send now** action for `approved` rows with `dispatch_provider = gatekeeper`,
  which calls the existing `gatekeeper-orders` `send` action without re-approving.
- Show **Retry** for `claimed` rows older than a few minutes (a send that died mid-flight),
  guarded so it cannot double-send a row that already recorded a receipt.
- Make the release mutation record a failure on the row when the send call throws, so the
  row lands in `failed` (already actionable) instead of stranding at `approved`.
- Backfill: send the six existing stranded rows through the new action after deploy, and
  confirm each records a receipt.

## Technical notes

- Files touched: `scripts/edge_functions_smoke.mjs`, `src/tests/unit/orderHashref.unit.test.ts`,
  `supabase/functions/gatekeeper-orders/index.ts`, `src/features/rx-order/hooks/useRxSubmissions.ts`,
  `src/pages/admin/RxSubmissionsPage.tsx`, plus one migration for the status-pull timestamp
  and the cron schedule.
- No change to the hashref builder's output — item 2 only pins existing behaviour.
- Validation: `npm run test`, `npm run lint`, `npm run build`, `npm run qa:edge-smoke`.
