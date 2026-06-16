## Plan

Three problems to address. All three live in the storefront/admin frontend; no changes to pricing/catalog backend logic.

### 1. `/admin/website/portals` reload loop

`WebsitePortalsPage.tsx` has unstable effect dependencies that keep firing renders/refetches:

- Line 222: `const selectedCustomer = customers.find(...)` — a fresh object reference every render.
- Line 443 effect depends on `selectedCustomer`, so it calls `refetchAddresses()` / `refetchPaymentMethods()` on every render. Those refetches update hook state, which re-renders, which re-runs the effect. This is the loop the user sees (and matches the repeated analytics pageview pings every ~6 s in console logs).
- Line 213 effect also re-runs frequently because `customers` is rebuilt by `useMemo` only when search/data change, but the inline `setSelectedUserId` call goes through `setSearchParams` which can churn even when the value is unchanged.

Fix:

- Depend on `selectedCustomer?.userId` (a stable string) instead of the object in the address/payments refetch effect.
- In the auto-select effect, only call `setSearchParams` when the new value actually differs from the current `?customer=` param.
- Guard the second branch ("selectedUserId no longer in list") so it does not run while `customersQuery.isLoading` is true (avoids clearing during a transient empty list).

### 2. Shopping cart + checkout: fix and verify

Scope is the existing flow — no business-logic changes. Concrete fixes:

- `CartPage.tsx`: the "Save draft" button is a no-op (line 73). Wire it to the new draft save flow from item 3 below, with toast feedback and disabled state when the cart is empty.
- `CheckoutPage.tsx`: verify the top padding fix from the prior turn is intact, and confirm the order-success flow does not redirect back to `/cart` prematurely (memory note on `orderPlaced` state).
- Test the round-trip end to end with Playwright against `localhost:8080`:
  1. Sign in as the pre-minted preview user.
  2. Add an item to cart from `/store`.
  3. Visit `/cart`, verify totals + Save draft works.
  4. Proceed to `/checkout`, walk through the 4 steps (Contact → Shipping → Payment → Review).
  5. Place an on-account order, confirm success view renders and cart clears.
  6. Capture screenshots at each step; report any errors observed in console/network.

### 3. Save Draft + drafts management

Add a real draft mechanism for the customer-facing cart so a shopper can stash a cart and come back.

**Data model** — new table `public.cart_drafts`:

```text
id              uuid (pk)
user_id         uuid (auth.users) NOT NULL
name            text (user-supplied label, default "Draft <timestamp>")
note            text
items           jsonb  -- snapshot: [{ product_id, product_type, product_name, product_price, quantity, options, ... }]
total_items     int
total_amount    numeric
created_at      timestamptz
updated_at      timestamptz
```

- RLS: owner-only (`auth.uid() = user_id`) for select/insert/update/delete.
- `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated`; `GRANT ALL ... TO service_role`. No anon grant.
- `updated_at` trigger using existing `public.update_updated_at_column()` helper.

**Frontend**:

- `src/hooks/useCartDrafts.ts` — list / create / rename / delete / restore via TanStack Query.
- `CartPage.tsx`: Save draft button opens a small dialog (label + note), calls `createDraft({ items, name, note })`, then offers to clear the live cart. Disabled when cart empty.
- New page `src/pages/CartDraftsPage.tsx` at route `/profile/drafts` (customer portal area, behind auth):
  - List drafts (name, item count, total, updated_at).
  - Restore → merges items back into live cart and navigates to `/cart`.
  - Rename inline; Delete with confirm.
- Add a link to "Saved drafts" from `CartPage` header and from the portal sidebar.
- Register the route in `src/routes/portal/PortalRoutes.tsx` and `src/config/routeRegistry.ts` per the routing-governance rules.

**Validation**:

- After migration approval, run lint + build.
- Playwright: save a draft → reload → visit `/profile/drafts` → restore → confirm cart repopulated.

### Out of scope

- Admin-side draft management (drafts are user-owned; admins can already see live carts in Portals).
- Any pricing engine, catalog, or wiki changes.
- Refactor of `CheckoutPage` beyond the targeted fixes.

### Files touched

- `src/pages/admin/WebsitePortalsPage.tsx` (effect deps)
- `src/pages/CartPage.tsx` (Save draft wiring + link)
- New: `src/hooks/useCartDrafts.ts`, `src/pages/CartDraftsPage.tsx`, `src/components/cart/SaveDraftDialog.tsx`
- `src/routes/portal/PortalRoutes.tsx`, `src/config/routeRegistry.ts`
- One Supabase migration creating `cart_drafts` with grants, RLS, and trigger.  
  
Also review the sales/orders module as it is showing an auth error, like i am not able to access it. 