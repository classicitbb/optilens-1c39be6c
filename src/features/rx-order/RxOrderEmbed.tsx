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
import { useSaveEmbeddedRxOrderDraft, useRxDrafts } from "@/features/lens-assistant/api";
import { useCartDrafts } from "@/hooks/useCartDrafts";
import { isRxOrderableAddon, isRxOrderableLens, usePricelistScope } from "./hooks/useOrderableCatalog";
import { useInnovationsCatalogAliases, useRxCurrencies, useRxMatrixPrices } from "./hooks/useInnovationsCatalog";
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
   * "Start another Rx order" — must start a genuinely new quote, not reset
   * this one in place (the cart's synthetic product id is a hash of quoteId,
   * so a second submit under the same quote collides with the first job's
   * cart row). Falls back to the old in-place reset if not supplied.
   */
  onStartAnother?: () => void;
  /**
   * Partial `cv.rxorder/1` payload replayed into the form on mount — the Lens
   * Assistant handoff. Must be settled before the embed renders; the engine
   * applies it during its own init and does not re-read the prop afterwards.
   */
  prefill?: unknown;
  /** HTML for the banner shown above a prefilled form. */
  prefillBanner?: string;
  /** id of the rx_order_drafts row `prefill` was loaded from, if any — later
   *  saves (manual or auto) update this row instead of creating a new one. */
  resumedDraftId?: string;
  pricesVisible?: boolean;
  currency?: string;
  /**
   * Credit-approved accounts skip the cart: submit places the order on account
   * and hands it straight to the lab. This only decides what the form OFFERS —
   * place_rx_order_direct() re-checks the privilege server-side, so a stale or
   * tampered client cannot grant itself the shortcut.
   */
  allowDirectSubmit?: boolean;
}

interface ClashRule { addon_id_a: string; addon_id_b: string; reason: string }

// Hosts the ported prototype form. The engine owns the DOM inside the
// .cv-rx-embed container; React only mounts/unmounts it and feeds adapters.
export const RxOrderEmbed = ({
  quoteId, quoteNumber, surface, lockedAccountId = null,
  checkoutPath = "/checkout", storePath = "/store",
  onStartAnother,
  prefill, prefillBanner, resumedDraftId, pricesVisible = true, currency = "BBD",
  allowDirectSubmit = false,
}: RxOrderEmbedProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const adapterOptionsRef = useRef<any>(null);
  // Which rx_order_drafts row saves land in. Seeded from a resumed draft;
  // otherwise the first save (autosave or manual) creates the row and fills
  // this in, so every save after that in the same session updates it in place.
  const draftIdRef = useRef<string | undefined>(resumedDraftId);
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
  // Only the customer portal has a "Saved Drafts" page to send an empty,
  // never-touched order to instead of saving it as a useless blank draft.
  const { drafts: cartDrafts } = useCartDrafts();
  const { data: rxDrafts = [] } = useRxDrafts();
  const hasSavedDrafts = surface === "portal" && cartDrafts.length + rxDrafts.length > 0;

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
  // Rates come from the active pricing_settings row, inverted in one place —
  // that table stores BBD-per-foreign, the engine wants foreign-per-BBD (§2.8).
  const { data: currencies, isLoading: currenciesLoading } = useRxCurrencies();

  const ready = !lensesLoading && !addonsLoading && !accountsLoading && !aliasesLoading && !currenciesLoading
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
      currency,
      pricesVisible,
    });
    const catalog = buildInnovationsCatalog(catalogAliases);
    return {
      data: { ...cv.data, ...catalog.data, ...(currencies ? { currencies } : {}) },
      lensIndex: cv.lensIndex,
      aliasIndex: catalog.aliasIndex,
      ambiguous: catalog.ambiguous,
    };
  }, [ready, lenses, addons, accounts, clashRules, lockedAccountId, scope, scopeIsCurrent, catalogAliases, currencies, currency, pricesVisible]);

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
    const persistTo = async (id: string, payload: any) => persistPayload(id, payload, {
      lensIndex: lensIndexRef.current,
      addons,
      lensPriceBBD,
      resolveAlias,
    });
    const persist = (payload: any) => persistTo(quoteId, payload);

    hostRef.current.innerHTML = markup;
    const host = hostRef.current;
    const adapterOptions = {
      data: engineDataRef.current,
      lockedBranchId: lockedAccountId != null ? String(lockedAccountId) : undefined,
      defaultBranchId: defaultAccountId != null ? String(defaultAccountId) : undefined,
      // Rx order numbers are numeric identifiers for the PO/lab payload.
      // The quote number remains a separate customer-service reference.
      // Re-applied if the engine ever remounts, which wipes its DOM anyway.
      prefill,
      prefillBanner,
      lensPrice: lensPriceBBD,
      onBranchChange: (branchId: string) => { setSelectedAccountId(Number(branchId) || null); },
      onDraftSaved: async (payload: any) => {
        await persist(payload);
        const saved = await saveEmbeddedRxDraft.mutateAsync({ payload, id: draftIdRef.current });
        draftIdRef.current = saved.id;
      },
      // A cleared form (save-and-start-new, "clear all", "discard draft")
      // isn't the draft it used to be — the next save should create its own
      // row rather than overwrite the one this form no longer represents.
      onFormCleared: () => { draftIdRef.current = undefined; },
      onSubmitted: async (payload: any) => {
        const { totalBBD } = await persist(payload);
        const added = await addToCart({
          id: syntheticCartProductId(quoteId),
          name: `Rx Order ${quoteNumber ?? ""} — ${[payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ") || payload.account?.name || ""}`.trim(),
          price: totalBBD,
          productType: "lens",
          priceUnit: "job",
          variantMetadata: { rx_quote_id: quoteId, kind: "rx_order" },
          quantity: 1,
        });
        if (!added) throw new Error("The order could not be added to the cart.");
      },
      canSubmitDirect: allowDirectSubmit,
      // Bypasses the cart entirely: one order_item carrying rx_quote_id, which
      // is what the order_items enqueue trigger watches to hand the job to the
      // lab. The customer's existing cart is left exactly as it was.
      onSubmittedDirect: async (payload: any) => {
        const { totalBBD } = await persist(payload);
        const { data, error } = await (supabase.rpc as any)("place_rx_order_direct", {
          p_items: [{
            product_id: syntheticCartProductId(quoteId),
            product_name: `Rx Order ${quoteNumber ?? ""} — ${[payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ") || payload.account?.name || ""}`.trim(),
            product_price: totalBBD,
            product_type: "lens",
            quantity: 1,
            variant_metadata: { rx_quote_id: quoteId, kind: "rx_order" },
          }],
          p_checkout: {
            checkout_method: "on_account",
            shipping_amount: 0,
          },
        });
        if (error) throw new Error(error.message);
        if (!data) throw new Error("The order could not be placed.");
      },
      // "Duplicate this order" — a genuinely new quote carrying the same
      // payload, always via the cart (never onSubmittedDirect) so the
      // customer can still adjust the copy before it commits, matching the
      // modal's own "adjust the copy in the cart" description.
      onDuplicate: async (payload: any) => {
        const { data: original, error: origErr } = await (supabase.from("quotes") as any)
          .select("account_id, customer_name, contact_name, currency")
          .eq("id", quoteId).single();
        if (origErr) throw origErr;
        const { data: newQuote, error: qErr } = await (supabase.from("quotes") as any)
          .insert({
            quote_type: "RX",
            account_id: original?.account_id ?? null,
            customer_name: original?.customer_name ?? null,
            contact_name: original?.contact_name ?? null,
            currency: original?.currency ?? currency,
            status: "Accepted",
          })
          .select("id").single();
        if (qErr) throw qErr;
        const { totalBBD } = await persistTo(newQuote.id, payload);
        const added = await addToCart({
          id: syntheticCartProductId(newQuote.id),
          name: `Rx Order (copy) — ${[payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ") || payload.account?.name || ""}`.trim(),
          price: totalBBD,
          productType: "lens",
          priceUnit: "job",
          variantMetadata: { rx_quote_id: newQuote.id, kind: "rx_order" },
          quantity: 1,
        });
        if (!added) throw new Error("The duplicate could not be added to the cart.");
      },
      onCheckout: () => navigate(checkoutPath),
      onStore: () => navigate(storePath),
      onAnother: onStartAnother,
      // Kept live by the effect below — clicking "save draft" on a form
      // nobody touched sends the customer to their existing drafts instead.
      hasSavedDrafts,
      onGoToDrafts: () => navigate("/profile/drafts"),
    };
    adapterOptionsRef.current = adapterOptions;
    const engine = createRxOrderEngine(host, adapterOptions);
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

  useEffect(() => {
    if (!engineRef.current || !adapterOptionsRef.current) return;
    if (adapterOptionsRef.current.hasSavedDrafts === hasSavedDrafts) return;
    adapterOptionsRef.current.hasSavedDrafts = hasSavedDrafts;
    engineRef.current.refreshData();
  }, [hasSavedDrafts]);

  useEffect(() => {
    // Identity resolves after the first mount, so the submit button has to be
    // able to change its mind once — otherwise a credit-approved customer is
    // shown "Submit to cart" for the whole session.
    if (!engineRef.current || !adapterOptionsRef.current) return;
    if (adapterOptionsRef.current.canSubmitDirect === allowDirectSubmit) return;
    adapterOptionsRef.current.canSubmitDirect = allowDirectSubmit;
    engineRef.current.refreshData();
  }, [allowDirectSubmit]);

  return (
    <div className={`cv-rx-embed${surface === "admin" ? " admin-rx-order" : ""}`} ref={hostRef}>
      {!engineInput && (
        <div style={{ padding: "48px", textAlign: "center", fontSize: 13, color: "#667" }}>
          Loading the Rx order form…
        </div>
      )}
    </div>
  );
};

export default RxOrderEmbed;
