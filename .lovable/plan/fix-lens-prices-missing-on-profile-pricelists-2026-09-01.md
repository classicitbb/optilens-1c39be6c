# Fix: lens prices missing on /profile/pricelists

## What's happening

The Pricelists tab renders two different kinds of data:

- Add-ons, extras, stock and supplies — read through secure server functions that are allowed to run for portal customers. These work.
- RX lens prices — need two things: the price values, and the lens grouping/category layout (the row and column labels of the grid).

The price values come through a secure server function and are fine. The layout is read straight from four database tables (`rx_price_groupings`, `rx_price_categories`, and their per-pricelist version rows). Those tables only allow reads for internal staff accounts, and have no read permission granted to portal customers at all. So for a customer, the layout comes back empty.

The page only renders a lens grouping when its layout entry exists, so with an empty layout every lens table is filtered out — leaving only add-ons and extras. Staff accounts see the lens grid correctly, which is why this looks fine internally.

## The fix

Add a read-only server function that returns just the lens grid layout for the customer's own assigned pricelist, and have the portal page use it instead of reading the tables directly.

1. New security-definer function `portal_rx_pricing_structure(p_customer_id)`:
   - Resolves the caller's assigned pricelist the same way the existing portal pricing functions do (same account-scoping check, so a customer can only get their own).
   - Returns active groupings and categories with their key, display name and sort order, applying the per-version enable/rename overrides.
   - Returns names and ordering only — no costs, no margins.
   - Executable by `authenticated` only; no new table grants, table RLS stays as-is.
2. Portal page (`AssignedPricelistsSection`) calls the new function for its layout rather than `useRxPricingStructure`, which stays untouched for admin screens.
3. Verify against a real portal customer that lens groupings render with the same prices the admin RX Lens Prices screen shows, and that the CSV export includes lens rows again.

## Technical notes

- Files: new migration under `supabase/migrations/`, new hook (e.g. `usePortalRxPricingStructure`), and `src/components/account/sections/AssignedPricelistsSection.tsx`.
- Grouping/category `key` values must match the keys used by `portal_assigned_pricelist_matrix` rows (`treatment_type::category::material_index`), otherwise the grid stays empty.
- Material columns continue to come from the client-side `MATERIAL_COLUMNS` constant; only groupings/categories move to the server function.
- No change to lab-pricing gating, currency conversion, or the add-on sections.
