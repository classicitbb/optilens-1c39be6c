# Portal Account Access — Context

## What this is

The single seam for resolving which customer accounts a portal login may use,
which account is active, and which account-scoped features are authorized.

## Hard rules

- A login belongs to a person; account data belongs to a customer membership.
- Browser-selected customer IDs are preferences, never authorization.
- Server operations must verify an active membership for user + customer.
- Every account-scoped query key includes the active customer ID.
- Do not restore `profiles.crm_customer_id` as the multi-account authority.

## Key files

- `src/hooks/usePortalIdentity.ts` — compatibility hook and selection state.
- `AccountSwitcher.tsx` — visible active-account selector.
- `supabase/migrations/20260804194006_portal_multi_account_memberships.sql` — schema and authorization functions.
- `supabase/functions/live-data-gateway/index.ts` — server enforcement.
