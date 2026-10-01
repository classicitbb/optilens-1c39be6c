// Everything the React Rx form needs from the backend, assembled into the
// RxCatalog the pure model works from. It mirrors how RxOrderEmbed feeds the old
// engine (Innovations alias feed = the catalogue, the account's pricelist matrix
// = the prices, CV add-ons = coatings) so both forms offer and price the same
// things, and adds the surcharge rules from the database.
import { useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses } from "@/hooks/useLenses";
import { useAddons } from "@/hooks/useAddons";
import { useCustomerAccounts, type CustomerAccountOption } from "@/hooks/useCustomerAccounts";
import { isRxOrderableAddon, isRxOrderableLens, usePricelistScope } from "../hooks/useOrderableCatalog";
import { useInnovationsCatalogAliases, useRxMatrixPrices } from "../hooks/useInnovationsCatalog";
import { buildInnovationsCatalog, comboKey, type CatalogAlias } from "../embed/innovations-catalog";
import { buildEngineData, type LensRef } from "../embed/rx-order-adapter";
import { priceForAlias, type PriceLookup } from "../pricing/matrixPricing";
import { DEFAULT_SURCHARGE_RULES, surchargeRuleFromRow, type SurchargeRule } from "../domain/price";
import type { RxCatalog } from "./types";

/** Admin-editable surcharges; the seeded defaults stand in until they load (or if the table is unreadable). */
export const useSurchargeRules = () =>
  useQuery<readonly SurchargeRule[]>({
    queryKey: ["rx-surcharge-rules"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      // not in the generated types yet
      const { data, error } = await (supabase as any).from("rx_surcharge_rules").select("*").order("sort_order");
      if (error || !data?.length) return DEFAULT_SURCHARGE_RULES;
      return (data as Record<string, any>[]).map(surchargeRuleFromRow);
    },
  });

export interface UseRxCatalogOptions {
  /** Portal users are locked to their own account. */
  lockedAccountId: number | null;
  /** Staff pick the account in the form. */
  selectedAccountId: number | null;
  pricesVisible: boolean;
  blockUnpricedOrders?: boolean;
}

export interface PersistContext {
  lensIndex: Map<string, LensRef>;
  addons: import("@/hooks/useAddons").Addon[];
  lensPriceBBD: (m: string, d: string, c: string) => number | null;
  resolveAlias: (m: string, d: string, c: string) => { alias: string; label: string } | null;
}

export function useRxCatalog(opts: UseRxCatalogOptions) {
  const { data: lenses = [], isLoading: lensesLoading } = useLenses();
  const { data: addons = [], isLoading: addonsLoading } = useAddons();
  const { data: accounts = [], isLoading: accountsLoading } = useCustomerAccounts();
  const { data: surchargeRules = DEFAULT_SURCHARGE_RULES } = useSurchargeRules();
  const { data: clashRules = [] } = useQuery<{ addon_id_a: string; addon_id_b: string; reason: string }[]>({
    queryKey: ["addon-clash-rules"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.from("addon_clash_rules") as any).select("addon_id_a, addon_id_b, reason");
      if (error) throw error;
      return data ?? [];
    },
  });

  // New orders default to the "Retail" account so staff are not forced to pick first.
  const defaultAccountId = useMemo(
    () => accounts.find((a) => a.name.trim().toLowerCase() === "retail")?.id ?? null,
    [accounts],
  );
  const effectiveAccountId = opts.lockedAccountId ?? opts.selectedAccountId ?? defaultAccountId;
  const { data: scope, isLoading: scopeLoading } = usePricelistScope(effectiveAccountId);
  const scopeIsCurrent = effectiveAccountId == null || scope?.accountId === effectiveAccountId;
  const { data: aliases = [], isLoading: aliasesLoading } = useInnovationsCatalogAliases();
  const { data: priceLookup, isLoading: pricesLoading } = useRxMatrixPrices(scopeIsCurrent ? scope?.pricelistVersionId : undefined);

  // Keep the previous account's catalogue on screen while a switch is loading,
  // exactly as the embed does, so the form never flashes empty.
  const everReady = useRef(false);
  const loading = lensesLoading || addonsLoading || accountsLoading || aliasesLoading
    || (!everReady.current && effectiveAccountId != null && (!scopeIsCurrent || scopeLoading || pricesLoading));

  const built = useMemo(() => {
    if (loading) return null;
    const activeLenses = lenses.filter(isRxOrderableLens);
    const activeAddons = addons.filter(isRxOrderableAddon);
    const scopedLenses = scopeIsCurrent && scope?.hasLensRows ? activeLenses.filter((l) => scope.lensIds.has(l.id)) : activeLenses;
    const scopedAddons = scopeIsCurrent && scope?.hasAddonRows ? activeAddons.filter((a) => scope.addonIds.has(a.id)) : activeAddons;
    const scopedAccounts: CustomerAccountOption[] = opts.lockedAccountId != null
      ? accounts.filter((a) => a.id === opts.lockedAccountId) : accounts;
    const cv = buildEngineData({
      lenses: scopedLenses, addons: scopedAddons, clashRules, accounts: scopedAccounts,
      addonPriceFor: (id, fallback) => scope?.priceByItemId?.get?.(id) ?? fallback,
      currency: "BBD", pricesVisible: opts.pricesVisible,
    });
    const catalog = buildInnovationsCatalog(aliases);
    return { cv, catalog };
  }, [loading, lenses, addons, accounts, clashRules, opts.lockedAccountId, opts.pricesVisible, scope, scopeIsCurrent, aliases]);

  const priceRef = useRef<PriceLookup | undefined>(priceLookup);
  priceRef.current = priceLookup;
  const aliasIndexRef = useRef<Map<string, CatalogAlias>>(new Map());
  if (built) aliasIndexRef.current = built.catalog.aliasIndex;
  if (built) everReady.current = true;

  const rxCatalog: RxCatalog | null = useMemo(() => {
    if (!built) return null;
    const { cv, catalog } = built;
    const aliasFor = (m: string, d: string, c: string) => catalog.aliasIndex.get(comboKey(m, d, c));
    const account = accounts.find((a) => a.id === effectiveAccountId);
    return {
      materials: catalog.data.materials,
      designs: catalog.data.designs.map((d) => ({ ...d, v: (d.v === "mf" ? "mf" : "sv") as "sv" | "mf" })),
      colours: catalog.data.colours,
      combos: catalog.data.combos,
      treatments: cv.data.treatments,
      clashes: cv.data.clashes,
      // null = "not offered on this account"; the matrix lookup answers null for an unpriced cell.
      lensPrice: (m, d, c) => {
        const alias = aliasFor(m, d, c);
        const lookup = priceRef.current;
        if (!alias || !lookup) return null;
        return priceForAlias(alias, lookup);
      },
      hasPriceSource: true,
      tripleForAlias: (alias) => {
        const hit = catalog.data.combos.find((x) => aliasFor(x.m, x.d, x.c)?.alias === alias);
        return hit ? { m: hit.m, d: hit.d, c: hit.c } : null;
      },
      blockUnpricedOrders: opts.blockUnpricedOrders ?? false,
      surchargeRules,
      accountCountry: account?.country_code ?? null,
      pricesVisible: opts.pricesVisible,
    };
    // priceLookup is read through a ref but a new lookup must refresh the memo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [built, priceLookup, surchargeRules, accounts, effectiveAccountId, opts.pricesVisible, opts.blockUnpricedOrders]);

  const persistContext: PersistContext | null = useMemo(() => {
    if (!built) return null;
    const aliasFor = (m: string, d: string, c: string) => aliasIndexRef.current.get(comboKey(m, d, c));
    return {
      lensIndex: built.cv.lensIndex,
      addons,
      lensPriceBBD: (m, d, c) => {
        const alias = aliasFor(m, d, c);
        const lookup = priceRef.current;
        if (!alias || !lookup) return null;
        return priceForAlias(alias, lookup);
      },
      resolveAlias: (m, d, c) => {
        const alias = aliasFor(m, d, c);
        if (!alias) return null;
        return { alias: alias.alias, label: `${alias.pricing_key.split("|")[0].trim()} ${alias.mf_type} ${alias.style_description} ${alias.color_description}` };
      },
    };
  }, [built, addons, priceLookup]);

  return {
    catalog: rxCatalog,
    persistContext,
    accounts,
    effectiveAccountId,
    defaultAccountId,
    loading: loading || !rxCatalog,
  };
}
