import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLenses } from "@/hooks/useLenses";
import { useAddons } from "@/hooks/useAddons";
import { useCustomerAccounts } from "@/hooks/useCustomerAccounts";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
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
  const { data: lenses = [], isLoading: lensesLoading } = useLenses();
  const { data: addons = [], isLoading: addonsLoading } = useAddons();
  const { data: accounts = [], isLoading: accountsLoading } = useCustomerAccounts();
  const { addToCart } = useCart();

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
  const { data: scope } = usePricelistScope(selectedAccountId);
  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const ready = !lensesLoading && !addonsLoading && !accountsLoading;

  const engineInput = useMemo(() => {
    if (!ready) return null;
    const activeLenses = lenses.filter((l) => l.is_active && l.show_on_website && (l.sell_price > 0 || l.base_price > 0));
    const activeAddons = addons.filter((a) => a.is_active && a.show_on_website);
    const scopedAccounts = lockedAccountId != null ? accounts.filter((a) => a.id === lockedAccountId) : accounts;
    return buildEngineData({
      lenses: activeLenses,
      addons: activeAddons,
      clashRules,
      accounts: scopedAccounts,
      addonPriceFor: (id, fallback) => scopeRef.current?.priceByItemId?.get?.(id) ?? fallback,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, lenses, addons, accounts, clashRules, lockedAccountId]);

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
    const lensPriceBBD = (m: string, d: string, c: string): number | null => {
      const ref: LensRef | undefined = lensIndex.get(`${m}|${d}|${c}`);
      if (!ref) return null;
      return scopeRef.current?.priceByItemId?.get?.(ref.lensId) ?? ref.listPrice;
    };
    const persist = async (payload: any) => persistPayload(quoteId, payload, {
      lensIndex,
      addons,
      lensPriceBBD,
    });

    hostRef.current.innerHTML = markup;
    const engine = createRxOrderEngine(hostRef.current, {
      data,
      lockedBranchId: lockedAccountId != null ? String(lockedAccountId) : undefined,
      orderNo: () => quoteNumber || undefined,
      lensPrice: lensPriceBBD,
      onBranchChange: (branchId: string) => { setSelectedAccountId(Number(branchId) || null); },
      onDraftSaved: (payload: any) => {
        persist(payload).catch((e: any) => toast({ title: "Draft not fully saved to the cloud", description: e.message, variant: "destructive" }));
      },
      onSubmitted: (payload: any) => {
        (async () => {
          const { totalBBD } = await persist(payload);
          await addToCart({
            id: syntheticCartProductId(quoteId),
            name: `Rx Order ${quoteNumber ?? ""} — ${[payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ") || payload.account?.name || ""}`.trim(),
            price: totalBBD,
            productType: "lens",
            variantMetadata: { rx_quote_id: quoteId, kind: "rx_order" },
            quantity: 1,
          });
        })().catch((e: any) => toast({ title: "Order saved locally but cart update failed", description: e.message, variant: "destructive" }));
      },
      onCheckout: () => navigate(checkoutPath),
      onStore: () => navigate(storePath),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
      if (hostRef.current) hostRef.current.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineInput, quoteId]);

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
