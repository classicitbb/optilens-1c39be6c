import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductType, ProductVariant, ProductVariantConfig, VariantMode } from "./types";

export const productVariantsQueryKey = (productType: ProductType, productId: string) => ["product-variants", productType, productId] as const;
export const productVariantConfigQueryKey = (productType: ProductType, productId: string) => ["product-variant-config", productType, productId] as const;

export const buildVariantKey = (values: Record<string, unknown>) =>
  Object.entries(values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value ?? "")}`)
    .join("|");

export const useProductVariants = (productType: ProductType, productId: string) => {
  return useQuery<ProductVariant[]>({
    queryKey: productVariantsQueryKey(productType, productId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variants" as any)
        .select("*")
        .eq("product_type", productType)
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((row) => ({ ...row, price: Number(row.price ?? 0) }));
    },
    enabled: Boolean(productId),
  });
};

export const useProductVariantConfig = (productType: ProductType, productId: string) => {
  const queryClient = useQueryClient();
  const query = useQuery<ProductVariantConfig | null>({
    queryKey: productVariantConfigQueryKey(productType, productId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variant_configs" as any)
        .select("*")
        .eq("product_type", productType)
        .eq("product_id", productId)
        .maybeSingle();
      if (error) throw error;
      return data as ProductVariantConfig | null;
    },
    enabled: Boolean(productId),
  });

  const upsertConfig = useMutation({
    mutationFn: async (payload: { variant_mode: VariantMode; attributes?: ProductVariantConfig["attributes"]; settings?: Record<string, unknown> }) => {
      const { error } = await supabase.from("product_variant_configs" as any).upsert({
        product_type: productType,
        product_id: productId,
        variant_mode: payload.variant_mode,
        attributes: payload.attributes ?? [],
        settings: payload.settings ?? {},
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: productVariantConfigQueryKey(productType, productId) });
    },
  });

  return useMemo(() => ({ ...query, upsertConfig }), [query, upsertConfig]);
};
