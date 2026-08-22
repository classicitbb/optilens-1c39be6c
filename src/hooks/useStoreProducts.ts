import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreProduct {
  id: string;
  name: string;
  /** Imported Innovations item code. Lenses use variant OPC/SKU codes instead. */
  sku: string | null;
  description: string;
  quantity_label: string;
  sell_price: number;
  sell_price_usd: number;
  is_vat_taxable: boolean;
  product_type: "lens" | "supply" | "addon";
  category: string; // lens type name or supply category
  subcategory: string; // material name or supply unit
  tags: string[];
  image_url: string | null;
  image_urls: string[];
  has_variants: boolean;
}

export const getStoreProductRoute = (product: Pick<StoreProduct, "id" | "product_type">) =>
  `/store/product/${product.product_type}/${product.id}`;

export const getStableStoreProductCartId = (product: Pick<StoreProduct, "id" | "product_type">) => {
  let hash = 2166136261;
  const input = `${product.product_type}:${product.id}`;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  // cart_items.product_id is a Postgres int4 (max 2147483647). `hash >>> 0`
  // yields a full unsigned 32-bit value (up to 4294967295), which overflows
  // int4 for roughly half of all inputs and causes the insert to fail
  // silently for those products. Fold into the positive int4 range instead.
  return (hash >>> 0) % 2147483647;
};

export const resolveStoreProductFromCartRef = (
  products: StoreProduct[],
  cartRef: { product_id: number; product_type: "lens" | "supply" | "addon" },
) =>
  products.find((product) =>
    product.product_type === cartRef.product_type &&
    getStableStoreProductCartId(product) === cartRef.product_id,
  );

const missingRelationCodes = new Set(["PGRST205", "42P01"]);

const isMissingRelationError = (error: any) =>
  error && (
    missingRelationCodes.has(error.code) ||
    String(error.message ?? "").toLowerCase().includes("could not find the table")
  );

const readRows = <T,>(response: { data: T[] | null; error: any }, options?: { optional?: boolean }) => {
  if (response.error) {
    if (options?.optional && isMissingRelationError(response.error)) return [] as T[];
    throw response.error;
  }

  return Array.isArray(response.data) ? response.data : [];
};

// PostgREST caps RPC responses at 1000 rows by default. Staff sessions get every
// row back from these RPCs (not just website-published ones), and the lens table
// alone holds 1000+ rows — without paging, catalogs past row 1000 silently vanish
// from the storefront lookup ("Product unavailable" for a real, published lens).
const SAFE_RPC_PAGE_SIZE = 1000;

const fetchAllSafeRows = async (fnName: "get_lenses_safe" | "get_supplies_safe" | "get_addons_safe") => {
  const rows: any[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await (supabase.rpc as any)(fnName).range(offset, offset + SAFE_RPC_PAGE_SIZE - 1);
    if (error) return { data: null, error };

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < SAFE_RPC_PAGE_SIZE) break;
    offset += SAFE_RPC_PAGE_SIZE;
  }

  return { data: rows, error: null };
};

export const fetchStoreProducts = async (): Promise<StoreProduct[]> => {
  const [lensRes, supplyRes, addonRes, mediaRes, overrideRes, variantSummaryRes] = await Promise.all([
    fetchAllSafeRows("get_lenses_safe"),
    fetchAllSafeRows("get_supplies_safe"),
    fetchAllSafeRows("get_addons_safe"),
    (supabase.from("store_product_media") as any)
      .select("product_type, product_id, image_url, sort_order, is_active")
      .eq("is_active", true)
      .order("sort_order"),
    (supabase.from("store_product_overrides") as any)
      .select("product_type, product_id, quantity_label, is_vat_taxable, website_badges, is_published"),
    (supabase.from("store_product_variant_summary") as any)
      .select("product_type, product_id, active_variants"),
  ]);

  // The public store lists only items explicitly published via the admin
  // Website Store toggle. The override is intentionally separate from the
  // source catalog's show_on_website property.
  const mediaRows = readRows<any>(mediaRes, { optional: true });
  const overrideRows = readRows<any>(overrideRes, { optional: true });
  const variantSummaryRows = readRows<any>(variantSummaryRes, { optional: true });
  const published = (row: any) => {
    const override = overrideRows.find((item: any) => item.product_type === row.__product_type && item.product_id === row.id);
    return override?.is_published ?? row.show_on_website === true;
  };

  const { data: pricingSettings } = await (supabase.from("pricing_settings") as any)
    .select("fx_rates, fx_risk_buffer")
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fxRates = (pricingSettings?.fx_rates ?? {}) as Record<string, number>;
  const usdFxRate = (fxRates.USD ?? 1) * (1 + (pricingSettings?.fx_risk_buffer ?? 0));
  const normalizeUsdPrice = (price: number | null | undefined) => {
    const numericPrice = Number(price ?? 0);
    return usdFxRate > 0 ? numericPrice / usdFxRate : numericPrice;
  };

  const mediaMap = new Map<string, string[]>();
  for (const row of mediaRows) {
    const key = `${row.product_type}:${row.product_id}`;
    const images = mediaMap.get(key) ?? [];
    if (row.image_url) images.push(row.image_url);
    mediaMap.set(key, images);
  }

  const overrideMap = new Map<string, any>();
  const variantSummaryMap = new Map<string, number>();
  for (const row of overrideRows) {
    const key = `${row.product_type}:${row.product_id}`;
    overrideMap.set(key, row);
  }

  for (const row of variantSummaryRows) {
    variantSummaryMap.set(`${row.product_type}:${row.product_id}`, Number(row.active_variants ?? 0));
  }

  const lensRows = readRows<any>(lensRes, { optional: true }).map((row: any) => ({ ...row, __product_type: "lens" })).filter(published);
  const supplyRows = readRows<any>(supplyRes, { optional: true }).map((row: any) => ({ ...row, __product_type: "supply" })).filter(published);
  const addonRows = readRows<any>(addonRes, { optional: true }).map((row: any) => ({ ...row, __product_type: "addon" })).filter(published);

  const lenses: StoreProduct[] = lensRows.map((l: any) => ({
    ...(overrideMap.get(`lens:${l.id}`) ?? {}),
    id: l.id,
    name: l.name,
    sku: null,
    description: l.notes || "Premium prescription lens",
    quantity_label: overrideMap.get(`lens:${l.id}`)?.quantity_label || "pair",
    sell_price: Number(l.sell_price ?? 0),
    sell_price_usd: normalizeUsdPrice(l.sell_price),
    is_vat_taxable: Boolean(overrideMap.get(`lens:${l.id}`)?.is_vat_taxable),
    product_type: "lens" as const,
    category: "Lens",
    subcategory: "",
    tags: [...new Set((overrideMap.get(`lens:${l.id}`)?.website_badges ?? []) as string[])].filter(Boolean),
    image_url: (mediaMap.get(`lens:${l.id}`) ?? [])[0] || null,
    image_urls: mediaMap.get(`lens:${l.id}`) ?? [],
    has_variants: (variantSummaryMap.get(`lens:${l.id}`) ?? 0) > 0,
  }));

  const supplies: StoreProduct[] = supplyRows.map((s: any) => ({
    ...(overrideMap.get(`supply:${s.id}`) ?? {}),
    id: s.id,
    name: s.name,
    sku: s.sku ?? null,
    description: s.description || "",
    quantity_label: overrideMap.get(`supply:${s.id}`)?.quantity_label || `${s.quantity_per_unit} ${s.unit}`.trim(),
    sell_price: Number(s.sell_price ?? 0),
    sell_price_usd: normalizeUsdPrice(s.sell_price),
    is_vat_taxable: Boolean(overrideMap.get(`supply:${s.id}`)?.is_vat_taxable),
    product_type: "supply" as const,
    category: s.category,
    subcategory: `${s.quantity_per_unit} ${s.unit}`,
    tags: [...new Set([s.category, s.unit, ...(overrideMap.get(`supply:${s.id}`)?.website_badges ?? [])] as string[])].filter(Boolean),
    image_url: (mediaMap.get(`supply:${s.id}`) ?? [])[0] || s.image_url || null,
    image_urls: (mediaMap.get(`supply:${s.id}`) ?? []).length > 0 ? (mediaMap.get(`supply:${s.id}`) ?? []) : (s.image_url ? [s.image_url] : []),
    has_variants: (variantSummaryMap.get(`supply:${s.id}`) ?? 0) > 0,
  }));

  const addons: StoreProduct[] = addonRows.map((a: any) => ({
    ...(overrideMap.get(`addon:${a.id}`) ?? {}),
    id: a.id,
    name: a.name,
    sku: a.sku ?? null,
    description: a.description || "",
    quantity_label: overrideMap.get(`addon:${a.id}`)?.quantity_label || "service",
    sell_price: Number(a.price ?? 0),
    sell_price_usd: normalizeUsdPrice(a.price),
    is_vat_taxable: Boolean(overrideMap.get(`addon:${a.id}`)?.is_vat_taxable),
    product_type: "addon" as const,
    category: a.category || "Service",
    subcategory: "service",
    tags: [...new Set([a.category, ...(overrideMap.get(`addon:${a.id}`)?.website_badges ?? [])] as string[])].filter(Boolean),
    image_url: (mediaMap.get(`addon:${a.id}`) ?? [])[0] || null,
    image_urls: mediaMap.get(`addon:${a.id}`) ?? [],
    has_variants: (variantSummaryMap.get(`addon:${a.id}`) ?? 0) > 0,
  }));

  return [...lenses, ...supplies, ...addons];
};

export const useStoreProducts = () => {
  return useQuery<StoreProduct[]>({
    queryKey: ["store-products"],
    queryFn: fetchStoreProducts,
  });
};
