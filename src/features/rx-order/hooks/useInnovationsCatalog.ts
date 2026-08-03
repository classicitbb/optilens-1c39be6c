import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogAlias } from "../embed/innovations-catalog";
import { buildPriceLookup, type PriceLookup } from "../pricing/matrixPricing";

// The Rx order form's two data sources under the Innovations-as-catalogue model
// (docs/rx-order-innovations-catalogue.md): what may be ordered, and what it
// costs the customer. Neither goes through the CV `lenses` table.

const PAGE = 1000; // PostgREST caps every response at 1000 rows regardless of .limit()

/** Everything Innovations currently publishes as available. */
export const useInnovationsCatalogAliases = () =>
  useQuery<CatalogAlias[]>({
    queryKey: ["innovations-catalog-aliases"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const all: CatalogAlias[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await (supabase.from("innovations_lens_aliases") as any)
          .select("alias, style_code, style_description, color_code, color_description, mf_type, pricing_key")
          .eq("is_active", true)
          .order("alias")
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        all.push(...(data as CatalogAlias[]));
        if (data.length < PAGE) break;
      }
      return all;
    },
  });

/**
 * The customer's price matrix, as a cell lookup.
 *
 * Returns a lookup that always answers — null means "no price for this cell",
 * which the form treats as quote-only rather than as an error (§2.4). A missing
 * pricelist version yields a lookup that prices nothing, so an unassigned
 * account sees a fully quote-only catalogue instead of an empty form.
 */
export const useRxMatrixPrices = (pricelistVersionId: number | null | undefined) =>
  useQuery<PriceLookup>({
    queryKey: ["rx-matrix-prices", pricelistVersionId ?? null],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (pricelistVersionId == null) return buildPriceLookup([]);
      const all: any[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await (supabase.from("matrix_allocations") as any)
          .select("treatment_type, category, material_index, allocated_price_bbd")
          .eq("pricelist_version_id", pricelistVersionId)
          .eq("is_active", true)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        all.push(...data);
        if (data.length < PAGE) break;
      }
      return buildPriceLookup(all);
    },
  });
