import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StoreProductType = "lens" | "supply" | "addon";
export type VariantMode = "none" | "lens_grid" | "standard_options" | "service_config" | "generic_matrix";

export interface ProductVariant {
  id: string;
  product_type: StoreProductType;
  product_id: string;
  title: string;
  variant_key: string;
  sku: string | null;
  opc_code: string | null;
  attributes: Record<string, string | number | boolean | null>;
  metadata: Record<string, unknown>;
  price: number;
  stock_qty: number;
  reserved_qty: number;
  low_stock_threshold: number;
  allow_backorder: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface ProductVariantSettings {
  id: string;
  product_type: StoreProductType;
  product_id: string;
  variant_mode: VariantMode;
  sku_template: string | null;
  opc_template: string | null;
  config: Record<string, unknown>;
}

const queryKey = (productType: StoreProductType, productId: string) => ["store-product-variants", productType, productId] as const;
const settingsKey = (productType: StoreProductType, productId: string) => ["store-product-variant-settings", productType, productId] as const;
const publicVariantColumns = [
  "id",
  "product_type",
  "product_id",
  "title",
  "variant_key",
  "sku",
  "opc_code",
  "attributes",
  "metadata",
  "price",
  "stock_qty",
  "reserved_qty",
  "low_stock_threshold",
  "allow_backorder",
  "is_active",
  "sort_order",
].join(",");

export const useProductVariants = (productType?: StoreProductType, productId?: string, options?: { activeOnly?: boolean }) => {
  const activeOnly = options?.activeOnly ?? true;
  return useQuery<ProductVariant[]>({
    queryKey: ["store-product-variants", productType, productId],
    enabled: Boolean(productType && productId),
    queryFn: async () => {
      const query = (supabase as any)
        .from("store_product_variants_public")
        .select(publicVariantColumns)
        .eq("product_type", productType)
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });
      if (activeOnly) query.eq("is_active", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProductVariant[];
    },
  });
};

export const useProductVariantSettings = (productType?: StoreProductType, productId?: string) => {
  return useQuery<ProductVariantSettings | null>({
    queryKey: ["store-product-variant-settings", productType, productId],
    enabled: Boolean(productType && productId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_product_variant_settings")
        .select("*")
        .eq("product_type", productType)
        .eq("product_id", productId)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as ProductVariantSettings | null;
    },
  });
};

export const useSaveProductVariantSettings = (productType: StoreProductType, productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      variant_mode: VariantMode;
      sku_template?: string | null;
      opc_template?: string | null;
      config?: Record<string, unknown>;
    }) => {
      const { data, error } = await (supabase as any)
        .from("store_product_variant_settings")
        .upsert({ product_type: productType, product_id: productId, ...payload }, { onConflict: "product_type,product_id" })
        .select("*")
        .single();

      if (error) throw error;
      return data as ProductVariantSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKey(productType, productId) });
    },
  });
};

export const useBulkAddVariantsToCart = () => {
  return useMutation({
    mutationFn: async (variantItems: { variantId: string; quantity: number }[]) => {
      const { data, error } = await (supabase.rpc as any)("add_variant_items_to_cart", {
        p_items: variantItems.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
      });

      if (error) throw error;
      return Number(data ?? 0);
    },
  });
};

export const useUpsertProductVariants = (productType: StoreProductType, productId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variants: Partial<ProductVariant>[]) => {
      const { data, error } = await (supabase as any)
        .from("store_product_variants")
        .upsert(
          variants.map((variant, index) => ({
            product_type: productType,
            product_id: productId,
            title: variant.title ?? `Variant ${index + 1}`,
            variant_key: variant.variant_key ?? `variant-${index + 1}`,
            sku: variant.sku ?? null,
            opc_code: variant.opc_code ?? null,
            attributes: variant.attributes ?? {},
            metadata: variant.metadata ?? {},
            price: variant.price ?? 0,
            stock_qty: variant.stock_qty ?? 0,
            reserved_qty: variant.reserved_qty ?? 0,
            low_stock_threshold: variant.low_stock_threshold ?? 0,
            allow_backorder: variant.allow_backorder ?? false,
            is_active: variant.is_active ?? true,
            sort_order: variant.sort_order ?? index,
            ...(variant.id ? { id: variant.id } : {}),
          })),
          { onConflict: "product_type,product_id,variant_key" },
        )
        .select(publicVariantColumns);

      if (error) throw error;
      return (data ?? []) as ProductVariant[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey(productType, productId) });
    },
  });
};

export const useArchiveProductVariant = (productType: StoreProductType, productId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await (supabase as any)
        .from("store_product_variants")
        .update({ is_active: false })
        .eq("id", variantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-product-variants", productType, productId] });
    },
  });
};
