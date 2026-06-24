# Scotia eCom+ Hosted Payment — Integration Plan

> Source: _Scotia eCom+™ Hosted Payment User Guide_ (`docs/Hosted Payment Page_Manual.pdf`).
> Underlying processor: **Fiserv IPG "Connect"**. This document specifies how the
> hosted payment page is integrated into the **checkout page** and **customer
> portal**, and records the scaffold already added to the codebase.

Status: **scaffold landed, behind a feature flag (`VITE_SCOTIA_ENABLED=false`).**
Nothing here changes behaviour for users until the flag is turned on with
certified credentials. The existing offline methods (Stripe / 1stPay / BimPay)
and on-account remain the permanent fallback.

---

## 1. How the gateway works

Hosted payment is a **form-POST + redirect/iframe** model — there is no REST API
and no card data ever touches our servers (so we inherit Fiserv's PCI
certification). The merchant:

1. Builds an HTML form of hidden inputs describing the transaction.
2. Signs it with an **HMAC-SHA256 "extended hash"** keyed by the SharedSecret.
3. POSTs it to the gateway processing URL.
4. Receives the outcome back as **POST parameters** at its own
   `responseSuccessURL` / `responseFailURL`, and validates a **response hash**.

Two embedding modes (manual p.2):

| Mode | Buyer experience | Extra requirement |
|------|------------------|-------------------|
| **IFRAME** (chosen) | Stays on our checkout page | `hostURI` param + `postMessage` listener |
| Redirect | Browser leaves to Scotia, returns to our URLs | none |

We target **IFRAME mode** so the buyer never leaves the checkout flow.

### What we need (manual p.5)
- **StoreID** (`storename`, prod ids start with `62…`)
- **SharedSecret** (HMAC key — server-side only, never shared/committed)
- Valid **SSL** certificate
- Our own **response URLs** (POST receivers)
- Control of front- and back-end so the hash is generated **server-side**

Credentials are issued per environment: **test** first, then **production**
after a certification session (test sales, success + rejection cases, correct
amount shown, `oid` surfaced for support). See manual p.6.

---

## 2. The hash contract (the part that must be exact)

### Request — `hashExtended` (manual p.9)
1. Take **all** form params **except** `sharedsecret` and `hashExtended`.
2. Sort **ascending by field name** using **ASCII** order (uppercase before
   lowercase).
3. Join the **values** (not names) with `|`.
4. `HMACSHA256(stringToHash, sharedSecret)` → **Base64** → `hashExtended` input.

Worked example from the manual reproduces to:
```
13.00|combinedpage|978|HMACSHA256|https://…/response_failure.jsp|https://…/response_success.jsp|10123456789|Europe/Berlin|2021:09:06-16:43:04|sale
```
Our implementation (`buildExtendedHashString`) reproduces this exact string
(verified — JS/Deno default string sort is the required ASCII ordering).

### Response — `response_hash` (manual p.10)
Fixed order (NOT the ascending sort):
```
approval_code|chargetotal|currency|txndatetime|storename
```
Recompute and compare (constant-time) to the `response_hash` POST field to prove
the response is authentic and untampered.

### Base request fields (manual p.8)
`chargetotal`, `checkoutoption=combinedpage`, `currency` (ISO numeric — **840
USD**, 484 MXN), `hash_algorithm=HMACSHA256`, `responseFailURL`,
`responseSuccessURL`, `storename`, `timezone` (Area/Location), `txndatetime`
(`YYYY:MM:DD-hh:mm:ss`, never fixed), `txntype=sale`.

---

## 3. Mapping to our architecture

| Manual concept | Our system |
|----------------|------------|
| Server-side hash generation | **Supabase Edge Function** `scotia-payment` (Deno) |
| SharedSecret storage | Supabase **function secret** `SCOTIA_SHARED_SECRET` |
| HTML form + IFRAME submit | `ScotiaPaymentFrame.tsx` + `scotiaConnect.ts` |
| Checkout payment selection | `CheckoutPage.tsx` Payment step (flag-gated card) |
| `responseSuccess/FailURL` | `/checkout` route receives gateway `postMessage` |
| Response validation | `scotia-payment` `validate` action |
| `oid` for support | our order reference / PO number |
| Tokenization `hosteddataid` | `customer_payment_methods` (provider `scotia`) |
| Reconciliation | `order_payments.gateway_*` columns |
| Soft vs hard declines (p.15-17) | `isSoftDecline()` → retry vs. switch method |

### IFRAME flow (end to end)
```
CheckoutPage (Payment step, buyer picks "Credit / Debit card")
   └─ ScotiaPaymentFrame mounts
        1. prepareScotiaPayment()  ──POST──▶ scotia-payment (prepare)
                                              · builds form params
                                              · computes hashExtended (secret server-side)
        2. submitScotiaForm()  ──POST form──▶ gateway (target=iframe, hostURI set)
        3. buyer enters card INSIDE the iframe (hosted by Scotia)
        4. gateway ──postMessage──▶ ScotiaPaymentFrame (origin-checked)
        5. validateScotiaResponse() ──POST──▶ scotia-payment (validate)
                                              · checks response_hash
                                              · classifies approved / soft / hard
        6. onResult() → settle order / show retry / show hard-decline
```

---

## 4. Files added (scaffold)

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/scotia/ipgConnect.ts` | Pure hash utilities (extended hash, response hash, soft/hard classification). Verified against the manual's worked example. |
| `supabase/functions/scotia-payment/index.ts` | Edge Function. `prepare` (build + sign form) and `validate` (response hash). Holds the secret. Returns **503 if credentials are unset** (never signs blank). |
| `supabase/config.toml` | Registers `scotia-payment` (`verify_jwt=false` for now; **set true before prod**). |
| `src/lib/payments/scotiaConnect.ts` | Frontend client: feature flag, `prepare`/`validate` invokers, hidden-form submit, origin helper. |
| `src/components/checkout/ScotiaPaymentFrame.tsx` | IFRAME host + `postMessage` listener. |
| `src/pages/CheckoutPage.tsx` | Flag-gated "Credit / Debit card" option in the Payment step; renders the frame; offline methods untouched. |
| `supabase/migrations/20260624170000_scotia_ecom_gateway_scaffold.sql` | Additive: `scotia` provider, nullable `gateway_*` columns on `order_payments`. |
| `supabase/migrations/20260624173000_settle_scotia_payment_rpc.sql` | `settle_scotia_payment()` RPC: patches the payment row with the verified gateway result, saves the returned token as a `scotia` card, sets order status, writes an audit event. |
| `src/hooks/useOrders.ts` | `settleScotiaPayment()` helper calling the RPC. |
| `src/hooks/useCustomerPaymentMethods.ts` | Surfaces the real `scotia` provider for saved tokens. |
| `.env` | `VITE_SCOTIA_ENABLED` / `VITE_SCOTIA_ENV` (disabled). |

### Credential store (admin-managed)
StoreID + SharedSecret are no longer env-only. They are managed at
**Admin → Settings → Payment Gateway** (`/admin/settings/integrations`, which
replaced the decommissioned Odoo integration):

- `payment_gateway_settings` — non-secret config (store_id, environment,
  currency, timezone, enabled, status). Admin-readable via RLS.
- `payment_gateway_secrets` — the SharedSecret, `pgp_sym_encrypt`-encrypted at
  rest; RLS denies all direct access.
- `upsert_payment_gateway_settings(...)` — admin-only RPC; encrypts the secret
  on write.
- `get_scotia_credentials()` — SECURITY DEFINER, **service-role only**; decrypts
  and returns credentials to the `scotia-payment` Edge Function.

The Edge Function resolves credentials from this store first and falls back to
`SCOTIA_*` env vars if the store is empty (dev/local). The "Test configuration"
button asks the function to build a signed (zero-charge) form to prove the
credentials resolve and the hash computes.

> **Odoo removed.** The former Odoo connector (edge functions, `_shared/odoo`,
> `src/server/sync`, sidebar/notification sources, and DB tables/RPCs) has been
> fully removed — see migration `20260624181000_drop_odoo_integration.sql`.

### Saved-card reuse (CVV-only)
The checkout payment step lists saved `scotia` cards; selecting one sends
`hosteddataid` through `prepare`, so the gateway prompts for **CVV only**
(manual p.23). "Use a new card" falls back to full entry with an optional save.

### Settlement flow (now wired)
On an approved + hash-valid result, `handleScotiaResult` (CheckoutPage):
1. `createOrder(... checkoutMethod: "scotia_ecom")` → order in `confirmed`/`settled`.
2. `settleScotiaPayment(order.id, gateway)` → patches `order_payments`
   (`provider='scotia'`, `gateway_oid`/`response_code`/`hosteddataid`), and — when
   "save this card" is ticked (`assignToken=true`) — stores the returned
   `hosteddataid` in `customer_payment_methods` for CVV-only reuse.

---

## 5. Advanced features (designed in)

All supported by the `prepare` action; each just adds params **before** the hash
is computed, so the existing hash logic covers them.

- **Tokenization (p.22-23).** Send `assignToken=true` to save a card → the
  response returns `hosteddataid`. Persist it to `customer_payment_methods`
  (provider `scotia`, replacing the placeholder `demo_…` token). Reuse by
  sending `hosteddataid` → buyer is asked **only for CVV**. This slots directly
  into the existing portal "Payment Methods" section and `useCustomerPaymentMethods`.
- **MSI / months-without-interest (p.20-21).** `numberOfInstallments`,
  `installmentsInterest`, optional `installmentDelayMonths`. Requires the
  service be enabled by the Fiserv Integrations Team at store generation.
- **Scheduled recurring charges (p.24).** `recurringInstallmentCount` /
  `Period` / `Frequency`, optional `recurringComments`, and a **mandatory**
  `ponumber` (contract number) — we already capture PO numbers at checkout.

---

## 6. Security & compliance

- **SharedSecret never leaves the server.** It is a Supabase function secret,
  read only inside `scotia-payment`. The browser receives only the finished,
  already-signed param set. No hashing happens client-side.
- **Validate every response hash** before trusting an outcome
  (`validate` action) — guards against spoofed/replayed `postMessage` payloads.
- **Origin-check the iframe `postMessage`** against the configured gateway
  origin (test vs prod) — the listener drops everything else.
- **Set `verify_jwt=true`** on `scotia-payment` before production so only
  authenticated checkout sessions can request a signed form.
- **PCI scope stays minimal** — card entry is inside Fiserv's hosted iframe; we
  store only the `hosteddataid` token, brand, last4, expiry (as today).
- **Amounts** are normalized server-side to 2dp; `txndatetime` is always
  generated fresh (never fixed) per the manual.

---

## 7. Gap analysis — to finish for "full integration"

1. **Credentials.** Obtain test `StoreID` + `SharedSecret`; set
   `SCOTIA_STORE_ID`, `SCOTIA_SHARED_SECRET`, `SCOTIA_ENV`, `SCOTIA_CURRENCY`
   (840), `SCOTIA_TIMEZONE` (e.g. `America/Barbados`) as function secrets.
2. **Order settlement.** ✅ Implemented via `settle_scotia_payment()` +
   `useOrders.settleScotiaPayment()`. Remaining: surface saved Scotia cards as a
   reuse option in the checkout payment step (CVV-only flow), and confirm stock
   decrement happens where expected.
3. **Token persistence.** ✅ Implemented — `assignToken` (the "save this card"
   checkbox) stores `hosteddataid` in `customer_payment_methods` (provider
   `scotia`). Remaining: a checkout picker to pay with a previously saved card.
4. **Decline UX.** Map association codes to friendly copy; allow retry on soft
   declines, force method-switch on hard declines (helpers already provided).
5. **Confirm gateway `postMessage` shape** during certification (the manual's
   sample is lightly malformed); `extractResponseParams` already handles both
   `elementArr` and a flat param bag.
6. **Certification session** with Fiserv (success + rejection cases, amount +
   `oid` display), then swap to production credentials.
7. **`verify_jwt=true`** + review CORS allow-list for the function.

---

## 8. Compatibility verdict

The current checkout (4-step flow, pluggable payment methods, `order_payments`
with `initiated/authorized/settled` statuses) and the customer portal (tokenized
payment methods, Supabase Edge Functions) are **well aligned** with the
hosted-payment model. No architectural conflict was found. The integration is
additive and the offline methods remain as the required fallback. Remaining work
is credential provisioning and back-end settlement wiring (section 7).
