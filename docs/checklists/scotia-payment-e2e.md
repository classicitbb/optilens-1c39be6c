# Scotia payment end-to-end checklist

Run this on the staging site before enabling live Scotia payments. Use a dedicated
test customer and a disposable test cart; never use a production card or another
customer's order identifier.

## Preflight

- [ ] `SCOTIA_SITE_ORIGIN` exactly equals `https://classic-visions-smart-journey-2026.clasviz.chatgpt.site` (no trailing path or slash).
- [ ] `VITE_SCOTIA_ENABLED=true` and `VITE_SCOTIA_ENV=test` are enabled only in the test build.
- [ ] The deployed `scotia-payment` function requires a user JWT; `scotia-return` remains public because Scotia posts to it without a session.
- [ ] Scotia test credentials and the staging origin are in the Edge Function secrets, never in browser build variables.
- [ ] Log in as the test customer and add one identifiable product to the cart.

## Successful payment

1. [ ] Complete checkout with Scotia selected and note the order UUID shown after returning.
2. [ ] In browser devtools, verify the top-level form POST goes only to the Scotia test gateway and includes the opaque `oid`, `chargetotal`, `storename`, and `hashExtended`; it must not contain the shared secret.
3. [ ] Complete Scotia's approved-card test flow. Confirm the gateway sends a browser POST to `scotia-return`, then receives a 302 to `/order-complete?scotia=success&order=<uuid>` on the staging origin.
4. [ ] Confirm `/order-complete` briefly shows “Confirming your payment” and then “Payment received”. It must show a success state only after the signed callback has updated the customer-owned order to `confirmed` and its Scotia payment to `settled`.
5. [ ] In Supabase, confirm the returned `oid` equals the order UUID, `order_payments.amount` equals Scotia's `chargetotal`, and a `scotia_payment_settled` event exists with the gateway response code.
6. [ ] Re-submit the exact approved callback once. It must be harmless: the payment remains settled, the order remains confirmed, and no conflicting state is created.

## Decline and signature rejection

1. [ ] Run Scotia's declined-card test flow. Confirm `/order-complete` displays “Payment declined”, `order_payments.status=failed`, and `orders.status=pending_payment`.
2. [ ] Use “Retry payment” and confirm it sends the same customer-owned order and exact stored total back to Scotia.
3. [ ] Replay a callback with one changed signed field (for example `chargetotal` or `response_hash`). Confirm `scotia-return` redirects with `scotia=error`, writes no successful settlement, and leaves the order unpaid.
4. [ ] Attempt a validly shaped callback where `oid` or `chargetotal` does not match the pending Scotia payment. Confirm the settlement is rejected and no order status changes.

## Ownership checks

1. [ ] While logged in as customer A, call `scotia-payment` prepare with customer B's order UUID. It must return 403 and must not return a signed form.
2. [ ] While logged in as customer A, visit `/order-complete?scotia=success&order=<customer-B-order>`. It must show “Order unavailable” and reveal neither the order reference nor its payment state.
3. [ ] Repeat the successful flow after signing out before the return. The page must require sign-in and, after customer A signs back in, read only A's order through RLS.

## Release evidence

- [ ] Record the staging URL, order UUIDs (or securely redacted equivalents), timestamps, gateway response codes, and the deployed Edge Function revision in the release ticket.
- [ ] Disable test-mode payment capability or keep it explicitly restricted after the test window closes.
