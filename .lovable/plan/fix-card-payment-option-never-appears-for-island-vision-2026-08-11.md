# Fix: card payment option never appears for Island Vision

## What I confirmed

- Island Vision Inc. (account IVO) does have `pay_by_card = true` on its customer record.
- The portal user (drdebrawilliams2020@gmail.com) is correctly linked to that customer, is `approved_customer`, and passes the statement-access tag check.
- The portal reads card/bank settings from the database view `customer_payment_profile_public`. That view was set to run with the **caller's** permissions, and the underlying customer table only allows **staff** to read rows. So for a logged-in customer the view returns nothing.

Result: the portal sees "no payment profile", which turns the Card button off, hides the bank institution, and drops the account number from the transfer instructions — regardless of the flags actually set on the account.

## The fix

1. Replace the direct view read with a small server-side function that runs with elevated rights but still enforces the exact same access rules already in place (must be the linked customer, must have statements access). It returns only the safe fields: account number, name, pay-by-card flag, pay-by-eft flag, bank institution name, default payment type — no cost or credit data.
2. Point the statements screen at that function instead of the view.
3. Also resolve the customer from the **active** account when the account switcher is in use, so a user with access to more than one account gets the right card/bank settings after switching.
4. Add a regression test that a customer user can read their own payment profile and cannot read another customer's.

## Separately noted (not part of this fix)

The `$0.00` balance in that dialog comes from live billing returning no balance for the account — a live-data-gateway/ERP-connection issue, not the card flag. Tell me if you want that chased in the same pass.

## Technical detail

- New security-definer function `public.get_customer_payment_profile(p_customer_id int default null)` in the public schema, `SET search_path = public`, granted to `authenticated` only, reusing `can_access_customer_portal_feature(auth.uid(), 'statements')` plus a membership/profile ownership check (`portal_account_memberships` for the switcher case).
- `src/components/account/sections/StatementsSection.tsx`: `paymentProfileQuery` switches from `.from("customer_payment_profile_public")` to `supabase.rpc("get_customer_payment_profile", ...)`; no UI/layout changes.
- Keep the existing view in place (used elsewhere/by staff) but stop relying on it from the customer portal.
