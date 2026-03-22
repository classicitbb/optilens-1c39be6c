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

export const normalizeSortOrder = <T extends { sortOrder: number }>(items: T[]) =>
  items
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item, index) => ({ ...item, sortOrder: index }));

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
  const groupingVersionMap = new Map(groupingVersions.map((record) => [record.grouping_id, record]));
  const categoryVersionMap = new Map(categoryVersions.map((record) => [record.category_id, record]));

  return groupings
    .filter((grouping) => grouping.is_active)
    .map((grouping) => {
      const groupingVersion = groupingVersionMap.get(grouping.id);
      const groupingName = groupingVersion?.display_name?.trim() || grouping.default_name;

      const mergedCategories = categories
        .filter((category) => category.grouping_id === grouping.id && category.is_active)
        .map((category) => {
          const categoryVersion = categoryVersionMap.get(category.id);
          return {
            id: category.id,
            groupingId: category.grouping_id,
            key: category.key,
            name: categoryVersion?.display_name?.trim() || category.default_name,
            defaultName: category.default_name,
            sortOrder: categoryVersion?.sort_order ?? category.sort_order,
            isEnabled: categoryVersion?.is_enabled ?? true,
            isActive: category.is_active,
          } satisfies RxPricingCategoryView;
        })
        .filter((category) => category.isEnabled)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

      return {
        id: grouping.id,
        key: grouping.key,
        name: groupingName,
        defaultName: grouping.default_name,
        sortOrder: groupingVersion?.sort_order ?? grouping.sort_order,
        isEnabled: groupingVersion?.is_enabled ?? true,
        isActive: grouping.is_active,
        categories: mergedCategories,
      } satisfies RxPricingGroupingView;
    })
    .filter((grouping) => grouping.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
};
