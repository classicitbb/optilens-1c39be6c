# One price per lens, per price list version — everywhere it can be edited

## The rule being enforced

A stock lens has exactly one price inside a given price list version. The Stock Order SKUs tab and the
WSPL Stock List tab are two windows onto that same number:

- A price set on the WSPL Stock List shows up in Stock Order SKUs for the linked family.
- A price edited in Stock Order SKUs changes the WSPL Stock List price.
- Neither surface ever holds a private copy, and edits never cross between versions.

## Where it already works

Both tabs write and read the same row (one row per lens, per version), so a saved price does appear on
the other tab. The linking of a family to its website lens, the save, the clear, and the flow through
to the store / Rx form / stock order form / staff ordering are in place.

## What still breaks the rule

The WSPL Stock List tab keeps its own working copy of every row in memory, filled once from the
database. Two problems follow:

1. **Stale overwrite.** If the list tab was opened before a price was changed on the SKU tab, pressing
   "Save all changes" writes the older number back over the newer one.
2. **Lost typing.** When a price is saved on the SKU tab, the list tab reloads itself from the database
   and silently discards anything the user was mid-way through typing there.

## Plan

1. **Keep the list tab in step with the database.** Refill its working copy from freshly saved data only
   for rows the user has not touched, instead of wholesale resetting or wholesale ignoring. Rows being
   edited keep the user's typing; every other row picks up the newest saved price immediately.

2. **Save only what changed.** On "Save all changes", compare against the latest saved data and write
   just the rows that actually differ, so untouched rows can never be pushed back to an older value by
   another tab's edit.

3. **Show the price live on the SKU tab.** Any price change made on the list tab refreshes the SKU tab's
   figure and the "x of y priced" count without needing a page reload.

4. **Verify end to end in the browser, on one version.** Set a price on the SKU tab, confirm the same
   figure on the WSPL Stock List; change it on the list tab, confirm the SKU tab updates; edit on both
   tabs at once and confirm neither loses the other's change; confirm a second price list version is
   untouched throughout. Remove any test prices afterwards.

## Technical notes

- `ListCatalogTab.tsx`: the `useEffect` at ~line 184 rebuilds `lensRows`/`addonRows`/`supplyRows` from
  `savedRows` unconditionally. Replace with a merge keyed on `row_key` that preserves entries whose
  local value differs from the last-seen server value (track a `lastServerRowsRef`), so a React Query
  invalidation from `usePricelistCatalogRowUpsert` no longer discards in-flight edits.
- `saveRows` in `usePricelistCatalogRows.ts` currently upserts every managed row. Diff against the
  current query cache and upsert only changed rows; leave the stale-key deletion logic as is, since
  both tabs use the same `lens-<uuid>` key so a family price is never treated as stale.
- Both tabs already share the query key `["pricelist-catalog-rows", versionId, "stock"]`, so live
  cross-tab refresh needs no extra wiring once the reset effect stops clobbering.
- No schema change; `resolve_customer_price` and the family-to-lens map stay as built.
- Website pricing stays catalog-authoritative — nothing here changes the "Use Pricelist as Website
  Pricing Source" opt-in.
