import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  sell_price: number;
  product_type: "lens" | "supply";
  category: string; // lens type name or supply category
  subcategory: string; // material name or supply unit
  tags: string[];
}

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

      const lenses: StoreProduct[] = (lensRes.data || []).map((l: any) => ({
        id: l.id,
        name: l.name,
        description: l.notes || "Premium prescription lens",
        sell_price: l.sell_price,
        product_type: "lens" as const,
        category: l.lenstype?.name || "Lens",
        subcategory: l.material?.name || "",
        tags: [l.mftype?.name, l.material?.name, l.lenstype?.name].filter(Boolean),
      }));

      const supplies: StoreProduct[] = (supplyRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description || "",
        sell_price: s.sell_price,
        product_type: "supply" as const,
        category: s.category,
        subcategory: `${s.quantity_per_unit} ${s.unit}`,
        tags: [s.category, s.unit],
      }));

      return [...lenses, ...supplies];
    },
  });
};
