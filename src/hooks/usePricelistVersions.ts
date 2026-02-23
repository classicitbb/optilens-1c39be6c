import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PricelistVersion {
  id: number;
  name: string;
  is_template: boolean | null;
  markup_percent: number | null;
  discount_percent: number | null;
  base_currency: string | null;
  format_type: string | null;
  master_markup_percent: number | null;
  master_discount_percent: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChildSection {
  id?: number;
  pricelist_version_id: number;
  section_type: string;
  child_markup_percent: number;
  child_discount_percent: number;
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

      const applyAdjustment = (price: number | null) => {
        if (price == null) return price;
        return parseFloat((price * (1 + (input.markup_percent || 0) / 100) * (1 - (input.discount_percent || 0) / 100)).toFixed(2));
      };

      // 2. Copy prices
      if (input.copyFrom === "matrix") {
        // New blank pricelist — seed from price_matrix (legacy overrides only)
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
                overridden_price: applyAdjustment(val),
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
        // New pricelist: do NOT copy matrix_allocations or catalog_rows
      } else {
        // Duplicate from an existing version — copy overrides
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
            overridden_price: applyAdjustment(o.overridden_price),
            reason: null,
          }));
          const { error: insErr } = await supabase
            .from("pricelist_overrides")
            .insert(copies);
          if (insErr) throw insErr;
        }

        // Copy matrix_allocations
        const { data: srcAllocs, error: saErr } = await supabase
          .from("matrix_allocations")
          .select("*")
          .eq("pricelist_version_id", input.copyFrom);
        if (saErr) throw saErr;

        if (srcAllocs && srcAllocs.length > 0) {
          const allocCopies = srcAllocs.map((a) => ({
            pricelist_version_id: newVersion.id,
            category: a.category,
            material_index: a.material_index,
            treatment_type: a.treatment_type,
            lens_id: a.lens_id,
            allocated_price_bbd: applyAdjustment(a.allocated_price_bbd),
            is_active: a.is_active,
          }));
          const { error: insErr } = await supabase
            .from("matrix_allocations")
            .insert(allocCopies);
          if (insErr) throw insErr;
        }

        // Copy pricelist_catalog_rows
        const { data: srcCatalog, error: scErr } = await supabase
          .from("pricelist_catalog_rows")
          .select("*")
          .eq("pricelist_version_id", input.copyFrom);
        if (scErr) throw scErr;

        if (srcCatalog && srcCatalog.length > 0) {
          const catCopies = srcCatalog.map((r) => ({
            pricelist_version_id: newVersion.id,
            catalog_type: r.catalog_type,
            row_key: r.row_key,
            row_type: r.row_type,
            section: r.section,
            display_description: r.display_description,
            bbd_price: applyAdjustment(r.bbd_price),
            item_id: r.item_id,
            sort_order: r.sort_order,
          }));
          const { error: insErr } = await supabase
            .from("pricelist_catalog_rows")
            .insert(catCopies);
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
      childSections,
    }: {
      id: number;
      updates: Partial<Pick<PricelistVersion, "name" | "markup_percent" | "discount_percent" | "is_template" | "base_currency" | "format_type" | "master_markup_percent" | "master_discount_percent">>;
      childSections?: ChildSection[];
    }) => {
      const { error } = await supabase
        .from("pricelist_versions")
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;

      // Upsert child sections
      if (childSections && childSections.length > 0) {
        for (const cs of childSections) {
          const { data: existing } = await supabase
            .from("pricelist_child_sections")
            .select("id")
            .eq("pricelist_version_id", id)
            .eq("section_type", cs.section_type)
            .maybeSingle();

          if (existing) {
            const { error: uErr } = await supabase
              .from("pricelist_child_sections")
              .update({
                child_markup_percent: cs.child_markup_percent,
                child_discount_percent: cs.child_discount_percent,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
            if (uErr) throw uErr;
          } else {
            const { error: iErr } = await supabase
              .from("pricelist_child_sections")
              .insert({
                pricelist_version_id: id,
                section_type: cs.section_type,
                child_markup_percent: cs.child_markup_percent,
                child_discount_percent: cs.child_discount_percent,
              });
            if (iErr) throw iErr;
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pricelist-versions"] });
      queryClient.invalidateQueries({ queryKey: ["pricelist-child-sections"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      // Delete all dependent rows first (no cascade on FK)
      const { error: delCatErr } = await supabase
        .from("pricelist_catalog_rows")
        .delete()
        .eq("pricelist_version_id", id);
      if (delCatErr) throw delCatErr;

      const { error: delAllocErr } = await supabase
        .from("matrix_allocations")
        .delete()
        .eq("pricelist_version_id", id);
      if (delAllocErr) throw delAllocErr;

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
