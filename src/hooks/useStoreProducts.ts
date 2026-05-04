import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreProduct {
  id: string;
  name: string;
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

  return Math.abs(hash >>> 0);
};

export const resolveStoreProductFromCartRef = (
  products: StoreProduct[],
  cartRef: { product_id: number; product_type: "lens" | "supply" | "addon" },
) =>
  products.find((product) =>
    product.product_type === cartRef.product_type &&
    getStableStoreProductCartId(product) === cartRef.product_id,
  );

export const useStoreProducts = () => {
  return useQuery<StoreProduct[]>({
    queryKey: ["store-products"],
    queryFn: async () => {
      const [lensRes, supplyRes, addonRes, mediaRes, overrideRes, variantSummaryRes] = await Promise.all([
        (supabase as any).from("lenses_public")
          .select("id, name, sell_price, notes, lenstype:lenstypes(name), material:materials(name), mftype:mftypes(name)")
          .order("name"),
        (supabase.from("supplies_public") as any)
          .select("id, name, description, sell_price, category, unit, quantity_per_unit, image_url")
          .order("name"),
        (supabase as any).from("addons_public")
          .select("id, name, description, category, price")
          .order("name"),
        (supabase.from("store_product_media") as any)
          .select("product_type, product_id, image_url, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order"),
        (supabase.from("store_product_overrides") as any)
          .select("product_type, product_id, quantity_label, is_vat_taxable, website_badges"),
        (supabase.from("store_product_variant_summary") as any)
          .select("product_type, product_id, active_variants"),
      ]);

      if (lensRes.error) throw lensRes.error;
      if (supplyRes.error) throw supplyRes.error;
      if (addonRes.error) throw addonRes.error;
      // Non-fatal to support incremental rollout before SQL migration is applied.
      const mediaRows = Array.isArray(mediaRes.data) ? mediaRes.data as any[] : [];
      const overrideRows = Array.isArray(overrideRes.data) ? overrideRes.data as any[] : [];

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

      for (const row of ((variantSummaryRes.data ?? []) as any[])) {
        variantSummaryMap.set(`${row.product_type}:${row.product_id}`, Number(row.active_variants ?? 0));
      }

      const lenses: StoreProduct[] = (lensRes.data || []).map((l: any) => ({
        ...(overrideMap.get(`lens:${l.id}`) ?? {}),
        id: l.id,
        name: l.name,
        description: l.notes || "Premium prescription lens",
        quantity_label: overrideMap.get(`lens:${l.id}`)?.quantity_label || "pair",
        sell_price: Number(l.sell_price ?? 0),
        sell_price_usd: normalizeUsdPrice(l.sell_price),
        is_vat_taxable: Boolean(overrideMap.get(`lens:${l.id}`)?.is_vat_taxable),
        product_type: "lens" as const,
        category: l.lenstype?.name || "Lens",
        subcategory: l.material?.name || "",
        tags: [l.mftype?.name, l.material?.name, l.lenstype?.name, ...(overrideMap.get(`lens:${l.id}`)?.website_badges ?? [])].filter(Boolean),
        image_url: (mediaMap.get(`lens:${l.id}`) ?? [])[0] || null,
        image_urls: mediaMap.get(`lens:${l.id}`) ?? [],
        has_variants: (variantSummaryMap.get(`lens:${l.id}`) ?? 0) > 0,
      }));

      const supplies: StoreProduct[] = (supplyRes.data || []).map((s: any) => ({
        ...(overrideMap.get(`supply:${s.id}`) ?? {}),
        id: s.id,
        name: s.name,
        description: s.description || "",
        quantity_label: overrideMap.get(`supply:${s.id}`)?.quantity_label || `${s.quantity_per_unit} ${s.unit}`.trim(),
        sell_price: Number(s.sell_price ?? 0),
        sell_price_usd: normalizeUsdPrice(s.sell_price),
        is_vat_taxable: Boolean(overrideMap.get(`supply:${s.id}`)?.is_vat_taxable),
        product_type: "supply" as const,
        category: s.category,
        subcategory: `${s.quantity_per_unit} ${s.unit}`,
        tags: [s.category, s.unit, ...(overrideMap.get(`supply:${s.id}`)?.website_badges ?? [])].filter(Boolean),
        image_url: (mediaMap.get(`supply:${s.id}`) ?? [])[0] || s.image_url || null,
        image_urls: (mediaMap.get(`supply:${s.id}`) ?? []).length > 0 ? (mediaMap.get(`supply:${s.id}`) ?? []) : (s.image_url ? [s.image_url] : []),
        has_variants: (variantSummaryMap.get(`supply:${s.id}`) ?? 0) > 0,
      }));


      const addons: StoreProduct[] = (addonRes.data || []).map((a: any) => ({
        ...(overrideMap.get(`addon:${a.id}`) ?? {}),
        id: a.id,
        name: a.name,
        description: a.description || "",
        quantity_label: overrideMap.get(`addon:${a.id}`)?.quantity_label || "service",
        sell_price: Number(a.price ?? 0),
        sell_price_usd: normalizeUsdPrice(a.price),
        is_vat_taxable: Boolean(overrideMap.get(`addon:${a.id}`)?.is_vat_taxable),
        product_type: "addon" as const,
        category: a.category || "Service",
        subcategory: "service",
        tags: [a.category, ...(overrideMap.get(`addon:${a.id}`)?.website_badges ?? [])].filter(Boolean),
        image_url: (mediaMap.get(`addon:${a.id}`) ?? [])[0] || null,
        image_urls: mediaMap.get(`addon:${a.id}`) ?? [],
        has_variants: (variantSummaryMap.get(`addon:${a.id}`) ?? 0) > 0,
      }));

      return [...lenses, ...supplies, ...addons];
    },
  });
};
