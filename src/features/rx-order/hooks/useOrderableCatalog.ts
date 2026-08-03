import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses, Lens } from "@/hooks/useLenses";
import { useAddons, Addon } from "@/hooks/useAddons";

// Availability rule (docs/rx-order-innovations-catalogue.md §2.2 — supersedes the
// rule previously locked in RX_ORDER_FORM_BUILD_PLAN.md §1):
//   shown = on the account's assigned pricelist_versions document
//           AND is_active AND priced.
//
// `show_on_website` is NOT part of this. It means "stock semi-finished or uncut
// lens sold as a bulk box through the website store, for labs who surface their
// own" — a different channel with a different catalogue. Gating prescription
// ordering on it was a mistake that left the Rx form offering 10 of 1,011
// active lenses. The storefront still gates on it independently in
// useStoreProducts, which is where it belongs.
//
// If the assigned version has no explicit lens/addon catalog rows at all
// (some versions price RX purely through the matrix), we fall back to the
// full active+priced catalog and surface `pricelistHasRows=false` so the UI
// can say so instead of silently showing an empty form.

/**
 * The Rx availability predicates. Exported and shared so the rule exists once —
 * it previously lived inline in both this hook and RxOrderEmbed, which is how
 * `show_on_website` came to gate one surface and not the other.
 *
 * Priced means sell OR base above zero: a lens with only a base price is still
 * orderable, the account's pricelist supplies the sell price.
 */
export const isRxOrderableLens = (lens: Pick<Lens, "is_active" | "sell_price" | "base_price">) =>
  lens.is_active && (lens.sell_price > 0 || lens.base_price > 0);

export const isRxOrderableAddon = (addon: Pick<Addon, "is_active">) => addon.is_active;

interface PricelistScope {
  accountId: number;
  pricelistVersionId: number | null;
  pricelistName: string | null;
  lensIds: Set<string>;
  addonIds: Set<string>;
  priceByItemId: Map<string, number>;
  hasLensRows: boolean;
  hasAddonRows: boolean;
}

const EMPTY_SCOPE: PricelistScope = {
  accountId: 0,
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
      if (versionId == null) return { ...EMPTY_SCOPE, accountId };

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
        accountId,
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

  const activeLenses = lenses.filter(isRxOrderableLens);
  const activeAddons = addons.filter(isRxOrderableAddon);

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
