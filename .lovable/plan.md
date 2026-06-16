## Problem
The checkout UI offers four payment tiles — `on_account`, `stripe_offline`, `firstpay_offline`, `bimpay_offline` — but the `place_customer_order` RPC's allowlist is missing `bimpay_offline`, so clicking Place Order raises `Unsupported checkout method.`

## Business context (per user)
No on-site payment capture today. Every "payment method" is really just the customer's stated intent. The flow is intentional:
1. Customer checks out → order is recorded as `pending` with payment `initiated`.
2. Sales reaches out (upsell, ship-date confirmation, quantity sanity check).
3. Payment is collected off-platform in full before warehouse fulfilment.
4. `on_account` only appears for trade accounts with credit approval; everyone else picks one of the offline cash/card rails (Stripe, 1stPay, BimPay).

So authorising all UI-exposed methods at the RPC layer is correct — none of them auto-capture funds; they're all "order accepted, awaiting payment."

## Fix
Update `public.place_customer_order` so the allowlist matches the UI exactly and every non-demo method maps to the same offline-pending path already used by Stripe / 1stPay.

Allowlist after migration:
- `saved_demo_card`, `new_demo_card`, `google_pay` (existing demo paths, unchanged)
- `manual_review` (admin-only, unchanged)
- `on_account` (gated by credit approval in the UI; RPC keeps existing behaviour)
- `stripe_offline`, `firstpay_offline`, `bimpay_offline` → order `pending`, payment row `initiated`, no capture, provider tagged accordingly (`stripe` / `firstpay` / `bimpay`)

No frontend changes — `CheckoutPage.tsx` already sends the correct identifiers.

## Validation
After approval, place a test order with each of the four tiles from `/checkout` and confirm:
- An `orders` row is created with `status = 'pending'`.
- A matching `order_payments` row exists with `status = 'initiated'` and the right provider label.
- No "Unsupported checkout method" toast.