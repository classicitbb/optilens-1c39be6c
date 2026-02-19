import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PricelistVersion {
  id: number;
  name: string;
  is_template: boolean | null;
  markup_percent: number | null;
  discount_percent: number | null;
  base_currency: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateVersionInput {
  name: string;
  base_currency: string;
  markup_percent: number;
  discount_percent: number;
  is_template: boolean;
  copyFrom: "matrix" | number;
}

const INDEX_COLS = [
  { key: "index_1_50", label: "1.50" },
  { key: "index_1_53", label: "1.53" },
  { key: "index_1_59", label: "1.59" },
  { key: "index_1_60", label: "1.60" },
  { key: "index_1_67", label: "1.67" },
  { key: "index_1_74", label: "1.74" },
] as const;

export const usePricelistVersions = () => {
  const queryClient = useQueryClient();

  const query = useQuery<PricelistVersion[]>({
    queryKey: ["pricelist-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricelist_versions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PricelistVersion[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateVersionInput) => {
      // 1. Insert the new version
      const { data: newVersion, error } = await supabase
        .from("pricelist_versions")
        .insert({
          name: input.name,
          base_currency: input.base_currency,
          markup_percent: input.markup_percent,
          discount_percent: input.discount_percent,
          is_template: input.is_template,
        })
        .select()
        .single();
      if (error) throw error;

      // 2. Copy prices
      if (input.copyFrom === "matrix") {
        // Seed from price_matrix
        const { data: matrixRows, error: mErr } = await supabase
          .from("price_matrix")
          .select("*");
        if (mErr) throw mErr;

        const overrides: any[] = [];
        for (const row of matrixRows || []) {
          for (const col of INDEX_COLS) {
            const val = (row as any)[col.key];
            if (val !== null && val !== undefined) {
              overrides.push({
                pricelist_version_id: newVersion.id,
                category: row.category,
                index_column: col.label,
                overridden_price: val,
              });
            }
          }
        }
        if (overrides.length > 0) {
          const { error: insErr } = await supabase
            .from("pricelist_overrides")
            .insert(overrides);
          if (insErr) throw insErr;
        }
      } else {
        // Copy overrides from an existing version
        const { data: srcOverrides, error: soErr } = await supabase
          .from("pricelist_overrides")
          .select("*")
          .eq("pricelist_version_id", input.copyFrom);
        if (soErr) throw soErr;

        if (srcOverrides && srcOverrides.length > 0) {
          const copies = srcOverrides.map((o) => ({
            pricelist_version_id: newVersion.id,
            category: o.category,
            index_column: o.index_column,
            overridden_price: o.overridden_price,
            reason: null,
          }));
          const { error: insErr } = await supabase
            .from("pricelist_overrides")
            .insert(copies);
          if (insErr) throw insErr;
        }
      }

      return newVersion;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricelist-versions"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<Pick<PricelistVersion, "name" | "markup_percent" | "discount_percent" | "is_template" | "base_currency">>;
    }) => {
      const { error } = await supabase
        .from("pricelist_versions")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricelist-versions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Delete overrides first (no cascade)
      const { error: delOverErr } = await supabase
        .from("pricelist_overrides")
        .delete()
        .eq("pricelist_version_id", id);
      if (delOverErr) throw delOverErr;

      const { error } = await supabase
        .from("pricelist_versions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pricelist-versions"] }),
  });

  return { ...query, createMutation, updateMutation, deleteMutation };
};

export const useBBDUSDRate = () => {
  return useQuery<number>({
    queryKey: ["fx-rate-bbd-usd"],
    queryFn: async () => {
      const { data } = await supabase
        .from("legacy_rates")
        .select("value")
        .eq("rate_code", "BBD_USD")
        .eq("is_active", true)
        .maybeSingle();
      return (data?.value as number) ?? 0.5;
    },
  });
};
