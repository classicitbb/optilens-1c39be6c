import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CatalogAlias } from "../embed/innovations-catalog";
import { buildPriceLookup, type PriceLookup } from "../pricing/matrixPricing";
import { buildEngineCurrencies, type EngineCurrency } from "../pricing/currencies";
import type { PricelistLensAliasLink } from "../pricing/pricelistLenses";

// The Rx order form's two data sources under the Innovations-as-catalogue model
// (docs/rx-order-innovations-catalogue.md): what may be ordered, and what it
// costs the customer. Neither goes through the CV `lenses` table.

const PAGE = 1000; // PostgREST caps every response at 1000 rows regardless of .limit()

/** Confirmed mappings limited to lenses selected on the assigned grid. */
export const usePricelistLensAliasLinks = (lensIds: string[]) => {
  const ids = [...new Set(lensIds)].sort();
  return useQuery<PricelistLensAliasLink[]>({
    queryKey: ["pricelist-selected-lens-aliases", ids],
    enabled: ids.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const all: PricelistLensAliasLink[] = [];
      for (let offset = 0; offset < ids.length; offset += 100) {
        for (let from = 0; ; from += PAGE) {
          const { data, error } = await supabase.from("lens_alias_map")
            .select("lens_id, innovations_alias, is_primary")
            .in("lens_id", ids.slice(offset, offset + 100))
            .not("confirmed_at", "is", null)
            .order("id").range(from, from + PAGE - 1);
          if (error) throw error;
          all.push(...(data ?? []));
          if (!data || data.length < PAGE) break;
        }
      }
      return all;
    },
  });
};

/** Everything Innovations currently publishes as available. */
export const useInnovationsCatalogAliases = (enabled = true) =>
  useQuery<CatalogAlias[]>({
    queryKey: ["innovations-catalog-aliases"],
    enabled,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const all: CatalogAlias[] = [];
      for (let from = 0; ; from += PAGE) {
        // An RPC (no suppliers column) — customers cannot read the raw table.
        // Not in the generated types until the next regeneration, hence the cast.
        const { data, error } = await (supabase.rpc as any)("get_rx_catalog_aliases")
          .select("alias, style_code, style_description, color_code, color_description, mf_type, pricing_key")
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

/**
 * The engine's currency table, built from the ACTIVE pricing settings row.
 *
 * `pricing_settings` is versioned — reading "the first row" picks up historical
 * versions with different buffers. Only `is_active` is authoritative.
 */
export const useRxCurrencies = () =>
  useQuery<Record<string, EngineCurrency>>({
    queryKey: ["rx-engine-currencies"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("pricing_settings") as any)
        .select("fx_rates")
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return buildEngineCurrencies(data?.fx_rates ?? null);
    },
  });
