# Unified Store Variant Engine (Production Plan)

## Current-state findings

- Catalog products are split across `lenses`, `supplies`, and `addons`, with website controls in `store_product_overrides` and `store_product_media`.
- Cart/order schemas were product-centric (`product_id`, `product_type`) without first-class variant records.
- Checkout already supports manual review via `place_customer_order` and pending/confirmed states.
- `/admin/website/store` is the management surface for website catalog exposure.

## Final architecture

1. **One core variant engine** across product types.
2. **Variant modes** attached per product via `store_product_variant_settings.variant_mode`:
   - `none`
   - `lens_grid`
   - `standard_options`
   - `service_config`
   - `generic_matrix`
3. **Concrete sellable variant rows** in `store_product_variants` with SKU/OPC/price/stock/status metadata.
4. **Lens grid UI** reads concrete variants (sphere/cylinder now, extensible JSON attributes for axis/add/diameter/etc.) with configurable power-axis labels (Sphere/Cylinder or Base/Add).
5. **Chiral pair handling** supports progressive/bifocal pair semantics: one grid quantity is one pair, and cart insertion splits into Left/Right lines with eye-specific OPC snapshots.
6. **Batch cart insertion RPC** adds each selected lens cell as independent fulfillable cart lines.
7. **Audit logging** for variant create/update in `store_variant_audit_logs`.

## Schema changes

- Added `store_product_variant_settings`
- Added `store_product_variants`
- Added `store_variant_audit_logs`
- Added `store_product_variant_summary` view
- Extended `cart_items` and `order_items` with variant snapshot fields
- Added deterministic cart uniqueness by `(user_id, product_type, product_id, variant_id|null)`
- Added `add_variant_items_to_cart(jsonb, uuid)` RPC for batch variant cart insertion

## API and state changes

- New frontend hooks:
  - `useProductVariants`
  - `useProductVariantSettings`
  - `useSaveProductVariantSettings`
  - `useUpsertProductVariants`
  - `useBulkAddVariantsToCart`
- Store product loading now includes variant summary and `addon` products for services.
- Cart item shape now includes variant snapshot metadata.

## Admin UX changes

- Added `/admin/website/store/variants/:productType/:productId` full-page variant manager.
- Includes mode selector, SKU template field, CSV template download, and CSV paste import for lenses.
- Added quick “Variants” action in `/admin/website/store` list rows.

## Storefront UX changes

- Product route now supports `addon` products.
- Lens products with variants render a professional matrix grid (sticky row/column headers, low stock/unavailable states, clear/add-selected actions).
- Each selected grid cell becomes a cart line via RPC.

## Migration and rollout

1. Deploy schema migration.
2. Backfill variant settings/variants per product group (optional script).
3. Enable admin variant management for internal users.
4. Roll out storefront lens-grid products progressively.
5. Monitor audit logs + cart conversion metrics.

## Risks and mitigations

- **Risk:** existing `place_customer_order` function may not yet persist variant snapshot fields from payload.
  - **Mitigation:** follow-up migration to fully map new variant cart snapshot fields into `order_items` insert path.
- **Risk:** CSV parser in first release is strict/simple.
  - **Mitigation:** add preview grid + row-level in-place corrections + downloadable error report in next iteration.
- **Risk:** very large variant matrices can stress browser rendering.
  - **Mitigation:** add virtualization/windowing in phase 2.

## Assumptions

- Existing auth helper `public.is_admin_user` remains the canonical admin authorization predicate.
- Product UUIDs are stable IDs across `lenses`, `supplies`, `addons`.
- Pricing in storefront remains USD display while source price stores as canonical numeric.
