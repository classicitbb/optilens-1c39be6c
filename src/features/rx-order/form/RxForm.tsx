// The React Rx order form (Phase 1b). Same public contract as RxOrderEmbed so a
// host can swap one for the other: it saves through persistPayload →
// save_rx_order (quote created on first save), submits to the cart or straight to
// the account, and honours test mode (nothing leaves the building).
//
// One scrolling page of six cards that fold into a summary once complete, a
// sticky step rail and a live quote. Everything it shows is derived by the pure
// model; this file owns only the side effects.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Check, ChevronsUpDown, Code2, Loader2, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useCartDrafts } from "@/hooks/useCartDrafts";
import { useToast } from "@/hooks/use-toast";
import { captureJobs } from "@/features/rx-capture/api";
import { useDeleteRxDraft, useRxDrafts, useSaveEmbeddedRxOrderDraft } from "@/features/lens-assistant/api";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { downgradeToV1 } from "../domain/payload";
import { advanceFrom } from "./focus";
import { persistPayload, savedRxPayload, syntheticCartProductId, type PersistedRxOrder } from "../embed/rx-order-adapter";
import { CoatingsCard, DeliveryCard } from "./cards/CoatingsDeliveryCards";
import { LensCard } from "./cards/LensCard";
import { FrameCard, PatientCard } from "./cards/PatientFrameCards";
import { RxCard } from "./cards/RxCard";
import type { CardProps } from "./cards/types";
import { buildOrder, firstIncomplete, SECTION_ORDER, valuesFromOrder, type SectionId } from "./model";
import { FillFromPhoto } from "./FillFromPhoto";
import { FlagBanner } from "./FlagBanner";
import { PrintSheet } from "./PrintSheet";
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
  /** Where "Continue shopping" goes: this surface's own Rx order form. */
  formPath?: string;
  onStartAnother?: () => void;
  /** A saved order (v1 or v2) to replay into the form. */
  prefill?: unknown;
  prefillBanner?: string;
  resumedDraftId?: string;
  pricesVisible?: boolean;
  allowDirectSubmit?: boolean;
  /** Opened from the cart's edit pencil: saving updates that cart item (and its price) instead of adding another. */
  editFromCart?: boolean;
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
  const deleteDraft = useDeleteRxDraft();
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
  // Set once the order is in the cart / placed: it is no longer a draft, so a pending autosave must not recreate one.
  const carted = useRef(false);
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

  // The picture a form was filled from stays attached to the order it became.
  const captureJobRef = useRef<string | null>(null);
  const linkCapture = () => {
    if (captureJobRef.current && quoteIdRef.current) void captureJobs().update({ quote_id: quoteIdRef.current }).eq("id", captureJobRef.current);
  };

  const persistOnce = useCallback(async (v1: any) => {
    const saved = props.fixture
      ? await fakeSave(quoteIdRef.current, v1)
      : await persistPayload(quoteIdRef.current, v1, { ...persistContext, isTest });
    if (saved.created) {
      quoteIdRef.current = saved.quoteId;
      linkCapture();
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
      // quoteId ties the draft to its quote, so resuming it (e.g. after it was removed from the cart) re-saves that same order.
      const row = await saveDraft.mutateAsync({ payload: { ...v1, quoteId: quoteIdRef.current } as any, id: draftIdRef.current });
      draftIdRef.current = row.id;
    }
    setSavedAt(new Date());
    return saved;
  }, [order, persist, isTest, saveDraft]);

  // Autosave, debounced; never on a pristine form and never blocks typing.
  const valuesKey = JSON.stringify(values);
  useEffect(() => {
    carted.current = false;
    if (api.isEmpty || submitting.current) return;
    const timer = setTimeout(async () => {
      if (carted.current) return;
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

  // An order in the cart (or placed) leaves the drafts list; removing it from the cart brings it back as a draft.
  const retireDraft = async () => {
    carted.current = true;
    const id = draftIdRef.current;
    draftIdRef.current = undefined;
    if (!id) return;
    try { await deleteDraft.mutateAsync(id); } catch { /* a stale draft row is harmless */ }
  };

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
        await retireDraft();
        setDone({ kind: "direct", label: "Order placed on your account", total: saved.totalBBD, v1 });
      } else if (props.editFromCart && await updateCartItem(saved, v1)) {
        // handled: the existing cart item now carries the re-saved order and its current price
      } else {
        const added = await addToCart({
          id: syntheticCartProductId(saved.quoteId), name: cartName(saved.quoteNumber, v1), price: saved.totalBBD,
          productType: "lens", priceUnit: "job", variantMetadata: { rx_quote_id: saved.quoteId, kind: "rx_order" }, quantity: 1,
        });
        if (!added) throw new Error("The order could not be added to the cart.");
        await retireDraft();
        setDone({ kind: "cart", label: "Added to your cart", total: saved.totalBBD, v1 });
      }
    } catch (e: any) {
      toast({ title: "Could not submit the order", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      submitting.current = false;
    }
  };

  // Editing from the cart: the cart item's price was locked when it went in. Re-saving reprices the
  // order, so the cart item follows it and the customer is told if the price moved.
  const updateCartItem = async (saved: PersistedRxOrder, v1: any): Promise<boolean> => {
    const productId = syntheticCartProductId(saved.quoteId);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return false;
    const { data: row } = await (supabase.from("cart_items") as any)
      .select("id, product_price").eq("user_id", auth.user.id).eq("product_id", productId).maybeSingle();
    if (!row) return false;
    const { error } = await (supabase.from("cart_items") as any)
      .update({ product_price: saved.totalBBD, product_name: cartName(saved.quoteNumber, v1) }).eq("id", row.id);
    if (error) throw new Error(error.message);
    const was = Number(row.product_price);
    if (Math.abs(was - saved.totalBBD) > 0.004) {
      toast({ title: "The price changed", description: `This order was $${was.toFixed(2)} in your cart and is now $${saved.totalBBD.toFixed(2)}.` });
    }
    await retireDraft();
    setDone({ kind: "cart", label: "Cart updated", total: saved.totalBBD, v1 });
    return true;
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

  // Save, then print the order sheet. The sheet is mounted just for the print; the body
  // class makes it the only thing the print stylesheet shows (index.css).
  const [printing, setPrinting] = useState(false);
  const onPrint = async () => {
    try { await save(); }
    catch (e: any) { toast({ title: "Could not save before printing", description: e?.message, variant: "destructive" }); return; }
    setPrinting(true);
  };
  // The sheet only exists in the page while it is being printed.
  useEffect(() => {
    if (!printing) return;
    const clear = () => { document.body.classList.remove("rx-printing"); setPrinting(false); };
    window.addEventListener("afterprint", clear, { once: true });
    document.body.classList.add("rx-printing");
    window.print();
    return () => { window.removeEventListener("afterprint", clear); document.body.classList.remove("rx-printing"); };
  }, [printing]);

  const onSaveDraft = async () => {
    if (hasSavedDrafts && api.isEmpty) { navigate("/profile/drafts"); return; }
    if (api.isEmpty) { notify("Nothing to save yet"); return; }
    try { await save(); notify(isTest ? "Test draft saved" : "Draft saved"); }
    catch (e: any) { toast({ title: "Could not save the draft", description: e?.message, variant: "destructive" }); }
  };

  const onDiscardDraft = async () => {
    if (!window.confirm("Discard this draft and clear the form?")) return;
    try {
      if (draftIdRef.current) await deleteDraft.mutateAsync(draftIdRef.current);
      draftIdRef.current = undefined;
      api.reset();
      setSavedAt(null);
      notify("Draft discarded");
    } catch (e: any) { toast({ title: "Could not discard the draft", description: e?.message, variant: "destructive" }); }
  };

  // ── folding & disclosure ──────────────────────────────────────────────────
  const [focused, setFocused] = useState<SectionId | null>(null);
  const [editing, setEditing] = useState<ReadonlySet<SectionId>>(new Set());
  const [filled, setFilled] = useState(false);
  const revealAll = !!props.prefill || filled;
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
  // ── Enter advances through the fields ──────────────────────────────────────
  // Text fields and native selects move on at Enter. A Radix dropdown (mount,
  // service level…) opens on Enter and picks an option on Enter; once the pick
  // has returned focus to its trigger, move on from there too.
  const lastTrigger = useRef<HTMLElement | null>(null);
  const advanceWhenFocused = (trigger: HTMLElement | null) => {
    if (!trigger) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (document.activeElement === trigger) { clearInterval(timer); advanceFrom(trigger); }
      else if (tries > 20) clearInterval(timer);
    }, 30);
  };
  const onFormFocus = (e: React.FocusEvent<HTMLElement>) => {
    const t = e.target as HTMLElement;
    if (t.matches('button[role="combobox"]')) lastTrigger.current = t;
  };
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter" || e.defaultPrevented || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    const t = e.target as HTMLElement;
    if (t.getAttribute("role") === "option") { advanceWhenFocused(lastTrigger.current); return; }
    if ((t instanceof HTMLInputElement && t.type !== "checkbox" && t.type !== "radio" && t.type !== "file" && t.type !== "button") || t instanceof HTMLSelectElement) {
      if (advanceFrom(t)) e.preventDefault();
    }
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 pt-4 lg:pb-8" data-testid="rx-form" data-rx-form onKeyDown={onFormKeyDown} onFocusCapture={onFormFocus}>
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
          {props.surface === "portal" && !props.fixture && accountId != null && (
            <FillFromPhoto
              accountId={accountId} accountName={account?.name ?? ""} hasEntries={!api.isEmpty} catalog={catalog}
              onFilled={(v, jobId) => {
                api.reset(v);
                captureJobRef.current = jobId;
                setFilled(true);
                setVisited(new Set(SECTION_ORDER));
                linkCapture();
                notify("Filled from your photo — check the highlighted fields");
              }}
              onError={(message) => toast({ title: "Could not read that picture", description: message, variant: "destructive" })}
            />
          )}
          {props.surface === "admin" && (
            <Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={api.isEmpty} onClick={onPrint}>
              <Printer className="h-3.5 w-3.5" /> Save &amp; print
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onSaveDraft}>
            {hasSavedDrafts && api.isEmpty ? "Go to saved drafts" : "Save draft"}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" disabled={api.isEmpty && !draftIdRef.current} onClick={onDiscardDraft}>
            Discard draft
          </Button>
          {locked ? (
            <span className="rounded-md border px-2 py-1 text-xs">Ordering for <b>{account?.name ?? "—"}</b></span>
          ) : (
            <AccountPicker accounts={accounts} value={accountId} onChange={onAccountChange} />
          )}
        </div>
      </div>

      <FlagBanner flags={values.flags} onConfirm={api.confirmFlag} onConfirmAll={api.confirmAllFlags} />

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
            {!isTest && <Button variant="ghost" onClick={() => { setDone(null); props.onStartAnother?.(); navigate(props.formPath ?? (props.surface === "admin" ? "/admin/orders/rx/new" : "/profile/rx-order"), { replace: true }); }}>Continue shopping</Button>}
          </div>
        </DialogContent>
      </Dialog>

      {printing && createPortal(
        <PrintSheet values={values} derived={derived} catalog={catalog} orderNo={orderNo} accountName={account?.name ?? null} />,
        document.body,
      )}

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
