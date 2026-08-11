# Fix Scotia hosted payment page (iframe + redirect)

## What I verified against the live gateway

Using the store ID and shared secret you gave, I signed a form the same way the app does and posted it to `https://test.ipg-online.com/connect/gateway/processing`:

- The credentials and the hash are correct. The gateway returned the real hosted page: "CLASSIC VISIONS — Please select payment method / VISA / Mastercard / Amount $1.00 USD".
- The stored credentials in the backend secret store match exactly what you pasted (store `8118121009871`, currency 840, timezone America/Barbados, environment test, secret fingerprint identical).

So nothing is wrong with the signing, the secret, the currency, or the store ID.

## Why it fails in the app

Two separate defects, both in the browser flow:

1. **The iframe can never work.** Fiserv returns `X-Frame-Options: SAMEORIGIN` and `frame-ancestors 'self'` on the hosted page. Any cross-origin iframe is blocked by the browser, always. Checkout still mounts `ScotiaPaymentFrame` as the primary path, so the buyer sees a blank/blocked panel for up to 12 seconds.

2. **The fallback redirect re-posts a form the gateway has already consumed.** When the frame is detected as blocked, the code calls `onFallback(prepared)` with the *same* prepared params (same `oid`, same `txndatetime`, same `hashExtended`) that were already POSTed into the iframe. I reproduced this against the live gateway: the second identical POST returns "Your transaction may not be completed successfully — Unknown application error occurred." A fresh POST with a new `txndatetime` for the same order works fine.

Net effect: the iframe shows nothing, then the redirect lands on the gateway's generic error page.

## The fix

- Stop using the iframe at checkout. Do not mount `ScotiaPaymentFrame`; keep the file stashed/unimported as it already documents itself, or delete it.
- On "Open secure payment", call `prepareScotiaPayment` once and immediately `redirectToScotiaPayment` — a single top-level POST per prepared form. Never reuse a prepared form for a second submission.
- Drop `hostURI` from the params when submitting in redirect mode (it is an IFRAME-mode field only); `prepare` should omit it unless an iframe host is genuinely in use.
- Ensure every retry (checkout retry button and the statements page) goes through a **fresh** `prepare` call, so `txndatetime` is new. Reusing the same order id is fine — verified.
- Leave `scotia-return` / `scotia-notify` and the settlement logic untouched; they are not implicated.

## Technical notes

Files affected:
- `src/pages/CheckoutPage.tsx` — remove the `ScotiaPaymentFrame` mount and the `scotiaIntent` iframe branch; make `handleScotiaCheckout` prepare-then-redirect in one step.
- `src/components/account/sections/StatementsSection.tsx` — confirm it also prepares fresh on each attempt (single POST).
- `src/lib/payments/scotiaConnect.ts` — no signature change needed; optionally mark `submitScotiaForm` as unused/iframe-only and guard against double submission of the same prepared object.
- `supabase/functions/scotia-payment/index.ts` — only if `hostURI` needs to be excluded from the signed params for redirect mode.

No database, RLS, or migration changes. No new secrets: the store ID/secret already in the encrypted gateway settings are correct.

## Security note

The shared secret was pasted into chat. It is already stored correctly server-side, so no change is needed, but it is worth rotating it with Fiserv at some point and updating the gateway settings record.

## Verification after the change

1. Place a test order with the Scotia method — the browser should leave the app immediately and land on the "CLASSIC VISIONS / select payment method" page (no blank panel, no error page).
2. Complete a test card payment and fix the return leg, which has been failing and is treated as in-scope work, not just a check: confirm the gateway POSTs back to `scotia-return`, that the response hash validates (log `expected` vs `received` if it does not), that the `oid` resolves to the order, that the order and `order_payments` rows are settled via the service role, and that the browser lands back in the app with `?scotia=success`. Also confirm `scotia-notify` records the same outcome server-to-server so settlement does not depend on the buyer's browser completing the redirect.
3. Trigger a decline, then use the retry button and confirm the second attempt also reaches the hosted page (proving the fresh-prepare fix).
