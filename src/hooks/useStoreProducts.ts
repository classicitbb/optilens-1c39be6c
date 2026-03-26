import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  sell_price: number;
  sell_price_usd: number;
  product_type: "lens" | "supply";
  category: string; // lens type name or supply category
  subcategory: string; // material name or supply unit
  tags: string[];
  image_url: string | null;
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
  cartRef: { product_id: number; product_type: "lens" | "supply" },
) =>
  products.find((product) =>
    product.product_type === cartRef.product_type &&
    getStableStoreProductCartId(product) === cartRef.product_id,
  );

export const useStoreProducts = () => {
  return useQuery<StoreProduct[]>({
    queryKey: ["store-products"],
    queryFn: async () => {
      const [lensRes, supplyRes] = await Promise.all([
        supabase
          .from("lenses")
          .select("id, name, sell_price, show_on_website, notes, lenstype:lenstypes(name), material:materials(name), mftype:mftypes(name)")
          .eq("show_on_website", true)
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("supplies_public" as any)
          .select("id, name, description, sell_price, category, unit, quantity_per_unit, image_url")
          .order("name"),
      ]);

      if (lensRes.error) throw lensRes.error;
      if (supplyRes.error) throw supplyRes.error;

      const { data: pricingSettings } = await supabase
        .from("pricing_settings")
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

      const lenses: StoreProduct[] = (lensRes.data || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        description: l.notes || "Premium prescription lens",
        sell_price: Number(l.sell_price ?? 0),
        sell_price_usd: normalizeUsdPrice(l.sell_price),
        product_type: "lens" as const,
        category: l.lenstype?.name || "Lens",
        subcategory: l.material?.name || "",
        tags: [l.mftype?.name, l.material?.name, l.lenstype?.name].filter(Boolean),
        image_url: null,
        has_variants: false,
      }));

      const supplies: StoreProduct[] = (supplyRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        sell_price: Number(s.sell_price ?? 0),
        sell_price_usd: normalizeUsdPrice(s.sell_price),
        product_type: "supply" as const,
        category: s.category,
        subcategory: `${s.quantity_per_unit} ${s.unit}`,
        tags: [s.category, s.unit],
        image_url: s.image_url || null,
        has_variants: false,
      }));

      return [...lenses, ...supplies];
    },
  });
};
