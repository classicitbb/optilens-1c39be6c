/**
 * Canonical URL builders for the Product Tunnel.
 *
 * Every admin surface that shows a catalog product (lens/supply/addon) links
 * to the others through this module instead of hand-building paths or
 * stashing state in localStorage — see docs/architecture (Product Tunnel
 * proposal) for the full rationale. `(productType, productId)` is the same
 * pair already used by store_product_variants, store_product_overrides,
 * quote_lines, and get_stock_order_catalog(); this module just makes it the
 * one thing every route knows how to build a link from.
 */

export type ProductType = "lens" | "supply" | "addon";

const encode = (id: string) => encodeURIComponent(id);

/** The Product Hub — the one page every other surface tunnels through. */
export const getProductHubRoute = (productType: ProductType, productId: string) =>
  `/admin/products/${productType}/${encode(productId)}`;

/** Product Catalog list, landed on and highlighting a specific row. */
export const getCatalogEditRoute = (productType: ProductType, productId: string) =>
  `/admin/pricing/catalog?type=${productType}&id=${encode(productId)}`;

/**
 * WSPL pricelist page for this product type, landed on and highlighting the
 * matching row. Addons have no WSPL pricelist surface today (no
 * show_in_ws_pricelist/stk_wspl-equivalent column), so this returns null for
 * addons — callers should hide the pricelist link in that case rather than
 * send staff to a page that can never show the row.
 */
export const getPricelistRoute = (productType: ProductType, productId: string): string | null => {
  if (productType === "lens") return `/admin/pricing/stock-lenses?id=${encode(productId)}`;
  if (productType === "supply") return `/admin/pricing/supplies?id=${encode(productId)}`;
  return null;
};

/** Store variant / SKU manager — the existing, working id-param route. */
export const getStoreSettingsRoute = (productType: ProductType, productId: string) =>
  `/admin/website/store/variants/${productType}/${encode(productId)}`;

/** Website Store list, landed on and opening this row's editor dialog. */
export const getStoreListRoute = (productType: ProductType, productId: string) =>
  `/admin/website/store?product=${productType}:${encode(productId)}`;

/**
 * The live, customer-facing product page. Mirrors getStoreProductRoute() in
 * src/hooks/useStoreProducts.ts (kept separate here because that helper
 * takes a StoreProduct object, not a bare id pair) — same path shape.
 */
export const getStorefrontRoute = (productType: ProductType, productId: string) =>
  `/store/product/${productType}/${encode(productId)}`;

/** Stock Order Builder, flagging one catalog line for staff attention. */
export const getStockOrderBuilderRoute = (productType?: ProductType, productId?: string) =>
  productType && productId
    ? `/admin/website/stock-orders?highlight=${productType}:${encode(productId)}`
    : `/admin/website/stock-orders`;
