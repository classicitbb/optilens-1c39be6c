import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PricelistVersion } from "./usePricelistVersions";

export interface ChildSectionData {
  section_type: string;
  child_markup_percent: number;
  child_discount_percent: number;
}

export interface LineOverride {
  reference_type: string;
  reference_id: string;
  overridden_price_bbd: number | null;
  reason: string | null;
  child_section_id: number | null;
}

const CATALOG_TO_SECTION: Record<string, string> = {
  rx: "RX Lens Prices",
  stock: "Stock Lens Prices",
  buysell: "Supplies Prices",
  supplies: "Supplies Prices",
};

/**
 * Fetches child section markup/discount and line-level overrides for a pricelist version.
 */
export const usePriceHierarchy = (versionId: number | null) => {
  const childSectionsQuery = useQuery<ChildSectionData[]>({
    queryKey: ["pricelist-child-sections", versionId],
    enabled: !!versionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricelist_child_sections")
        .select("section_type, child_markup_percent, child_discount_percent")
        .eq("pricelist_version_id", versionId!);
      if (error) throw error;
      return (data ?? []) as ChildSectionData[];
    },
  });

  const lineOverridesQuery = useQuery<LineOverride[]>({
    queryKey: ["pricelist-line-overrides", versionId],
    enabled: !!versionId,
    queryFn: async () => {
      // Get child section IDs for this version first
      const { data: sections } = await supabase
        .from("pricelist_child_sections")
        .select("id")
        .eq("pricelist_version_id", versionId!);
      
      if (!sections || sections.length === 0) return [];
      
      const sectionIds = sections.map((s) => s.id);
      const { data, error } = await supabase
        .from("pricelist_line_overrides")
        .select("reference_type, reference_id, overridden_price_bbd, reason, child_section_id")
        .in("child_section_id", sectionIds);
      if (error) throw error;
      return (data ?? []) as LineOverride[];
    },
  });

  const childSections = childSectionsQuery.data ?? [];
  const lineOverrides = lineOverridesQuery.data ?? [];

  /**
   * Apply hierarchy calculation:
   *   base_price * (1 + master_markup/100) * (1 - master_discount/100)
   *               * (1 + child_markup/100) * (1 - child_discount/100)
   * If a line override exists for this item, use overridden_price instead.
   */
  const calcFinalPrice = (
    basePrice: number | null,
    version: PricelistVersion,
    catalogType: string,
    referenceId?: string,
    referenceType?: string
  ): number | null => {
    if (basePrice == null) return null;

    // Check for line-level override first
    if (referenceId && referenceType) {
      const override = lineOverrides.find(
        (o) => o.reference_id === referenceId && o.reference_type === referenceType
      );
      if (override?.overridden_price_bbd != null) {
        return override.overridden_price_bbd;
      }
    }

    // Apply master markup/discount
    const masterMarkup = version.master_markup_percent ?? 0;
    const masterDiscount = version.master_discount_percent ?? 0;
    let price = basePrice * (1 + masterMarkup / 100) * (1 - masterDiscount / 100);

    // Apply child section markup/discount
    const sectionType = CATALOG_TO_SECTION[catalogType] ?? catalogType;
    const childSection = childSections.find((cs) => cs.section_type === sectionType);
    if (childSection) {
      price = price * (1 + childSection.child_markup_percent / 100) * (1 - childSection.child_discount_percent / 100);
    }

    return parseFloat(price.toFixed(2));
  };

  /**
   * Get the line override reason if it exists (for internal display).
   */
  const getOverrideReason = (referenceId: string, referenceType: string): string | null => {
    const override = lineOverrides.find(
      (o) => o.reference_id === referenceId && o.reference_type === referenceType
    );
    return override?.reason ?? null;
  };

  /**
   * Check if a line has an override.
   */
  const hasOverride = (referenceId: string, referenceType: string): boolean => {
    return lineOverrides.some(
      (o) => o.reference_id === referenceId && o.reference_type === referenceType && o.overridden_price_bbd != null
    );
  };

  return {
    childSections,
    lineOverrides,
    calcFinalPrice,
    getOverrideReason,
    hasOverride,
    isLoading: childSectionsQuery.isLoading || lineOverridesQuery.isLoading,
  };
};
