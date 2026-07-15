# BS1-01 · Pricing tables audit & target schema doc

**Build sequence 1 · blocker for all other BS1 issues**

## Context
CV Web already carries partial pricing structures from earlier phases:
`price_matrix`, `pricelist_versions`, `pricelist_overrides`, `pricelist_catalog_rows`,
`rx_price_groupings` / `rx_price_categories` (+ `*_versions`), `price_catalog` (CRM-side),
`suppliers`, `matrix_allocations`, and the `product_cost` RPC + audit (20260713 migration).
The master→custom fork model (CUSTOMER_EXPERIENCE_PLAN.md) needs to be mapped ONTO or replace these.

## Task
1. Document every existing pricing-related table: columns, row counts, which UI reads/writes it.
2. Decide per table: keep / extend / deprecate. Specifically resolve:
   - Is `pricelist_versions` the lineage mechanism for the MASTER, or is a new `pricelists` table needed?
   - Do `pricelist_overrides` become the per-customer fork line-items, or are they version-scoped edits?
   - Relationship between `price_matrix`, `pricelist_catalog_rows`, and the unified variant engine (20260331).
3. Produce `docs/PRICING_SCHEMA.md` with the target ERD (mermaid) covering: master, forks, supplier costs, exclusions, proposals, variance.

## Acceptance
- `docs/PRICING_SCHEMA.md` merged; every BS1 issue below references its entity names.
- No table is created in later issues that isn't in this doc.
