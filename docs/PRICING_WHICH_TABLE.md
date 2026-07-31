# Which pricing table do I actually use?

Quick reference, written 2026-07-31 after this exact confusion cost a full session. There are
**four** pricing-related schemas in this codebase. Only one of them is real. Check the live admin
UI (`admin.classicvisions.net/admin/pricing/rx-lenses`), not the docs, if this file is ever in
doubt — the docs have been wrong before.

## The one that's real: `pricelist_versions`

**Use this.** Live, actively maintained, drives the actual customer-facing prices today.

- Admin UI: OpticAdmin → Pricing → RX Lens Prices (`/admin/pricing/rx-lenses`).
- A customer's price document: `customers.assigned_pricelist_id → pricelist_versions.id`.
- Lens prices within a document: `matrix_allocations` (resolves a category × material × treatment
  cell to a concrete `lens_id` + BBD price) and `price_matrix` (the underlying flat grid).
- Add-ons/extras within a document: `pricelist_catalog_rows` + `pricelist_overrides`, rendered as
  the "Add-ons & Extras" section at the bottom of the Price List Editor tab, scoped to one
  `pricelist_versions.id` at a time via `versionId`.
- Real documents that exist today: "Classic Visions July 2026 Current Prices" (the default for
  every customer), "Retail Price List Barbados" (the one exception — customer #776 "Retail",
  account number `RETAIL`), "New Standard Prices", "ZENVUE Rx and Stock Pricelist".
- Availability rule: if an item has no line/allocation on the assigned document, it's unavailable —
  not shown at a fallback price. Confirmed live: "Specific Use – Bifocal" shows 0 items on Retail
  Price List Barbados, and its Add-ons & Extras section is empty.

## The one that's write-only (looks alive, isn't): `pricing_sheets`

Built Feb 2026, predates the BS1 pricing audit by 5 months — which is why `PRICING_SCHEMA.md`
never mentions it.

- `pricing_sheets` — named tabs ("e.g. Retail Price List" is literally the UI's placeholder text,
  which is confusing since a real, unrelated "Retail Price List Barbados" also exists over in
  `pricelist_versions`).
- `addon_pricing_sheets` — per (addon, sheet) price override. **Written** from the Add-On edit
  dialog in both Product Catalog (`ProductCatalogPage.tsx`) and Website Store
  (`WebsiteStorePage.tsx`). **Never read** by anything that computes an actual price — no order
  flow, cart, or portal display consumes it.
- `customer_pricing_access` — assigns a portal user (by `user_id`) to a pricing sheet, via
  `CustomerPricingPanel.tsx`. Same story: assignable, never read anywhere.
- **If you're a staff member reading this because you just set a price override here and it's not
  showing up anywhere: that's why.** This isn't a bug you're missing — the read side was never
  built. Use `pricelist_versions`'s own Add-ons & Extras section instead.
- Recommended fate: either wire it up for real (decide whether it's meant to replace or feed
  `pricelist_versions`'s Add-ons & Extras) or remove the write UI so it stops collecting data
  nobody uses. Not decided as of 2026-07-31 — flag to the business owner before touching.

## The one that was never built: `pricelists` / `pricelist_lines` / `effective_price()`

The "master + per-customer fork" model designed in `docs/PRICING_SCHEMA.md` and referenced in
`docs/CUSTOMER_EXPERIENCE_PLAN.md`. Migration `20260715160000_pricelists_master_fork_model.sql`
created the tables and the `effective_price(customer_id, item_ref)` function. As of 2026-07-31:
zero rows in `pricelists`/`pricelist_lines` beyond the auto-seeded empty master row, and zero
`src/` files call `effective_price()`, `set_master_price()`, or `set_custom_price()`. This is
pure unused scaffolding — `pricelist_versions` already solves the same problem and is what's
actually live. Do not build new pricing features against this model unless a deliberate decision
is made to migrate onto it (not done as of this writing).

## The other other one: `price_catalog`

A denormalized publisher snapshot for the public site (`web_enabled`/`wspl_enabled` flags, fed
from `lenses`/`supplies`/`addons`). Unrelated to customer-specific pricing — it's a public-facing
mirror, not a pricing-resolution mechanism. Leave it alone unless you're specifically working on
public catalog publishing.

## TL;DR for anyone (human or agent) about to write pricing code

1. Reading or setting what a specific customer pays → `assigned_pricelist_id` → `pricelist_versions`
   → `matrix_allocations`/`price_matrix` (lenses) or `pricelist_catalog_rows`/`pricelist_overrides`
   (add-ons). This is the only path that's actually connected end to end.
2. Don't touch `effective_price()` / `pricelists` / `pricelist_lines` — not wired to anything.
3. Don't touch `addon_pricing_sheets` / `customer_pricing_access` expecting it to affect a real
   price — it doesn't, yet.
4. When in doubt, log into `admin.classicvisions.net/admin/pricing/rx-lenses` and look. The UI is
   ground truth; the docs have drifted from it before.
