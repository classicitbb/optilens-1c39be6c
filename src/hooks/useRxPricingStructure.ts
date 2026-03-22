import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildRxPricingStructure,
  slugifyPricingKey,
  type RxPricingCategoryRecord,
  type RxPricingCategoryVersionRecord,
  type RxPricingGroupingRecord,
  type RxPricingGroupingVersionRecord,
} from "@/features/admin/rx-pricing/structure";
import { MATERIAL_COLUMNS } from "@/hooks/useMatrixAllocations";

const STRUCTURE_QUERY_KEY = ["rx-pricing-structure"];

const ensureUniqueKey = async (table: string, baseKey: string, extraFilter?: { column: string; value: number }) => {
  let attempt = 0;
  let candidate = baseKey;

  while (attempt < 50) {
    let query = supabase.from(table as any).select("id", { count: "exact", head: true }).eq("key", candidate);
    if (extraFilter) query = query.eq(extraFilter.column, extraFilter.value);
    const { count, error } = await query;
    if (error) throw error;
    if (!count) return candidate;
    attempt += 1;
    candidate = `${baseKey}_${attempt + 1}`;
  }

  throw new Error("Unable to generate a unique key.");
};

export const useRxPricingStructure = (versionId: number | null) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...STRUCTURE_QUERY_KEY, versionId],
    queryFn: async () => {
      const [groupingsResult, categoriesResult, groupingVersionsResult, categoryVersionsResult] = await Promise.all([
        supabase.from("rx_price_groupings" as any).select("*").order("sort_order").order("id"),
        supabase.from("rx_price_categories" as any).select("*").order("sort_order").order("id"),
        versionId
          ? supabase.from("rx_price_grouping_versions" as any).select("grouping_id, display_name, sort_order, is_enabled").eq("pricelist_version_id", versionId)
          : Promise.resolve({ data: [], error: null }),
        versionId
          ? supabase.from("rx_price_category_versions" as any).select("category_id, display_name, sort_order, is_enabled").eq("pricelist_version_id", versionId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (groupingsResult.error) throw groupingsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if ((groupingVersionsResult as any).error) throw (groupingVersionsResult as any).error;
      if ((categoryVersionsResult as any).error) throw (categoryVersionsResult as any).error;

      const groupings = (groupingsResult.data ?? []) as unknown as RxPricingGroupingRecord[];
      const categories = (categoriesResult.data ?? []) as unknown as RxPricingCategoryRecord[];
      const groupingVersions = ((groupingVersionsResult as any).data ?? []) as RxPricingGroupingVersionRecord[];
      const categoryVersions = ((categoryVersionsResult as any).data ?? []) as RxPricingCategoryVersionRecord[];

      const structure = buildRxPricingStructure({ groupings, categories, groupingVersions, categoryVersions });

      return {
        groupings,
        categories,
        groupingVersions,
        categoryVersions,
        structure,
      };
    },
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: STRUCTURE_QUERY_KEY });
    await queryClient.invalidateQueries({ queryKey: ["matrix-allocations"] });
    await queryClient.invalidateQueries({ queryKey: ["pricelist-catalog-rows"] });
  };

  const createGrouping = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Grouping name is required.");

      const baseKey = slugifyPricingKey(trimmed);
      if (!baseKey) throw new Error("Grouping name is invalid.");
      const uniqueKey = await ensureUniqueKey("rx_price_groupings", baseKey);

      const { data: grouping, error: groupingError } = await supabase
        .from("rx_price_groupings" as any)
        .insert({ key: uniqueKey, default_name: trimmed, sort_order: query.data?.groupings.length ?? 0, is_active: true })
        .select("*")
        .single();
      if (groupingError) throw groupingError;

      const { data: versions, error: versionsError } = await supabase
        .from("pricelist_versions" as any)
        .select("id")
        .order("id");
      if (versionsError) throw versionsError;

      if ((versions ?? []).length > 0) {
        const versionRows = ((versions ?? []) as unknown as { id: number }[]).map((version, index) => ({
          pricelist_version_id: version.id,
          grouping_id: (grouping as any).id,
          sort_order: query.data?.structure.length ?? index,
          is_enabled: true,
        }));

        const { error: groupVersionError } = await supabase.from("rx_price_grouping_versions" as any).insert(versionRows);
        if (groupVersionError) throw groupVersionError;
      }

      return grouping;
    },
    onSuccess: invalidate,
  });

  const createCategory = useMutation({
    mutationFn: async ({ groupingId, groupingKey, name }: { groupingId: number; groupingKey: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Category name is required.");

      const baseKey = slugifyPricingKey(trimmed);
      if (!baseKey) throw new Error("Category name is invalid.");
      const uniqueKey = await ensureUniqueKey("rx_price_categories", baseKey, { column: "grouping_id", value: groupingId });

      const groupingCategories = query.data?.categories.filter((category) => category.grouping_id === groupingId && category.is_active) ?? [];
      const { data: category, error: categoryError } = await supabase
        .from("rx_price_categories" as any)
        .insert({
          grouping_id: groupingId,
          key: uniqueKey,
          default_name: trimmed,
          sort_order: groupingCategories.length,
          is_active: true,
        })
        .select("*")
        .single();
      if (categoryError) throw categoryError;

      const { data: versions, error: versionsError } = await supabase
        .from("pricelist_versions" as any)
        .select("id")
        .order("id");
      if (versionsError) throw versionsError;

      if ((versions ?? []).length > 0) {
        const versionRows = ((versions ?? []) as unknown as { id: number }[]).map((version) => ({
          pricelist_version_id: version.id,
          category_id: category.id,
          sort_order: groupingCategories.length,
          is_enabled: true,
        }));

        const { error: categoryVersionError } = await supabase.from("rx_price_category_versions" as any).insert(versionRows);
        if (categoryVersionError) throw categoryVersionError;

        const allocationRows = ((versions ?? []) as unknown as { id: number }[]).flatMap((version) =>
          MATERIAL_COLUMNS.map((material) => ({
            pricelist_version_id: version.id,
            category: category.key,
            material_index: material.key,
            treatment_type: groupingKey,
            lens_id: null,
            allocated_price_bbd: null,
            is_active: true,
          }))
        );

        const { error: allocationError } = await supabase.from("matrix_allocations" as any).upsert(allocationRows, {
          onConflict: "pricelist_version_id,category,material_index,treatment_type",
          ignoreDuplicates: false,
        });
        if (allocationError) throw allocationError;
      }

      return category;
    },
    onSuccess: invalidate,
  });

  const renameGrouping = useMutation({
    mutationFn: async ({ groupingId, name }: { groupingId: number; name: string }) => {
      if (!versionId) throw new Error("No price list version selected.");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Grouping name is required.");
      const { error } = await supabase
        .from("rx_price_grouping_versions" as any)
        .upsert({
          pricelist_version_id: versionId,
          grouping_id: groupingId,
          display_name: trimmed,
          updated_at: new Date().toISOString(),
        }, { onConflict: "pricelist_version_id,grouping_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const renameCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: number; name: string }) => {
      if (!versionId) throw new Error("No price list version selected.");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Category name is required.");
      const { error } = await supabase
        .from("rx_price_category_versions" as any)
        .upsert({
          pricelist_version_id: versionId,
          category_id: categoryId,
          display_name: trimmed,
          updated_at: new Date().toISOString(),
        }, { onConflict: "pricelist_version_id,category_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const bumpGrouping = useMutation({
    mutationFn: async ({ groupingId, direction }: { groupingId: number; direction: -1 | 1 }) => {
      if (!versionId) throw new Error("No price list version selected.");
      const structure = query.data?.structure ?? [];
      const currentIndex = structure.findIndex((grouping) => grouping.id === groupingId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= structure.length) return;

      const current = structure[currentIndex];
      const target = structure[targetIndex];

      const now = new Date().toISOString();
      const { error } = await supabase.from("rx_price_grouping_versions" as any).upsert([
        { pricelist_version_id: versionId, grouping_id: current.id, sort_order: target.sortOrder, updated_at: now },
        { pricelist_version_id: versionId, grouping_id: target.id, sort_order: current.sortOrder, updated_at: now },
      ], { onConflict: "pricelist_version_id,grouping_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const bumpCategory = useMutation({
    mutationFn: async ({ groupingId, categoryId, direction }: { groupingId: number; categoryId: number; direction: -1 | 1 }) => {
      if (!versionId) throw new Error("No price list version selected.");
      const grouping = query.data?.structure.find((entry) => entry.id === groupingId);
      const categories = grouping?.categories ?? [];
      const currentIndex = categories.findIndex((category) => category.id === categoryId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categories.length) return;

      const current = categories[currentIndex];
      const target = categories[targetIndex];
      const now = new Date().toISOString();
      const { error } = await supabase.from("rx_price_category_versions" as any).upsert([
        { pricelist_version_id: versionId, category_id: current.id, sort_order: target.sortOrder, updated_at: now },
        { pricelist_version_id: versionId, category_id: target.id, sort_order: current.sortOrder, updated_at: now },
      ], { onConflict: "pricelist_version_id,category_id" });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const archiveGrouping = useMutation({
    mutationFn: async ({ groupingId, groupingKey }: { groupingId: number; groupingKey: string }) => {
      const [allocationsResult, catalogRowsResult] = await Promise.all([
        supabase.from("matrix_allocations" as any).select("id", { count: "exact", head: true }).eq("treatment_type", groupingKey),
        supabase.from("pricelist_catalog_rows" as any).select("id", { count: "exact", head: true }).like("row_key", `matrix::${groupingKey}::%`),
      ]);
      if (allocationsResult.error) throw allocationsResult.error;
      if (catalogRowsResult.error) throw catalogRowsResult.error;

      const isUsed = Boolean((allocationsResult.count ?? 0) > 0 || (catalogRowsResult.count ?? 0) > 0);

      if (isUsed) {
        const { error } = await supabase.from("rx_price_groupings" as any).update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", groupingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rx_price_groupings" as any).delete().eq("id", groupingId);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const archiveCategory = useMutation({
    mutationFn: async ({ categoryId, groupingKey, categoryKey }: { categoryId: number; groupingKey: string; categoryKey: string }) => {
      const [allocationsResult, catalogRowsResult] = await Promise.all([
        supabase.from("matrix_allocations" as any).select("id", { count: "exact", head: true }).eq("treatment_type", groupingKey).eq("category", categoryKey),
        supabase.from("pricelist_catalog_rows" as any).select("id", { count: "exact", head: true }).like("row_key", `matrix::${groupingKey}::${categoryKey}::%`),
      ]);
      if (allocationsResult.error) throw allocationsResult.error;
      if (catalogRowsResult.error) throw catalogRowsResult.error;

      const isUsed = Boolean((allocationsResult.count ?? 0) > 0 || (catalogRowsResult.count ?? 0) > 0);

      if (isUsed) {
        const { error } = await supabase.from("rx_price_categories" as any).update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", categoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rx_price_categories" as any).delete().eq("id", categoryId);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return {
    ...query,
    structure: query.data?.structure ?? [],
    createGrouping,
    createCategory,
    renameGrouping,
    renameCategory,
    bumpGrouping,
    bumpCategory,
    archiveGrouping,
    archiveCategory,
  };
};
