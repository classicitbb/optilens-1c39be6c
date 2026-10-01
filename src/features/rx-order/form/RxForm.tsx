// The React Rx order form (Phase 1b). Same public contract as RxOrderEmbed so a
// host can swap one for the other: it saves through persistPayload →
// save_rx_order (quote created on first save), submits to the cart or straight to
// the account, and honours test mode (nothing leaves the building).
//
// One scrolling page of six cards that fold into a summary once complete, a
// sticky step rail and a live quote. Everything it shows is derived by the pure
// model; this file owns only the side effects.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronsUpDown, Code2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useCartDrafts } from "@/hooks/useCartDrafts";
import { useToast } from "@/hooks/use-toast";
import { useRxDrafts, useSaveEmbeddedRxOrderDraft } from "@/features/lens-assistant/api";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { downgradeToV1 } from "../domain/payload";
import { persistPayload, savedRxPayload, syntheticCartProductId, type PersistedRxOrder } from "../embed/rx-order-adapter";
import { CoatingsCard, DeliveryCard } from "./cards/CoatingsDeliveryCards";
import { LensCard } from "./cards/LensCard";
import { FrameCard, PatientCard } from "./cards/PatientFrameCards";
import { RxCard } from "./cards/RxCard";
import type { CardProps } from "./cards/types";
import { buildOrder, firstIncomplete, SECTION_ORDER, valuesFromOrder, type SectionId } from "./model";
import { QuotePanel } from "./QuotePanel";
import { useRxCatalog, type PersistContext } from "./useRxCatalog";
import { useRxOrderForm } from "./useRxOrderForm";
import type { RxCatalog, RxFormValues } from "./types";
import { defaultValues } from "./types";

export interface RxFormProps {
  quoteId: string | null;
  onQuoteCreated?: (q: { quoteId: string; quoteNumber: string | null; rxOrderNumber: number | null }) => void;
  isTest?: boolean;
  onTestSubmitted?: (what: string, saved: { quoteId: string; quoteNumber: string | null; totalBBD: number }) => void;
  surface: "admin" | "portal";
  lockedAccountId?: number | null;
  checkoutPath?: string;
  storePath?: string;
  onStartAnother?: () => void;
  /** A saved order (v1 or v2) to replay into the form. */
  prefill?: unknown;
  prefillBanner?: string;
  resumedDraftId?: string;
  pricesVisible?: boolean;
  allowDirectSubmit?: boolean;
  blockUnpricedOrders?: boolean;
  /** Show the order payload viewer (staff tooling). */
  showPayload?: boolean;
  /**
   * Run against a fixed catalogue with no network (the dev bench): the catalogue
   * and accounts are supplied, and saving is a no-op that returns a fake quote.
   */
  fixture?: { catalog: RxCatalog; accounts: { id: number; name: string; account_number: string | null }[] };
}

const TITLES: Record<SectionId, string> = {
  patient: "Patient & order", frame: "Frame & measurements", lens: "Lens selection",
  rx: "Prescription", treat: "Coatings & treatments", notes: "Delivery & notes",
};
const NEXT_NAMES: Record<SectionId, string> = {
  patient: "Frame & measurements", frame: "Lens selection", lens: "Prescription", rx: "Coatings & treatments", treat: "Delivery & notes", notes: "",
};

function AccountPicker({
  accounts, value, onChange,
}: { accounts: { id: number; name: string; account_number: string | null }[]; value: number | null; onChange: (id: number) => void }) {
  const [open, setOpen] = useState(false);
  const current = accounts.find((a) => a.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 max-w-[260px] justify-between gap-2 text-xs" aria-label="Ordering for">
          <span className="truncate">Ordering for <b>{current?.name ?? "—"}</b></span>
          <ChevronsUpDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <Command>
          <CommandInput placeholder="Search by name or ERP account…" />
          <CommandList>
            <CommandEmpty>No accounts found</CommandEmpty>
            {accounts.map((a) => (
              <CommandItem key={a.id} value={`${a.name} ${a.account_number ?? ""}`} onSelect={() => { onChange(a.id); setOpen(false); }}>
                <Check className={cn("mr-2 h-3.5 w-3.5", a.id === value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{a.name}</span>
                {a.account_number && <span className="ml-auto text-[11px] text-muted-foreground">#{a.account_number}</span>}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const FIXTURE_CONTEXT: PersistContext = { lensIndex: new Map(), addons: [], lensPriceBBD: () => null, resolveAlias: () => null };

/** A fixed catalogue, no network: used by the dev bench. */
function FixtureForm(props: RxFormProps & { fixture: NonNullable<RxFormProps["fixture"]> }) {
  const [selected, setSelected] = useState<number | null>(props.lockedAccountId ?? props.fixture.accounts[0]?.id ?? null);
  return (
    <LoadedForm
      {...props} catalog={props.fixture.catalog} persistContext={FIXTURE_CONTEXT} accounts={props.fixture.accounts}
      accountId={selected} onAccountChange={setSelected}
    />
  );
}

/** Fixture-mode save: nothing is written; the quote total is the form's own. */
const fakeSave = async (quoteId: string | null, v1: any): Promise<PersistedRxOrder> => ({
  totalBBD: Number(v1.quote?.total ?? 0),
  quoteId: quoteId ?? "fixture-quote",
  quoteNumber: "Q-FIXTURE",
  rxOrderNumber: 80000000,
  created: quoteId == null,
});

/** Loads the catalogue, then renders the form (so saved values can be replayed against it). */
export function RxForm(props: RxFormProps) {
  return props.fixture ? <FixtureForm {...props} fixture={props.fixture} /> : <LiveForm {...props} />;
}

function LiveForm(props: RxFormProps) {
  const pricesVisible = props.pricesVisible ?? true;
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(props.lockedAccountId ?? null);
  const { catalog, persistContext, accounts, effectiveAccountId, loading } = useRxCatalog({
    lockedAccountId: props.lockedAccountId ?? null, selectedAccountId, pricesVisible, blockUnpricedOrders: props.blockUnpricedOrders,
  });
  if (loading || !catalog || !persistContext) {
    return (
      <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the Rx order form…
      </div>
    );
  }
  return (
    <LoadedForm
      {...props} catalog={catalog} persistContext={persistContext} accounts={accounts}
      accountId={effectiveAccountId} onAccountChange={setSelectedAccountId}
    />
  );
}

function LoadedForm({
  catalog, persistContext, accounts, accountId, onAccountChange, ...props
}: RxFormProps & {
  catalog: RxCatalog; persistContext: PersistContext;
  accounts: { id: number; name: string; account_number: string | null }[];
  accountId: number | null; onAccountChange: (id: number) => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const saveDraft = useSaveEmbeddedRxOrderDraft();
  const { drafts: cartDrafts } = useCartDrafts();
  const { data: rxDrafts = [] } = useRxDrafts();
  const hasSavedDrafts = props.surface === "portal" && cartDrafts.length + rxDrafts.length > 0;
  const isTest = props.isTest === true;

  const initial: RxFormValues = useMemo(() => {
    const saved = props.prefill ? (() => { try { return valuesFromOrder(props.prefill, catalog); } catch { return null; } })() : null;
    return saved ?? defaultValues(accountId);
    // initial values are read once, on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const api = useRxOrderForm({ catalog, initialValues: initial, accountId });
  const { values, derived } = api;
  const notify = useCallback((message: string) => toast({ description: message }), [toast]);

  // ── saving ────────────────────────────────────────────────────────────────
  const quoteIdRef = useRef<string | null>(props.quoteId);
  const orderNoRef = useRef<number | null>(null);
  const draftIdRef = useRef<string | undefined>(props.resumedDraftId);
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());
  const submitting = useRef(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [orderNo, setOrderNo] = useState<number | null>(null);

  const account = accounts.find((a) => a.id === accountId) ?? null;
  const order = useCallback(
    () => buildOrder(values, derived, catalog, {
      orderNo: orderNoRef.current ? String(orderNoRef.current) : null,
      account: account ? { id: account.id, name: account.name } : null,
      source: props.surface === "portal" ? "portal" : "form",
    }),
    [values, derived, catalog, account, props.surface],
  );

  const persistOnce = useCallback(async (v1: any) => {
    const saved = props.fixture
      ? await fakeSave(quoteIdRef.current, v1)
      : await persistPayload(quoteIdRef.current, v1, { ...persistContext, isTest });
    if (saved.created) {
      quoteIdRef.current = saved.quoteId;
      props.onQuoteCreated?.({ quoteId: saved.quoteId, quoteNumber: saved.quoteNumber, rxOrderNumber: saved.rxOrderNumber });
    }
    if (saved.rxOrderNumber != null) { orderNoRef.current = saved.rxOrderNumber; setOrderNo(saved.rxOrderNumber); }
    return saved;
  }, [persistContext, isTest, props]);

  // Saves run one at a time: an autosave still in flight when the person submits
  // must finish first, or both would see "no quote yet" and create one each.
  const persist = useCallback((v1: any) => {
    const run = chainRef.current.catch(() => undefined).then(() => persistOnce(v1));
    chainRef.current = run;
    return run;
  }, [persistOnce]);

  const save = useCallback(async () => {
    const v1 = downgradeToV1(order());
    const saved = await persist(v1);
    if (!isTest) {
      const row = await saveDraft.mutateAsync({ payload: v1 as any, id: draftIdRef.current });
      draftIdRef.current = row.id;
    }
    setSavedAt(new Date());
    return saved;
  }, [order, persist, isTest, saveDraft]);

  // Autosave, debounced; never on a pristine form and never blocks typing.
  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    if (api.isEmpty || submitting.current) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      try { await save(); } catch { /* the next change retries; the person is not interrupted */ } finally { setSaving(false); }
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valuesKey]);

  // ── submit ────────────────────────────────────────────────────────────────
  const [done, setDone] = useState<null | { kind: "cart" | "direct" | "test"; label: string; total: number; v1: any }>(null);
  const [payloadOpen, setPayloadOpen] = useState(false);
  const direct = props.allowDirectSubmit === true;

  const cartName = (num: string | null, v1: any) =>
    `Rx Order ${num ?? ""} — ${[v1.patient?.first, v1.patient?.last].filter(Boolean).join(" ") || v1.account?.name || ""}`.trim();

  const submit = async () => {
    if (submitting.current || !derived.canSubmit) return;
    submitting.current = true;
    try {
      const v1: any = downgradeToV1(order());
      const saved = await persist(v1);
      if (isTest) {
        const what = direct ? "Would be placed on the account and sent to the lab" : "Would be added to the cart";
        props.onTestSubmitted?.(what, { quoteId: saved.quoteId, quoteNumber: saved.quoteNumber, totalBBD: saved.totalBBD });
        setDone({ kind: "test", label: what, total: saved.totalBBD, v1 });
      } else if (direct) {
        // Bypasses the cart: one order_item carrying rx_quote_id, which the order_items
        // enqueue trigger hands to the lab. The existing cart is left exactly as it was.
        const { data, error } = await (supabase.rpc as any)("place_rx_order_direct", {
          p_items: [{
            product_id: syntheticCartProductId(saved.quoteId), product_name: cartName(saved.quoteNumber, v1),
            product_price: saved.totalBBD, product_type: "lens", quantity: 1,
            variant_metadata: { rx_quote_id: saved.quoteId, kind: "rx_order" },
          }],
          p_checkout: { checkout_method: "on_account", shipping_amount: 0 },
        });
        if (error) throw new Error(error.message);
        if (!data) throw new Error("The order could not be placed.");
        setDone({ kind: "direct", label: "Order placed on your account", total: saved.totalBBD, v1 });
      } else {
        const added = await addToCart({
          id: syntheticCartProductId(saved.quoteId), name: cartName(saved.quoteNumber, v1), price: saved.totalBBD,
          productType: "lens", priceUnit: "job", variantMetadata: { rx_quote_id: saved.quoteId, kind: "rx_order" }, quantity: 1,
        });
        if (!added) throw new Error("The order could not be added to the cart.");
        setDone({ kind: "cart", label: "Added to your cart", total: saved.totalBBD, v1 });
      }
    } catch (e: any) {
      toast({ title: "Could not submit the order", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      submitting.current = false;
    }
  };

  const duplicate = async () => {
    if (!done) return;
    try {
      // A new quote through the same atomic save (null id = create).
      const copy = props.fixture ? await fakeSave(null, done.v1) : await persistPayload(null, done.v1, { ...persistContext, isTest });
      if (!isTest) {
        const { error } = await (supabase.from("quotes") as any).update({ status: "Accepted" }).eq("id", copy.quoteId);
        if (error) throw error;
        const added = await addToCart({
          id: syntheticCartProductId(copy.quoteId), name: `Rx Order (copy) — ${cartName(null, done.v1).replace(/^Rx Order\s+—\s*/, "")}`,
          price: copy.totalBBD, productType: "lens", priceUnit: "job",
          variantMetadata: { rx_quote_id: copy.quoteId, kind: "rx_order" }, quantity: 1,
        });
        if (!added) throw new Error("The duplicate could not be added to the cart.");
      }
      notify(isTest ? "Test copy saved (not sent)" : "Duplicate added — adjust it in the cart");
    } catch (e: any) {
      toast({ title: "Could not duplicate", description: e?.message, variant: "destructive" });
    }
  };

  const onSaveDraft = async () => {
    if (hasSavedDrafts && api.isEmpty) { navigate("/profile/drafts"); return; }
    if (api.isEmpty) { notify("Nothing to save yet"); return; }
    try { await save(); notify(isTest ? "Test draft saved" : "Draft saved"); }
    catch (e: any) { toast({ title: "Could not save the draft", description: e?.message, variant: "destructive" }); }
  };

  // ── folding & disclosure ──────────────────────────────────────────────────
  const [focused, setFocused] = useState<SectionId | null>(null);
  const [editing, setEditing] = useState<ReadonlySet<SectionId>>(new Set());
  const revealAll = !!props.prefill;
  // A card only folds once the person has been in it. Coatings and delivery are
  // "complete" while still empty (no coating is a valid answer), so without this
  // they would fold the moment they appear and hide their own options. A saved
  // order reopens with every card already visited.
  const [visited, setVisited] = useState<ReadonlySet<SectionId>>(() => (props.prefill ? new Set(SECTION_ORDER) : new Set()));
  const current = firstIncomplete(derived.sections);
  const visible = (id: SectionId) => revealAll || current === null || SECTION_ORDER.indexOf(id) <= SECTION_ORDER.indexOf(current);
  const stepFor = (id: SectionId): CardProps["step"] => ({
    folded: derived.sections[id] && visited.has(id) && focused !== id && !editing.has(id),
    edit: () => { setEditing((s) => new Set(s).add(id)); setFocused(id); },
  });
  const onFocusSection = (id: SectionId) => {
    setFocused(id);
    setVisited((s) => (s.has(id) ? s : new Set(s).add(id)));
    setEditing((s) => (s.size && !(s.size === 1 && s.has(id)) ? new Set([...s].filter((x) => x === id)) : s));
  };
  const go = (id: SectionId) => document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const cardProps = (id: SectionId): CardProps => ({ api, catalog, notify, step: stepFor(id) });
  const cards: Record<SectionId, ReactElement> = {
    patient: <PatientCard {...cardProps("patient")} />,
    frame: <FrameCard {...cardProps("frame")} />,
    lens: <LensCard {...cardProps("lens")} />,
    rx: <RxCard {...cardProps("rx")} />,
    treat: <CoatingsCard {...cardProps("treat")} />,
    notes: <DeliveryCard {...cardProps("notes")} />,
  };

  const submitLabel = direct ? "Place order now" : "Submit to cart";
  const submitDisabled = !derived.canSubmit || submitting.current;
  const locked = props.lockedAccountId != null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 lg:pb-8" data-testid="rx-form">
      {isTest && (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950" role="status">
          <b>Test order.</b> Saves are tagged as test and nothing goes to the cart, an account or a lab.
        </div>
      )}
      {props.prefill && props.prefillBanner && (
        // hosts pass a sentence with <b> tags for the old engine; show it as text
        <div className="mb-3 rounded-md border bg-muted/40 px-3 py-2 text-xs">{props.prefillBanner.replace(/<[^>]+>/g, "")}</div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="text-base font-semibold">Rx order</h1>
        <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground" aria-label="Order number">
          Order <b className="text-foreground">{orderNo ?? "—"}</b>
        </span>
        <span className="text-[11px] text-muted-foreground" role="status" aria-live="polite">
          {saving ? "Saving…" : savedAt ? `Saved · ${savedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {props.showPayload && (
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => setPayloadOpen(true)}>
              <Code2 className="h-3.5 w-3.5" /> Payload
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onSaveDraft}>
            {hasSavedDrafts && api.isEmpty ? "Go to saved drafts" : "Save draft"}
          </Button>
          {locked ? (
            <span className="rounded-md border px-2 py-1 text-xs">Ordering for <b>{account?.name ?? "—"}</b></span>
          ) : (
            <AccountPicker accounts={accounts} value={accountId} onChange={onAccountChange} />
          )}
        </div>
      </div>

      <nav aria-label="Order steps" className="sticky top-0 z-20 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b bg-background/95 px-4 py-2 backdrop-blur">
        {SECTION_ORDER.map((id, i) => {
          const reachable = visible(id);
          return (
            <button
              key={id} type="button" disabled={!reachable} onClick={() => go(id)}
              aria-current={current === id ? "step" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs",
                derived.sections[id] && reachable ? "border-emerald-600/40 text-emerald-800 dark:text-emerald-300" : "text-muted-foreground",
                current === id && "border-primary text-foreground",
                !reachable && "opacity-40",
              )}
            >
              <span className="font-semibold">{derived.sections[id] && reachable ? "✓" : i + 1}</span>{TITLES[id]}
            </button>
          );
        })}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {SECTION_ORDER.filter(visible).map((id) => (
            <div key={id} onFocusCapture={() => onFocusSection(id)}>{cards[id]}</div>
          ))}
          {!revealAll && current && current !== "notes" && (
            <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-xs text-muted-foreground">
              🔒 Finish <b>{TITLES[current]}</b> and <b>{NEXT_NAMES[current]}</b> opens next.
            </p>
          )}

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={submitDisabled} onClick={submit} title={derived.blockedReason ?? undefined}>{submitLabel}</Button>
              <Button type="button" variant="outline" onClick={onSaveDraft}>Save as draft</Button>
            </div>
            {direct && (
              <p className="mt-3 text-[11px] text-muted-foreground">
                Your account is credit-approved — this order goes straight to the lab and is billed to your account. Nothing else to check out.
              </p>
            )}
            {derived.blockedReason && <p className="mt-2 text-[11px] text-muted-foreground">{derived.blockedReason}</p>}
            <p className="mt-2 text-[11px] text-muted-foreground">Incomplete orders can only be saved as drafts. Drafts are resumable.</p>
          </div>
        </div>

        <QuotePanel
          derived={derived} catalog={catalog} eyes={values.job.eyes} onGo={go}
          onRemoveCoating={api.removeCoating} onRemoveAssistance={api.removeAssistance}
        />
      </div>

      {/* phone: total + submit pinned to the bottom */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1 text-xs">
          <span className="block text-muted-foreground">{catalog.pricesVisible ? "order total" : "Pricing not shown on this account"}</span>
          {catalog.pricesVisible && <b className="text-sm tabular-nums">BBD $ {derived.price.unpriced ? "on request" : derived.price.sub.toFixed(2)}</b>}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onSaveDraft}>Draft</Button>
        <Button type="button" size="sm" disabled={submitDisabled} onClick={submit}>{submitLabel}</Button>
      </div>

      <Dialog open={!!done} onOpenChange={(o) => { if (!o) setDone(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{done?.label}</DialogTitle>
            <DialogDescription>
              {done?.kind === "test"
                ? "Nothing was sent. The test order is saved so you can look at it."
                : done?.kind === "cart" ? "Price is now locked at this quote and will be honoured through checkout." : "The lab has the order."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {done?.kind === "cart" && (
              <Button onClick={() => navigate(props.checkoutPath ?? "/checkout")}>Checkout now</Button>
            )}
            <Button variant="outline" onClick={duplicate}>Duplicate this order</Button>
            <Button variant="outline" onClick={() => { setDone(null); props.onStartAnother?.(); }}>Start another Rx order</Button>
            {!isTest && <Button variant="ghost" onClick={() => navigate(props.storePath ?? "/store")}>Continue shopping</Button>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payloadOpen} onOpenChange={setPayloadOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order payload</DialogTitle>
            <DialogDescription>cv.rxorder/2 — what this form would save.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-[11px]">{JSON.stringify(payloadOpen ? order() : null, null, 2)}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { savedRxPayload };
export default RxForm;
