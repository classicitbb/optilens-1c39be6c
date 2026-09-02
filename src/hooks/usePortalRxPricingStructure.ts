import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  buildRxPricingStructure,
  type RxPricingCategoryRecord,
  type RxPricingCategoryVersionRecord,
  type RxPricingGroupingRecord,
  type RxPricingGroupingVersionRecord,
} from "@/features/admin/rx-pricing/structure";

const EMPTY_STRUCTURE: ReturnType<typeof buildRxPricingStructure> = [];

/**
 * Portal-safe version of useRxPricingStructure.
 *
 * The rx_price_* tables are staff-only under RLS, so a portal customer reading
 * them directly gets an empty layout and every lens grouping is filtered out of
 * the Pricelists tab (add-ons still render, since those come from their own
 * security-definer RPC). This hook reads the same layout through
 * portal_rx_pricing_structure, which scopes to the caller's own assigned
 * pricelist and returns names/ordering only.
 */
export const usePortalRxPricingStructure = (customerId: number | null, enabled: boolean) => {
  const query = useQuery({
    queryKey: ["portal-rx-pricing-structure", customerId ?? null],
    enabled,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("portal_rx_pricing_structure", {
        p_customer_id: customerId ?? null,
      });
      if (error) throw error;
      const payload = (data ?? {}) as {
        groupings?: RxPricingGroupingRecord[];
        categories?: RxPricingCategoryRecord[];
        grouping_versions?: RxPricingGroupingVersionRecord[];
        category_versions?: RxPricingCategoryVersionRecord[];
      };
      return buildRxPricingStructure({
        groupings: payload.groupings ?? [],
        categories: payload.categories ?? [],
        groupingVersions: payload.grouping_versions ?? [],
        categoryVersions: payload.category_versions ?? [],
      });
    },
    staleTime: 5 * 60_000,
  });

  return {
    structure: query.data ?? EMPTY_STRUCTURE,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
