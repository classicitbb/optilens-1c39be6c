import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses } from "@/hooks/useLenses";
import { useAddons } from "@/hooks/useAddons";
import { useCustomerAccounts } from "@/hooks/useCustomerAccounts";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import { useSaveEmbeddedRxOrderDraft } from "@/features/lens-assistant/api";
import { isRxOrderableAddon, isRxOrderableLens, usePricelistScope } from "./hooks/useOrderableCatalog";
import { useInnovationsCatalogAliases, useRxMatrixPrices } from "./hooks/useInnovationsCatalog";
import { buildInnovationsCatalog, comboKey, type CatalogAlias } from "./embed/innovations-catalog";
import { priceForAlias, type PriceLookup } from "./pricing/matrixPricing";
import { buildEngineData, persistPayload, syntheticCartProductId, LensRef } from "./embed/rx-order-adapter";
// The prototype, verbatim: scoped styles + markup + engine (see embed/ files).
import "./embed/rx-order.css";
import markup from "./embed/rx-order-markup.html?raw";
import { createRxOrderEngine } from "./embed/rx-order-engine.js";

const FONT_HREF = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300..800;1,300..800&display=swap";

export interface RxOrderEmbedProps {
  quoteId: string;
  quoteNumber?: string | null;
  surface: "admin" | "portal";
  /** Portal: the signed-in B2B account (locks the branch picker). Admin: null. */
  lockedAccountId?: number | null;
  /** Where "Proceed to checkout" goes once the order is in the cart. */
  checkoutPath?: string;
  storePath?: string;
  /**
   * Partial `cv.rxorder/1` payload replayed into the form on mount — the Lens
   * Assistant handoff. Must be settled before the embed renders; the engine
   * applies it during its own init and does not re-read the prop afterwards.
   */
  prefill?: unknown;
  /** HTML for the banner shown above a prefilled form. */
  prefillBanner?: string;
}

interface ClashRule { addon_id_a: string; addon_id_b: string; reason: string }

// Hosts the ported prototype form. The engine owns the DOM inside the
// .cv-rx-embed container; React only mounts/unmounts it and feeds adapters.
export const RxOrderEmbed = ({
  quoteId, quoteNumber, surface, lockedAccountId = null,
  checkoutPath = "/checkout", storePath = "/store",
  prefill, prefillBanner,
}: RxOrderEmbedProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const engineDataRef = useRef<any>(null);
  const lensIndexRef = useRef<Map<string, LensRef>>(new Map());
  const aliasIndexRef = useRef<Map<string, CatalogAlias>>(new Map());
  const [hasMountedEngine, setHasMountedEngine] = useState(false);
  const { data: lenses = [], isLoading: lensesLoading } = useLenses();
  const { data: addons = [], isLoading: addonsLoading } = useAddons();
  const { data: accounts = [], isLoading: accountsLoading } = useCustomerAccounts();
  const { addToCart } = useCart();
  const saveEmbeddedRxDraft = useSaveEmbeddedRxOrderDraft();
  const { isAdmin } = useUserRole();

  const { data: clashRules = [] } = useQuery<ClashRule[]>({
    queryKey: ["addon-clash-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("addon_clash_rules") as any)
        .select("addon_id_a, addon_id_b, reason");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // Pricing follows the account the user picks inside the form. State drives
  // the pricelist query; the ref lets the engine's price() read fresh data on
  // its next render without re-mounting the prototype DOM.
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(lockedAccountId);
  // New quotes default to the "Retail" account so the branch picker doesn't
  // force a choice up front; staff can still switch accounts via the picker.
  const defaultAccountId = useMemo(
    () => accounts.find((a) => a.name.trim().toLowerCase() === "retail")?.id ?? null,
    [accounts],
  );

  // An unlocked staff order still needs a real account before catalog rows and
  // overrides can be trusted. Keep the existing engine mounted while a later
  // account switch is loading, but do not mount the first form until its scope
  // has arrived.
  const effectiveAccountId = lockedAccountId ?? selectedAccountId ?? defaultAccountId;
  const { data: scope, isLoading: scopeLoading } = usePricelistScope(effectiveAccountId);
  const scopeIsCurrent = effectiveAccountId == null || scope?.accountId === effectiveAccountId;
  const scopeRef = useRef(scope);
  scopeRef.current = scopeIsCurrent ? scope : undefined;

  // Innovations is the catalogue; the matrix is the price. Neither goes through
  // the CV lenses table — see docs/rx-order-innovations-catalogue.md §2.1/§2.3.
  const { data: catalogAliases = [], isLoading: aliasesLoading } = useInnovationsCatalogAliases();
  const { data: priceLookup, isLoading: pricesLoading } = useRxMatrixPrices(
    scopeIsCurrent ? scope?.pricelistVersionId : undefined,
  );
  const priceLookupRef = useRef<PriceLookup | undefined>(priceLookup);
  priceLookupRef.current = priceLookup;

  const ready = !lensesLoading && !addonsLoading && !accountsLoading && !aliasesLoading
    && (hasMountedEngine || effectiveAccountId == null || (scopeIsCurrent && !scopeLoading && !pricesLoading));

  const engineInput = useMemo(() => {
    if (!ready) return null;
    // Shared predicates — the Rx availability rule lives in one place, and
    // deliberately excludes show_on_website (that gates the website store's
    // bulk-box channel, not prescription ordering).
    const activeLenses = lenses.filter(isRxOrderableLens);
    const activeAddons = addons.filter(isRxOrderableAddon);
    const scopedLenses = scopeIsCurrent && scope?.hasLensRows
      ? activeLenses.filter((l) => scope.lensIds.has(l.id))
      : activeLenses;
    const scopedAddons = scopeIsCurrent && scope?.hasAddonRows
      ? activeAddons.filter((a) => scope.addonIds.has(a.id))
      : activeAddons;
    const scopedAccounts = lockedAccountId != null ? accounts.filter((a) => a.id === lockedAccountId) : accounts;
    // Accounts, treatments and clash rules stay CV-sourced — misc items are not
    // in the alias feed yet (docs §5.3). The three catalogue axes come from
    // Innovations and replace the lens-row derivation entirely.
    const cv = buildEngineData({
      lenses: scopedLenses,
      addons: scopedAddons,
      clashRules,
      accounts: scopedAccounts,
      addonPriceFor: (id, fallback) => scope?.priceByItemId?.get?.(id) ?? fallback,
    });
    const catalog = buildInnovationsCatalog(catalogAliases);
    return {
      data: { ...cv.data, ...catalog.data },
      lensIndex: cv.lensIndex,
      aliasIndex: catalog.aliasIndex,
      ambiguous: catalog.ambiguous,
    };
  }, [ready, lenses, addons, accounts, clashRules, lockedAccountId, scope, scopeIsCurrent, catalogAliases]);

  useEffect(() => {
    // Settings gear (prototype/account-simulation controls) is admin-only.
    hostRef.current?.classList.toggle("no-gear", !isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    // Portal surface sits under the site's fixed Header; admin surface
    // scrolls inside AdminLayout's own container, below its top bar.
    hostRef.current?.classList.toggle("has-fixed-header", surface === "portal");
    hostRef.current?.classList.toggle("portal-account-toolbar", surface === "portal");
  }, [surface]);

  useEffect(() => {
    // Prototype font, loaded once at document level (scoped CSS references it).
    if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = FONT_HREF;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!hostRef.current || !engineInput || engineRef.current) return;
    const { data, lensIndex, aliasIndex } = engineInput;
    engineDataRef.current = data;
    lensIndexRef.current = lensIndex;
    aliasIndexRef.current = aliasIndex;

    const aliasFor = (m: string, d: string, c: string) => aliasIndexRef.current.get(comboKey(m, d, c));
    // Price is the matrix cell the alias classifies into. Null is not an error:
    // it means the combination is not offered, and the form routes it to the
    // quote-only / request-assistance path (docs §2.4).
    const lensPriceBBD = (m: string, d: string, c: string): number | null => {
      const alias = aliasFor(m, d, c);
      const lookup = priceLookupRef.current;
      if (!alias || !lookup) return null;
      return priceForAlias(alias, lookup);
    };
    const resolveAlias = (m: string, d: string, c: string) => {
      const alias = aliasFor(m, d, c);
      if (!alias) return null;
      return {
        alias: alias.alias,
        label: `${alias.pricing_key.split("|")[0].trim()} ${alias.mf_type} ${alias.style_description} ${alias.color_description}`,
      };
    };
    const persist = async (payload: any) => persistPayload(quoteId, payload, {
      lensIndex: lensIndexRef.current,
      addons,
      lensPriceBBD,
      resolveAlias,
    });

    hostRef.current.innerHTML = markup;
    const host = hostRef.current;
    const engine = createRxOrderEngine(host, {
      data: engineDataRef.current,
      lockedBranchId: lockedAccountId != null ? String(lockedAccountId) : undefined,
      defaultBranchId: defaultAccountId != null ? String(defaultAccountId) : undefined,
      orderNo: () => quoteNumber || undefined,
      // Re-applied if the engine ever remounts, which wipes its DOM anyway.
      prefill,
      prefillBanner,
      lensPrice: lensPriceBBD,
      onBranchChange: (branchId: string) => { setSelectedAccountId(Number(branchId) || null); },
      onDraftSaved: async (payload: any) => {
        await persist(payload);
        await saveEmbeddedRxDraft.mutateAsync(payload);
      },
      onSubmitted: async (payload: any) => {
        const { totalBBD } = await persist(payload);
        const added = await addToCart({
          id: syntheticCartProductId(quoteId),
          name: `Rx Order ${quoteNumber ?? ""} — ${[payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ") || payload.account?.name || ""}`.trim(),
          price: totalBBD,
          productType: "lens",
          variantMetadata: { rx_quote_id: quoteId, kind: "rx_order" },
          quantity: 1,
        });
        if (!added) throw new Error("The order could not be added to the cart.");
      },
      onCheckout: () => navigate(checkoutPath),
      onStore: () => navigate(storePath),
    });
    engineRef.current = engine;
    setHasMountedEngine(true);
    return () => {
      engine.destroy();
      engineRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineInput, quoteId]);

  useEffect(() => {
    if (!engineInput || !engineRef.current || !engineDataRef.current) return;
    // Do not briefly expose the previous account's scope while its replacement
    // is loading. Once it is current, mutate the adapter object the engine owns
    // and re-render its selectable live catalog and prices in place.
    if (effectiveAccountId != null && (!scopeIsCurrent || scopeLoading)) return;
    lensIndexRef.current = engineInput.lensIndex;
    Object.assign(engineDataRef.current, engineInput.data);
    engineRef.current.refreshData();
  }, [engineInput, effectiveAccountId, scopeIsCurrent, scopeLoading]);

  return (
    <div className="cv-rx-embed" ref={hostRef}>
      {!engineInput && (
        <div style={{ padding: "48px", textAlign: "center", fontSize: 13, color: "#667" }}>
          Loading the Rx order form…
        </div>
      )}
    </div>
  );
};

export default RxOrderEmbed;
