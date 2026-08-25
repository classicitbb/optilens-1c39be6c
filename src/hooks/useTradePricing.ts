import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canAccessPortalFeature, usePortalIdentity } from "@/hooks/usePortalIdentity";

// Trade pricing for the public store, sourced from the same live pricing
// mechanism as Rx ordering and the account pricelist page — see
// docs/PRICING_WHICH_TABLE.md. Lens prices come from the pricelist matrix
// (customers.assigned_pricelist_id -> matrix_allocations, keyed by lens_id);
// supply/addon prices come from the "Supplies Prices" section of the same
// document (pricelist_catalog_rows, catalog_type='buysell', keyed by item_id).
// Both RPCs already apply the master/child markup-discount hierarchy and any
// line-level override, so the numbers returned here match what the account's
// own pricelist page and admin preview show — never recomputed client-side.
export interface TradePriceMap {
  lensPriceByLensId: Map<string, number>;
  itemPriceByItemId: Map<string, number>;
}

const EMPTY_TRADE_PRICING: TradePriceMap = {
  lensPriceByLensId: new Map(),
  itemPriceByItemId: new Map(),
};

export const useTradePricing = () => {
  const { identity, isLoading: identityLoading } = usePortalIdentity();

  const eligible =
    !!identity &&
    canAccessPortalFeature(identity, "pricelists") &&
    identity.assignedPricelistId != null &&
    identity.crmCustomerId != null;
  const customerId = eligible ? identity!.crmCustomerId : null;

  const query = useQuery<TradePriceMap>({
    queryKey: ["trade-store-pricing", customerId],
    enabled: customerId != null,
    queryFn: async () => {
      const [{ data: matrixRows, error: matrixError }, { data: catalogRows, error: catalogError }] = await Promise.all([
        (supabase.rpc as any)("portal_assigned_pricelist_matrix", { p_customer_id: customerId }),
        (supabase.rpc as any)("portal_assigned_pricelist_catalog", { p_catalog_type: "buysell", p_customer_id: customerId }),
      ]);
      if (matrixError) throw matrixError;
      if (catalogError) throw catalogError;

      const lensPriceByLensId = new Map<string, number>();
      for (const row of (matrixRows ?? []) as Array<{ lens_id: string | null; allocated_price_bbd: number | null }>) {
        if (row.lens_id && row.allocated_price_bbd != null) {
          lensPriceByLensId.set(row.lens_id, Number(row.allocated_price_bbd));
        }
      }

      const itemPriceByItemId = new Map<string, number>();
      for (const row of (catalogRows ?? []) as Array<{ item_id: string | null; bbd_price: number | null }>) {
        if (row.item_id && row.bbd_price != null) {
          itemPriceByItemId.set(row.item_id, Number(row.bbd_price));
        }
      }

      return { lensPriceByLensId, itemPriceByItemId };
    },
    staleTime: 60_000,
  });

  return {
    tradePricing: customerId != null ? query.data ?? null : EMPTY_TRADE_PRICING,
    customerId,
    isTradeCustomer: eligible,
    isLoading: identityLoading || (customerId != null && query.isLoading),
  };
};
