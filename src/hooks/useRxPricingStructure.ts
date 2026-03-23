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

      return {
        groupings,
        categories,
        groupingVersions,
        categoryVersions,
        structure: buildRxPricingStructure({ groupings, categories, groupingVersions, categoryVersions }),
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

      const activeGroupings = query.data?.groupings.filter((grouping) => grouping.is_active) ?? [];
      const { data: grouping, error: groupingError } = await supabase
        .from("rx_price_groupings" as any)
        .insert({
          key: uniqueKey,
          default_name: trimmed,
          sort_order: activeGroupings.length,
          is_active: true,
        })
        .select("*")
        .single();
      if (groupingError) throw groupingError;

      const activeCategories = (query.data?.categories ?? []).filter((category) => category.is_active);
      const sharedCategoryDefaults = [...new Map(activeCategories.map((category) => [category.key, category])).values()]
        .sort((a, b) => a.sort_order - b.sort_order || a.default_name.localeCompare(b.default_name));

      let insertedCategories: Array<{ id: number; key: string }> = [];
      if (sharedCategoryDefaults.length > 0) {
        const { data: newCategoryRows, error: categoryInsertError } = await supabase
          .from("rx_price_categories" as any)
          .insert(sharedCategoryDefaults.map((category, index) => ({
          grouping_id: (grouping as any).id,
            key: category.key,
            default_name: category.default_name,
            sort_order: index,
            is_active: true,
          })))
          .select("id, key");
        if (categoryInsertError) throw categoryInsertError;
        insertedCategories = (newCategoryRows ?? []) as unknown as Array<{ id: number; key: string }>;
      }

      const { data: versionsRaw, error: versionsError } = await supabase.from("pricelist_versions" as any).select("id").order("id");
      if (versionsError) throw versionsError;
      const versions = (versionsRaw ?? []) as unknown as { id: number }[];

      if ((versions ?? []).length > 0) {
        const groupingVersionRows = (versions ?? []).map((version: { id: number }) => ({
          pricelist_version_id: version.id,
          grouping_id: grouping.id,
          sort_order: grouping.sort_order,
          is_enabled: true,
        }));
        const { error: groupingVersionError } = await supabase.from("rx_price_grouping_versions" as any).upsert(groupingVersionRows, { onConflict: "pricelist_version_id,grouping_id" });
        if (groupingVersionError) throw groupingVersionError;
      }

      if (insertedCategories.length > 0 && (versions ?? []).length > 0) {
        const categoryById = new Map((query.data?.categories ?? []).map((category) => [category.id, category]));
        const { data: allExistingCategoryVersions, error: allCategoryVersionsError } = await supabase
          .from("rx_price_category_versions" as any)
          .select("pricelist_version_id, category_id, display_name, sort_order, is_enabled");
        if (allCategoryVersionsError) throw allCategoryVersionsError;

        const versionCategoryOverrideMap = new Map<string, { display_name: string | null; sort_order: number | null; is_enabled: boolean }>();
        (allExistingCategoryVersions ?? []).forEach((row: any) => {
          const category = categoryById.get(row.category_id);
          if (!category || versionCategoryOverrideMap.has(`${row.pricelist_version_id}::${category.key}`)) return;
          versionCategoryOverrideMap.set(`${row.pricelist_version_id}::${category.key}`, {
            display_name: row.display_name,
            sort_order: row.sort_order,
            is_enabled: row.is_enabled,
          });
        });

        const categoryVersionRows = (versions ?? []).flatMap((version: { id: number }) =>
          insertedCategories.map((category, index) => {
            const existing = versionCategoryOverrideMap.get(`${version.id}::${category.key}`);
            return {
              pricelist_version_id: version.id,
              category_id: category.id,
              display_name: existing?.display_name ?? null,
              sort_order: existing?.sort_order ?? index,
              is_enabled: existing?.is_enabled ?? true,
            };
          })
        );

        const { error: categoryVersionInsertError } = await supabase
          .from("rx_price_category_versions" as any)
          .insert(categoryVersionRows);
        if (categoryVersionInsertError) throw categoryVersionInsertError;

        const allocationRows = (versions ?? []).flatMap((version: { id: number }) =>
          insertedCategories.flatMap((category) =>
            MATERIAL_COLUMNS.map((material) => ({
              pricelist_version_id: version.id,
              category: category.key,
              material_index: material.key,
              treatment_type: grouping.key,
              lens_id: null,
              allocated_price_bbd: null,
              is_active: true,
            }))
          )
        );

        const { error: allocationError } = await supabase.from("matrix_allocations" as any).upsert(allocationRows, {
          onConflict: "pricelist_version_id,category,material_index,treatment_type",
        });
        if (allocationError) throw allocationError;
      }

      return grouping;
    },
    onSuccess: invalidate,
  });

  const createCategory = useMutation({
    mutationFn: async ({ name }: { name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Category name is required.");

      const baseKey = slugifyPricingKey(trimmed);
      if (!baseKey) throw new Error("Category name is invalid.");
      const uniqueKey = await ensureUniqueKey("rx_price_categories", baseKey);

      const activeGroupings = (query.data?.groupings ?? []).filter((grouping) => grouping.is_active).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      const activeCategories = (query.data?.categories ?? []).filter((category) => category.is_active);
      const globalSortOrder = [...new Set(activeCategories.map((category) => category.key))].length;

      const { data: insertedCategories, error: categoryInsertError } = await supabase
        .from("rx_price_categories" as any)
        .insert(activeGroupings.map((grouping) => ({
          grouping_id: grouping.id,
          key: uniqueKey,
          default_name: trimmed,
          sort_order: globalSortOrder,
          is_active: true,
        })))
        .select("id, grouping_id, key");
      if (categoryInsertError) throw categoryInsertError;

      const { data: versions, error: versionsError } = await supabase.from("pricelist_versions" as any).select("id").order("id");
      if (versionsError) throw versionsError;

      if ((versions ?? []).length > 0) {
        const categoryVersionRows = (versions ?? []).flatMap((version: { id: number }) =>
          (insertedCategories ?? []).map((category: any) => ({
            pricelist_version_id: version.id,
            category_id: category.id,
            display_name: null,
            sort_order: globalSortOrder,
            is_enabled: true,
          }))
        );

        const { error: categoryVersionError } = await supabase.from("rx_price_category_versions" as any).insert(categoryVersionRows);
        if (categoryVersionError) throw categoryVersionError;

        const groupingKeyMap = new Map(activeGroupings.map((grouping) => [grouping.id, grouping.key]));
        const allocationRows = (versions ?? []).flatMap((version: { id: number }) =>
          (insertedCategories ?? []).flatMap((category: any) =>
            MATERIAL_COLUMNS.map((material) => ({
              pricelist_version_id: version.id,
              category: category.key,
              material_index: material.key,
              treatment_type: groupingKeyMap.get(category.grouping_id),
              lens_id: null,
              allocated_price_bbd: null,
              is_active: true,
            }))
          )
        );

        const { error: allocationError } = await supabase.from("matrix_allocations" as any).upsert(allocationRows, {
          onConflict: "pricelist_version_id,category,material_index,treatment_type",
        });
        if (allocationError) throw allocationError;
      }

      return insertedCategories;
    },
    onSuccess: invalidate,
  });

  const renameGrouping = useMutation({
    mutationFn: async ({ groupingId, name }: { groupingId: number; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Grouping name is required.");
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("rx_price_groupings" as any)
        .update({ default_name: trimmed, updated_at: now })
        .eq("id", groupingId);
      if (error) throw error;

      const { error: versionError } = await supabase
        .from("rx_price_grouping_versions" as any)
        .update({ display_name: null, updated_at: now, is_enabled: true })
        .eq("grouping_id", groupingId);
      if (versionError) throw versionError;
    },
    onSuccess: invalidate,
  });

  const renameCategory = useMutation({
    mutationFn: async ({ categoryId, name }: { categoryId: number; name: string }) => {
      if (!versionId) throw new Error("No price list version selected.");
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Category name is required.");
      const targetCategory = query.data?.categories.find((category) => category.id === categoryId);
      if (!targetCategory) throw new Error("Category not found.");

      const categoryIds = (query.data?.categories ?? [])
        .filter((category) => category.key === targetCategory.key && category.is_active)
        .map((category) => category.id);

      const payload = categoryIds.map((id) => ({
        pricelist_version_id: versionId,
        category_id: id,
        display_name: trimmed,
        updated_at: new Date().toISOString(),
        is_enabled: true,
      }));

      const { error } = await supabase.from("rx_price_category_versions" as any).upsert(payload, {
        onConflict: "pricelist_version_id,category_id",
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const bumpGrouping = useMutation({
    mutationFn: async ({ groupingId, direction }: { groupingId: number; direction: -1 | 1 }) => {
      const groupings = query.data?.structure ?? [];
      const currentIndex = groupings.findIndex((grouping) => grouping.id === groupingId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= groupings.length) return;

      const current = groupings[currentIndex];
      const target = groupings[targetIndex];
      const now = new Date().toISOString();
      const { error } = await supabase.from("rx_price_groupings" as any).upsert([
        { id: current.id, key: current.key, default_name: current.defaultName, sort_order: target.sortOrder, is_active: true, updated_at: now },
        { id: target.id, key: target.key, default_name: target.defaultName, sort_order: current.sortOrder, is_active: true, updated_at: now },
      ]);
      if (error) throw error;

      const { data: versions, error: versionsError } = await supabase.from("pricelist_versions" as any).select("id");
      if (versionsError) throw versionsError;
      const versionPayload = (versions ?? []).flatMap((version: any) => ([
        { pricelist_version_id: version.id, grouping_id: current.id, sort_order: target.sortOrder, display_name: null, is_enabled: true, updated_at: now },
        { pricelist_version_id: version.id, grouping_id: target.id, sort_order: current.sortOrder, display_name: null, is_enabled: true, updated_at: now },
      ]));
      const { error: groupingVersionError } = await supabase.from("rx_price_grouping_versions" as any).upsert(versionPayload, { onConflict: "pricelist_version_id,grouping_id" });
      if (groupingVersionError) throw groupingVersionError;
    },
    onSuccess: invalidate,
  });

  const bumpCategory = useMutation({
    mutationFn: async ({ categoryId, direction }: { categoryId: number; direction: -1 | 1 }) => {
      if (!versionId) throw new Error("No price list version selected.");
      const category = query.data?.categories.find((entry) => entry.id === categoryId);
      if (!category) throw new Error("Category not found.");

      const sharedCategories = query.data?.structure[0]?.categories ?? [];
      const currentIndex = sharedCategories.findIndex((entry) => entry.key === category.key);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sharedCategories.length) return;

      const current = sharedCategories[currentIndex];
      const target = sharedCategories[targetIndex];
      const currentIds = (query.data?.categories ?? []).filter((entry) => entry.key === current.key && entry.is_active).map((entry) => entry.id);
      const targetIds = (query.data?.categories ?? []).filter((entry) => entry.key === target.key && entry.is_active).map((entry) => entry.id);
      const now = new Date().toISOString();

      const payload = [
        ...currentIds.map((id) => ({ pricelist_version_id: versionId, category_id: id, sort_order: target.sortOrder, updated_at: now, is_enabled: true })),
        ...targetIds.map((id) => ({ pricelist_version_id: versionId, category_id: id, sort_order: current.sortOrder, updated_at: now, is_enabled: true })),
      ];

      const { error } = await supabase.from("rx_price_category_versions" as any).upsert(payload, {
        onConflict: "pricelist_version_id,category_id",
      });
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
    mutationFn: async ({ categoryId }: { categoryId: number }) => {
      const targetCategory = query.data?.categories.find((category) => category.id === categoryId);
      if (!targetCategory) throw new Error("Category not found.");

      const [allocationsResult, catalogRowsResult] = await Promise.all([
        supabase.from("matrix_allocations" as any).select("id", { count: "exact", head: true }).eq("category", targetCategory.key),
        supabase.from("pricelist_catalog_rows" as any).select("id", { count: "exact", head: true }).like("row_key", `matrix::%::${targetCategory.key}::%`),
      ]);
      if (allocationsResult.error) throw allocationsResult.error;
      if (catalogRowsResult.error) throw catalogRowsResult.error;

      const categoryIds = (query.data?.categories ?? []).filter((category) => category.key === targetCategory.key).map((category) => category.id);
      const isUsed = Boolean((allocationsResult.count ?? 0) > 0 || (catalogRowsResult.count ?? 0) > 0);

      if (isUsed) {
        const { error } = await supabase.from("rx_price_categories" as any).update({ is_active: false, updated_at: new Date().toISOString() }).in("id", categoryIds);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rx_price_categories" as any).delete().in("id", categoryIds);
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
