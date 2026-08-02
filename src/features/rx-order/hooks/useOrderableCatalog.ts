import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses, Lens } from "@/hooks/useLenses";
import { useAddons, Addon } from "@/hooks/useAddons";

// Availability rule (RX_ORDER_FORM_BUILD_PLAN.md §1, locked):
//   shown = on the account's assigned pricelist_versions document
//           AND is_active AND show_on_website.
// If the assigned version has no explicit lens/addon catalog rows at all
// (some versions price RX purely through the matrix), we fall back to the
// full active+priced catalog and surface `pricelistHasRows=false` so the UI
// can say so instead of silently showing an empty form.

interface PricelistScope {
  pricelistVersionId: number | null;
  pricelistName: string | null;
  lensIds: Set<string>;
  addonIds: Set<string>;
  priceByItemId: Map<string, number>;
  hasLensRows: boolean;
  hasAddonRows: boolean;
}

const EMPTY_SCOPE: PricelistScope = {
  pricelistVersionId: null,
  pricelistName: null,
  lensIds: new Set(),
  addonIds: new Set(),
  priceByItemId: new Map(),
  hasLensRows: false,
  hasAddonRows: false,
};

export const usePricelistScope = (accountId: number | null) => {
  return useQuery<PricelistScope>({
    queryKey: ["rx-order-pricelist-scope", accountId],
    enabled: accountId != null,
    queryFn: async () => {
      const { data: customer, error: custErr } = await (supabase.from("customers") as any)
        .select("id, assigned_pricelist_id")
        .eq("id", accountId)
        .maybeSingle();
      if (custErr) throw custErr;
      const versionId = customer?.assigned_pricelist_id ?? null;
      if (versionId == null) return EMPTY_SCOPE;

      const [{ data: version }, { data: rows, error: rowsErr }] = await Promise.all([
        (supabase.from("pricelist_versions") as any).select("id, name").eq("id", versionId).maybeSingle(),
        (supabase.from("pricelist_catalog_rows") as any)
          .select("row_type, item_id, bbd_price")
          .eq("pricelist_version_id", versionId),
      ]);
      if (rowsErr) throw rowsErr;

      const lensIds = new Set<string>();
      const addonIds = new Set<string>();
      const priceByItemId = new Map<string, number>();
      for (const r of rows ?? []) {
        if (!r.item_id) continue;
        if (r.row_type === "lens") lensIds.add(r.item_id);
        if (r.row_type === "addon" || r.row_type === "supply") addonIds.add(r.item_id);
        if (r.bbd_price != null) priceByItemId.set(r.item_id, Number(r.bbd_price));
      }
      return {
        pricelistVersionId: versionId,
        pricelistName: version?.name ?? null,
        lensIds,
        addonIds,
        priceByItemId,
        hasLensRows: lensIds.size > 0,
        hasAddonRows: addonIds.size > 0,
      };
    },
    staleTime: 60_000,
  });
};

export interface OrderableCatalog {
  lenses: Lens[];
  addons: Addon[];
  priceFor: (itemId: string, fallback: number) => number;
  pricelistName: string | null;
  pricelistHasLensRows: boolean;
  pricelistHasAddonRows: boolean;
  ready: boolean;
}

export const useOrderableCatalog = (accountId: number | null): OrderableCatalog => {
  const { data: lenses = [], isLoading: lensesLoading } = useLenses();
  const { data: addons = [], isLoading: addonsLoading } = useAddons();
  const { data: scope, isLoading: scopeLoading } = usePricelistScope(accountId);

  const activeLenses = lenses.filter(
    (l) => l.is_active && l.show_on_website && (l.sell_price > 0 || l.base_price > 0),
  );
  const activeAddons = addons.filter((a) => a.is_active && a.show_on_website);

  const scopedLenses = scope?.hasLensRows
    ? activeLenses.filter((l) => scope.lensIds.has(l.id))
    : activeLenses;
  const scopedAddons = scope?.hasAddonRows
    ? activeAddons.filter((a) => scope.addonIds.has(a.id))
    : activeAddons;

  return {
    lenses: scopedLenses,
    addons: scopedAddons,
    priceFor: (itemId, fallback) => scope?.priceByItemId.get(itemId) ?? fallback,
    pricelistName: scope?.pricelistName ?? null,
    pricelistHasLensRows: !!scope?.hasLensRows,
    pricelistHasAddonRows: !!scope?.hasAddonRows,
    ready: !lensesLoading && !addonsLoading && (accountId == null || !scopeLoading),
  };
};
