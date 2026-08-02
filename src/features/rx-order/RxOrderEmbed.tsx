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
import { usePricelistScope } from "./hooks/useOrderableCatalog";
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
}

interface ClashRule { addon_id_a: string; addon_id_b: string; reason: string }

// Hosts the ported prototype form. The engine owns the DOM inside the
// .cv-rx-embed container; React only mounts/unmounts it and feeds adapters.
export const RxOrderEmbed = ({
  quoteId, quoteNumber, surface, lockedAccountId = null,
  checkoutPath = "/checkout", storePath = "/store",
}: RxOrderEmbedProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const hostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);
  const engineDataRef = useRef<any>(null);
  const lensIndexRef = useRef<Map<string, LensRef>>(new Map());
  const [hasMountedEngine, setHasMountedEngine] = useState(false);
  const { data: lenses = [], isLoading: lensesLoading } = useLenses();
  const { data: addons = [], isLoading: addonsLoading } = useAddons();
  const { data: accounts = [], isLoading: accountsLoading } = useCustomerAccounts();
  const { addToCart } = useCart();
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
  const ready = !lensesLoading && !addonsLoading && !accountsLoading
    && (hasMountedEngine || effectiveAccountId == null || (scopeIsCurrent && !scopeLoading));

  const engineInput = useMemo(() => {
    if (!ready) return null;
    const activeLenses = lenses.filter((l) => l.is_active && l.show_on_website && (l.sell_price > 0 || l.base_price > 0));
    const activeAddons = addons.filter((a) => a.is_active && a.show_on_website);
    const scopedLenses = scopeIsCurrent && scope?.hasLensRows
      ? activeLenses.filter((l) => scope.lensIds.has(l.id))
      : activeLenses;
    const scopedAddons = scopeIsCurrent && scope?.hasAddonRows
      ? activeAddons.filter((a) => scope.addonIds.has(a.id))
      : activeAddons;
    const scopedAccounts = lockedAccountId != null ? accounts.filter((a) => a.id === lockedAccountId) : accounts;
    return buildEngineData({
      lenses: scopedLenses,
      addons: scopedAddons,
      clashRules,
      accounts: scopedAccounts,
      addonPriceFor: (id, fallback) => scope?.priceByItemId?.get?.(id) ?? fallback,
    });
  }, [ready, lenses, addons, accounts, clashRules, lockedAccountId, scope, scopeIsCurrent]);

  useEffect(() => {
    // Settings gear (prototype/account-simulation controls) is admin-only.
    hostRef.current?.classList.toggle("no-gear", !isAdmin);
  }, [isAdmin]);

  useEffect(() => {
    // Portal surface sits under the site's fixed Header; admin surface
    // scrolls inside AdminLayout's own container, below its top bar.
    hostRef.current?.classList.toggle("has-fixed-header", surface === "portal");
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
    const { data, lensIndex } = engineInput;
    engineDataRef.current = data;
    lensIndexRef.current = lensIndex;
    const lensPriceBBD = (m: string, d: string, c: string): number | null => {
      const ref: LensRef | undefined = lensIndexRef.current.get(`${m}|${d}|${c}`);
      if (!ref) return null;
      return scopeRef.current?.priceByItemId?.get?.(ref.lensId) ?? ref.listPrice;
    };
    const persist = async (payload: any) => persistPayload(quoteId, payload, {
      lensIndex: lensIndexRef.current,
      addons,
      lensPriceBBD,
    });

    hostRef.current.innerHTML = markup;
    const engine = createRxOrderEngine(hostRef.current, {
      data: engineDataRef.current,
      lockedBranchId: lockedAccountId != null ? String(lockedAccountId) : undefined,
      defaultBranchId: defaultAccountId != null ? String(defaultAccountId) : undefined,
      orderNo: () => quoteNumber || undefined,
      lensPrice: lensPriceBBD,
      onBranchChange: (branchId: string) => { setSelectedAccountId(Number(branchId) || null); },
      onDraftSaved: (payload: any) => {
        persist(payload).catch((e: any) => toast({ title: "Draft not fully saved to the cloud", description: e.message, variant: "destructive" }));
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
