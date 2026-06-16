# Cart → Checkout → Drafts → Admin Orders: fixes, polish & E2E tests

## 1. Fix checkout "blink and return to cart"

**Root cause:** `CheckoutPage.tsx` guard (line 264) checks `items.length === 0` while `CartContext.loading` is still `true` on first render after navigation. The cart hasn't fetched yet, so the guard fires `navigate("/cart", { replace: true })` immediately.

**Fix:** read `loading` from `useCartContext()` and gate the guard:

```ts
if (!loading && !isComplete && items.length === 0) navigate("/cart", { replace: true });
```

Also include `loading` in the effect deps.

## 2. Fix checkout header overlap

`<Header />` is `fixed top-0` (h-16). Currently breadcrumb + stepper render flush below it with no offset — they sit under the fixed header. The `pt-24` lives on `<main>`, too late.

**Fix:** wrap the breadcrumb+stepper container in `pt-16` (or move the offset to the outer `<div>` after `<Header />`), and drop the redundant `pt-24` on `<main>` to `pt-6`. Verify cart, checkout, drafts, profile all use the same offset pattern.

## 3. Cart / Checkout / Drafts typography alignment

Audit and align fonts across `CartPage`, `CheckoutPage`, `CartDraftsSection`, `SaveDraftDialog`:

- Page titles → default sans . never use serif fonts. 
- Body / labels / table → default sans (no font overrides).
- Remove any stray `font-mono` decorative labels in CheckoutPage that don't appear elsewhere on the public store (keep one consistent stepper style).

## 4. /profile/drafts UI enhancements

In `CartDraftsSection.tsx`:

- Show per-draft summary: name, note, **total items**, **total amount (BBD)**, created/updated timestamps, status badge (`Draft` / `Restored` / `Expired` if older than 30 days — UI-only).
- Two actions per row: **Restore** (merges items back into cart via `useCart.addToCart` for each item, then routes to `/cart` and toasts count restored) and **Delete** (with confirm).
- Empty state with link back to `/store`.
- Match cart's typography (`font-serif` heading, sans body).
- After Restore, verify cart count updates by invalidating the cart query / calling `refetch()` from context.

## 5. /admin/orders — viewable, approvable, printable

Audit `src/pages/admin/Orders.tsx` (or equivalent) + `useAdminOrders.ts`. Required behavior:

- Each order row clickable → opens **OrderDetailDrawer** (or `/admin/orders/:id`) showing line items, addresses, payment method, totals, status timeline.
- Statuses surfaced: `pending_payment`, `active`, `fulfilled`, `completed`, `cancelled` (use existing `src/domain/statuses.ts` enum).
- **Approve payment** button visible only when status = `pending_payment`; calls existing `approve_pending_payment` RPC with method label (BimPay / Payment Link / Stripe offline / 1stPay) + reference note; moves order to `active`.
- **Mark fulfilled** action on `active` orders → moves to `fulfilled`; **Mark completed** on `fulfilled` → `completed`. Each writes to `order_payment_events` / order audit.
- **Print order** button → opens print-friendly route `/admin/orders/:id/print` (new lightweight component, uses `window.print()`).

## 6. Automated E2E browser tests

Add Playwright scripts under `/tmp/browser/cart-checkout/` (kept out of repo per browser-agent rules) AND a committed Vitest + Testing-Library suite in `src/tests/e2e/cartCheckoutFlow.e2e.test.tsx` covering:

1. Add product to cart from `/store` → cart shows item, totals correct.
2. Cart → "Proceed to Checkout" → checkout renders step 1 with items intact (regression for blink bug).
3. Save draft from cart → draft appears in `/profile/drafts` with correct item count + total.
4. Restore draft → cart repopulated, toast shown, `/cart` route.
5. Delete draft → row removed.
6. Admin: pending order → approve payment → status flips to `active`; view detail; trigger print preview.

Use the pre-minted Supabase session env vars for auth, viewport `1280×1800`, screenshots after every key step under `/tmp/browser/cart-checkout/screenshots/`.

## Files to change

- `src/pages/CheckoutPage.tsx` — loading-aware guard, header offset
- `src/pages/CartPage.tsx` — typography sweep
- `src/components/account/sections/CartDraftsSection.tsx` — totals/status/restore-delete UX
- `src/hooks/useCartDrafts.ts` — expose `restoreDraft` that pushes items into cart and triggers refetch
- `src/pages/admin/Orders.tsx` + new `OrderDetailDrawer.tsx` + `OrdersPrintPage.tsx`
- `src/routes/admin/AdminRoutes.tsx` + `src/config/routeRegistry.ts` — register print route
- `src/tests/e2e/cartCheckoutFlow.e2e.test.tsx` — new committed suite
- `/tmp/browser/cart-checkout/*.py` — runtime verification scripts (not committed)

## Validation

- `npm run lint`
- `npm run test -- --runInBand`
- `npm run build`
- Playwright run against `localhost:8080` with auth session restored; capture screenshots of cart, checkout step 1 with stepper fully visible (no header overlap), drafts list with totals, admin order detail with Approve button, print preview.