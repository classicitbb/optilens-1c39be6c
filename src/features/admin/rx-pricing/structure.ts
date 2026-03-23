export interface RxPricingCategoryRecord {
  id: number;
  grouping_id: number;
  key: string;
  default_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface RxPricingGroupingRecord {
  id: number;
  key: string;
  default_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface RxPricingGroupingVersionRecord {
  grouping_id: number;
  display_name: string | null;
  sort_order: number | null;
  is_enabled: boolean;
}

export interface RxPricingCategoryVersionRecord {
  category_id: number;
  display_name: string | null;
  sort_order: number | null;
  is_enabled: boolean;
}

export interface RxPricingCategoryView {
  id: number;
  groupingId: number;
  key: string;
  name: string;
  defaultName: string;
  sortOrder: number;
  isEnabled: boolean;
  isActive: boolean;
}

export interface RxPricingGroupingView {
  id: number;
  key: string;
  name: string;
  defaultName: string;
  sortOrder: number;
  isEnabled: boolean;
  isActive: boolean;
  categories: RxPricingCategoryView[];
}

export const slugifyPricingKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");

export const buildMatrixRowKey = (groupKey: string, categoryKey: string, material: string) =>
  `matrix::${groupKey}::${categoryKey}::${material}`;

export const parseMatrixRowKey = (rowKey: string) => {
  if (!rowKey.startsWith("matrix::")) return null;
  const [, groupKey, categoryKey, material] = rowKey.split("::");
  if (!groupKey || !categoryKey || !material) return null;
  return { groupKey, categoryKey, material };
};

export const buildMatrixSectionLabel = (groupName: string, categoryName: string) =>
  `${groupName} — ${categoryName}`;

export const buildRxPricingStructure = ({
  groupings,
  categories,
  groupingVersions,
  categoryVersions,
}: {
  groupings: RxPricingGroupingRecord[];
  categories: RxPricingCategoryRecord[];
  groupingVersions: RxPricingGroupingVersionRecord[];
  categoryVersions: RxPricingCategoryVersionRecord[];
}): RxPricingGroupingView[] => {
  const _groupingVersions = groupingVersions;
  void _groupingVersions;

  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const sharedCategoryMeta = new Map<
    string,
    {
      defaultName: string;
      sortOrder: number;
      isEnabled: boolean;
      displayName: string | null;
    }
  >();

  categories
    .filter((category) => category.is_active)
    .forEach((category) => {
      const current = sharedCategoryMeta.get(category.key);
      if (!current || category.sort_order < current.sortOrder) {
        sharedCategoryMeta.set(category.key, {
          defaultName: category.default_name,
          sortOrder: category.sort_order,
          isEnabled: true,
          displayName: current?.displayName ?? null,
        });
      }
    });

  categoryVersions.forEach((categoryVersion) => {
    const category = categoryById.get(categoryVersion.category_id);
    if (!category || !category.is_active) return;
    const current = sharedCategoryMeta.get(category.key);
    if (!current) return;
    sharedCategoryMeta.set(category.key, {
      defaultName: current.defaultName,
      displayName: categoryVersion.display_name?.trim() || current.displayName,
      sortOrder: categoryVersion.sort_order != null ? Math.min(current.sortOrder, categoryVersion.sort_order) : current.sortOrder,
      isEnabled: current.isEnabled && categoryVersion.is_enabled,
    });
  });

  return groupings
    .filter((grouping) => grouping.is_active)
    .map((grouping) => {
      const mergedCategories = categories
        .filter((category) => category.grouping_id === grouping.id && category.is_active)
        .map((category) => {
          const sharedMeta = sharedCategoryMeta.get(category.key);
          return {
            id: category.id,
            groupingId: category.grouping_id,
            key: category.key,
            name: sharedMeta?.displayName?.trim() || category.default_name,
            defaultName: category.default_name,
            sortOrder: sharedMeta?.sortOrder ?? category.sort_order,
            isEnabled: sharedMeta?.isEnabled ?? true,
            isActive: category.is_active,
          } satisfies RxPricingCategoryView;
        })
        .filter((category) => category.isEnabled)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

      return {
        id: grouping.id,
        key: grouping.key,
        name: grouping.default_name,
        defaultName: grouping.default_name,
        sortOrder: grouping.sort_order,
        isEnabled: true,
        isActive: grouping.is_active,
        categories: mergedCategories,
      } satisfies RxPricingGroupingView;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
};
