import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useQuoteLines, useQuoteFrameDetails, useQuotes, computeLineProfit, QuoteLine,
} from "@/hooks/useQuotes";
import { useCustomerAccounts } from "@/hooks/useCustomerAccounts";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useOrderableCatalog } from "./hooks/useOrderableCatalog";
import { useLensColours } from "./hooks/useLensAliases";
import { PrescriptionSection } from "./PrescriptionSection";
import { RxOrderFormProps } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  User, Square, Glasses, ClipboardList, Plus, ShoppingCart, Printer,
  ChevronRight, ChevronDown, CheckCircle2, Trash2, AlertTriangle, HandHelping,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Shared Rx Order Form engine ─────────────────────────────────────────────
// One engine, two surfaces (see types.ts). Persists as-you-go to the same
// quotes/quote_lines/rx_details/quote_frame_details tables the admin
// Quotations module already uses, so a form order IS a quote — printable,
// cart-able, and (once paid) submittable to Innovations via the outbox.

const STEPS = [
  { id: "account", label: "Account & Order", icon: User },
  { id: "frame", label: "Frame", icon: Square },
  { id: "lens", label: "Lens", icon: Glasses },
  { id: "prescription", label: "Prescription", icon: ClipboardList },
  { id: "addons", label: "Coatings & Add-ons", icon: Plus },
  { id: "review", label: "Review", icon: CheckCircle2 },
] as const;
type StepId = typeof STEPS[number]["id"];

// Deterministic negative int from the quote id — used as the synthetic cart
// product_id so distinct Rx orders never collide on the cart's unique index
// (user_id, product_type, product_id, variant). Negative = clearly not a real
// store product id.
const syntheticCartProductId = (quoteId: string) => {
  let h = 5381;
  for (let i = 0; i < quoteId.length; i++) h = ((h << 5) + h + quoteId.charCodeAt(i)) | 0;
  return -Math.abs(h || 1);
};

interface ClashRule { addon_id_a: string; addon_id_b: string; reason: string }

const useQuoteRecord = (quoteId: string) =>
  useQuery({
    queryKey: ["rx-order-quote", quoteId],
    queryFn: async () => {
      const { data, error } = await (supabase.from("quotes") as any)
        .select("*").eq("id", quoteId).single();
      if (error) throw error;
      return data;
    },
  });

const useClashRules = () =>
  useQuery<ClashRule[]>({
    queryKey: ["addon-clash-rules"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("addon_clash_rules") as any)
        .select("addon_id_a, addon_id_b, reason");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const RxOrderForm = ({ quoteId, surface, account, actions }: RxOrderFormProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: quote, refetch: refetchQuote } = useQuoteRecord(quoteId);
  const { updateMutation } = useQuotes();
  const { data: lines = [], addLineMutation, updateLineMutation, deleteLineMutation } = useQuoteLines(quoteId, {
    customerSafe: surface !== "admin",
  });
  const { data: frame, upsertMutation: upsertFrame } = useQuoteFrameDetails(quoteId);
  const { data: customerAccounts = [] } = useCustomerAccounts();
  const { data: clashRules = [] } = useClashRules();
  const { addToCart } = useCart();

  const accountId: number | null = account.locked ? account.accountId : (quote?.account_id ?? null);
  const catalog = useOrderableCatalog(accountId);

  const { data: mftypes = [] } = useReferenceData("mftypes");
  const { data: materials = [] } = useReferenceData("materials");
  const { data: lenstypes = [] } = useReferenceData("lenstypes");

  const [step, setStep] = useState<StepId>("account");
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [patientName, setPatientName] = useState("");
  const [pickMaterial, setPickMaterial] = useState<string | null>(null);
  const [pickDesign, setPickDesign] = useState<string | null>(null); // `${mftype_id}|${lenstype_id}`
  const [lensSearch, setLensSearch] = useState("");

  const jobScope = frame?.job_scope ?? "full_glaze";
  const lensLines = lines.filter((l) => l.line_type === "Lens");
  const addonLines = lines.filter((l) => l.line_type === "AddOn" || l.line_type === "Supply");
  const hasLens = lensLines.length > 0;
  const activeLensLine = lensLines[0] ?? null;
  const { data: colours = [] } = useLensColours(activeLensLine?.product_id ?? null);

  const updateQuote = (updates: Record<string, unknown>) =>
    updateMutation.mutate({ id: quoteId, updates: updates as any }, { onSuccess: () => refetchQuote() });

  // ── Guided lens picker derivations ────────────────────────────────────────
  const materialOptions = useMemo(() => {
    const ids = new Set(catalog.lenses.map((l) => l.material_id));
    return (materials as any[]).filter((m) => ids.has(m.id));
  }, [catalog.lenses, materials]);

  const designOptions = useMemo(() => {
    if (!pickMaterial) return [];
    const combos = new Map<string, { mftype: string; lenstype: string }>();
    for (const l of catalog.lenses) {
      if (l.material_id !== pickMaterial) continue;
      const key = `${l.mftype_id}|${l.lenstype_id}`;
      if (!combos.has(key)) {
        combos.set(key, {
          mftype: (mftypes as any[]).find((m) => m.id === l.mftype_id)?.name ?? "—",
          lenstype: (lenstypes as any[]).find((m) => m.id === l.lenstype_id)?.name ?? "—",
        });
      }
    }
    return [...combos.entries()].map(([key, v]) => ({ key, ...v }));
  }, [catalog.lenses, pickMaterial, mftypes, lenstypes]);

  const lensChoices = useMemo(() => {
    let out = catalog.lenses;
    if (pickMaterial) out = out.filter((l) => l.material_id === pickMaterial);
    if (pickDesign) {
      const [mf, lt] = pickDesign.split("|");
      out = out.filter((l) => l.mftype_id === mf && l.lenstype_id === lt);
    }
    if (lensSearch) out = out.filter((l) => l.name.toLowerCase().includes(lensSearch.toLowerCase()));
    return out;
  }, [catalog.lenses, pickMaterial, pickDesign, lensSearch]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const selectLens = (lens: (typeof catalog.lenses)[number]) => {
    const sell = catalog.priceFor(lens.id, lens.sell_price);
    const profit = computeLineProfit(sell, lens.base_price, 1, "RX");
    addLineMutation.mutate({
      quote_id: quoteId, line_type: "Lens", product_id: lens.id, sku: "",
      item_name: lens.name, qty: 1,
      unit_cost_landed_bbd: lens.base_price, unit_base_price_bbd: sell, unit_sell_price_bbd: sell,
      threshold_percent: 48, ...profit, sort_order: lines.length,
    } as any, {
      onSuccess: () => { toast({ title: "Lens selected", description: lens.name }); },
    });
  };

  const setColour = (line: QuoteLine, alias: string | null) =>
    updateLineMutation.mutate({ id: line.id, updates: { innovations_alias: alias } as any });

  const clashFor = (addonId: string): { with: QuoteLine; reason: string } | null => {
    for (const l of addonLines) {
      const rule = clashRules.find(
        (r) => (r.addon_id_a === addonId && r.addon_id_b === l.product_id) ||
               (r.addon_id_b === addonId && r.addon_id_a === l.product_id),
      );
      if (rule) return { with: l, reason: rule.reason };
    }
    return null;
  };

  const toggleAddon = (addon: (typeof catalog.addons)[number]) => {
    const existing = addonLines.find((l) => l.product_id === addon.id);
    if (existing) { deleteLineMutation.mutate(existing.id); return; }
    const clash = clashFor(addon.id);
    if (clash) {
      toast({ title: "Incompatible combination", description: `${addon.name} + ${clash.with.item_name}: ${clash.reason}`, variant: "destructive" });
      return;
    }
    const sell = catalog.priceFor(addon.id, addon.price);
    const profit = computeLineProfit(sell, addon.cost, 1, "RX");
    addLineMutation.mutate({
      quote_id: quoteId, line_type: "AddOn", product_id: addon.id, sku: addon.sku ?? "",
      item_name: addon.name, qty: 1,
      unit_cost_landed_bbd: addon.cost, unit_base_price_bbd: sell, unit_sell_price_bbd: sell,
      threshold_percent: 48, ...profit, sort_order: lines.length,
    } as any);
  };

  const subtotal = lines.reduce((s, l) => s + l.qty * l.unit_sell_price_bbd, 0);

  const handleAddToCart = async () => {
    if (!user) { toast({ title: "Sign in required", variant: "destructive" }); return; }
    await addToCart({
      id: syntheticCartProductId(quoteId),
      name: `Rx Order ${quote?.quote_number ?? ""} — ${quote?.customer_name ?? ""}`.trim(),
      price: Math.round(subtotal * 100) / 100,
      productType: "lens",
      priceUnit: "job",
      variantMetadata: { rx_quote_id: quoteId, kind: "rx_order" },
      quantity: 1,
    });
    updateQuote({ status: "Accepted" });
    navigate("/cart");
  };

  const stepVisible = (s: StepId) => (s === "frame" ? jobScope === "full_glaze" : true);
  const stepAvailable: Record<StepId, boolean> = {
    account: true,
    frame: !!quote?.customer_name,
    lens: !!quote?.customer_name,
    prescription: hasLens,
    addons: hasLens,
    review: hasLens,
  };
  const stepComplete: Record<StepId, boolean> = {
    account: !!quote?.customer_name && accountId != null,
    frame: jobScope === "surface_only" || !!frame?.brand || !!frame?.is_uncut,
    lens: hasLens,
    prescription: hasLens,
    addons: true,
    review: false,
  };

  if (!quote) return <div className="text-xs text-muted-foreground p-6">Loading order…</div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Step nav */}
      <div className="flex items-center gap-0 border-b border-border pb-3 flex-wrap">
        {STEPS.filter((s) => stepVisible(s.id)).map((s, i, arr) => {
          const Icon = s.icon;
          const avail = stepAvailable[s.id];
          return (
            <div key={s.id} className="flex items-center">
              <button
                disabled={!avail}
                onClick={() => avail && setStep(s.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                  step === s.id ? "bg-primary text-primary-foreground"
                    : avail ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                    : "text-muted-foreground/40 cursor-not-allowed",
                )}
              >
                <span className={cn(
                  "flex items-center justify-center h-6 w-6 rounded-full border text-[10px] font-bold",
                  step === s.id ? "bg-primary text-primary-foreground border-primary"
                    : stepComplete[s.id] ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-background text-muted-foreground border-border",
                )}>
                  {stepComplete[s.id] && step !== s.id ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                </span>
                {s.label}
              </button>
              {i < arr.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-1" />}
            </div>
          );
        })}
        <div className="ml-auto text-xs text-muted-foreground">
          {catalog.pricelistName
            ? <>Priced from <span className="font-medium text-foreground">{catalog.pricelistName}</span></>
            : accountId == null ? "Select an account to price this order" : null}
        </div>
      </div>

      {/* ── Account & Order ── */}
      {step === "account" && (
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-foreground">Account & Order</h2>
          {!account.locked && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">ERP Account *</label>
              <Popover open={accountPickerOpen} onOpenChange={setAccountPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-8 w-full justify-between text-xs font-normal">
                    {accountId != null
                      ? (() => { const a = customerAccounts.find((x) => x.id === accountId); return a ? `${a.name}${a.account_number ? ` · ${a.account_number}` : ""}` : `Account #${accountId}`; })()
                      : "Place order on behalf of…"}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[340px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search accounts by name or #…" className="h-8 text-xs" />
                    <CommandList>
                      <CommandEmpty className="py-3 text-xs text-muted-foreground text-center">No account found.</CommandEmpty>
                      <CommandGroup>
                        {customerAccounts.map((acc) => (
                          <CommandItem
                            key={acc.id}
                            value={`${acc.name} ${acc.account_number ?? ""}`}
                            className="text-xs"
                            onSelect={() => {
                              setAccountPickerOpen(false);
                              updateQuote({ account_id: acc.id, customer_name: quote.customer_name?.trim() ? quote.customer_name : acc.name });
                            }}
                          >
                            <span className="flex-1">{acc.name}</span>
                            {acc.account_number && <span className="text-muted-foreground ml-2">{acc.account_number}</span>}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-muted-foreground mt-1">Determines which pricelist prices — and which items appear on — this order.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Customer / Practice *</label>
              <Input defaultValue={quote.customer_name ?? ""} onBlur={(e) => updateQuote({ customer_name: e.target.value })} className="h-8 text-xs" />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground block mb-1">Patient Name</label>
              <Input value={patientName || quote.contact_name || ""} onChange={(e) => setPatientName(e.target.value)} onBlur={(e) => updateQuote({ contact_name: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
            <span className="text-xs font-medium">Job scope:</span>
            {(["full_glaze", "surface_only"] as const).map((scope) => (
              <Button
                key={scope}
                size="sm"
                variant={jobScope === scope ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => upsertFrame.mutate({ quote_id: quoteId, job_scope: scope } as any)}
              >
                {scope === "full_glaze" ? "Full glaze (frame + fit)" : "Surface only (uncut lenses)"}
              </Button>
            ))}
          </div>
          <div>
            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Order Notes</label>
            <Textarea defaultValue={quote.notes_customer ?? ""} onBlur={(e) => updateQuote({ notes_customer: e.target.value })} className="text-xs min-h-[56px]" />
          </div>
          {quote.customer_name && (
            <div className="flex justify-end">
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep(jobScope === "full_glaze" ? "frame" : "lens")}>
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Frame ── */}
      {step === "frame" && jobScope === "full_glaze" && (
        <div className="space-y-4 max-w-3xl">
          <h2 className="text-sm font-semibold text-foreground">Frame Details</h2>
          <div className="grid grid-cols-3 gap-3">
            {([
              ["brand", "Frame Brand / Ref", "text"],
              ["model_colour", "Model / Colour", "text"],
              ["bridge_mm", "Bridge (mm)", "number"],
              ["a_mm", "Eye Size A (mm)", "number"],
              ["b_mm", "Eye Size B (mm)", "number"],
              ["ed_mm", "ED (mm)", "number"],
              ["dbl_mm", "DBL (mm)", "number"],
            ] as const).map(([key, label, type]) => (
              <div key={key}>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">{label}</label>
                <Input
                  type={type}
                  defaultValue={(frame as any)?.[key] ?? ""}
                  onBlur={(e) => upsertFrame.mutate({ quote_id: quoteId, job_scope: jobScope, [key]: type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value } as any)}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 p-3 rounded border border-border bg-muted/20">
            <Checkbox
              id="uncut"
              checked={!!frame?.is_uncut}
              onCheckedChange={(v) => upsertFrame.mutate({ quote_id: quoteId, job_scope: jobScope, is_uncut: !!v } as any)}
            />
            <label htmlFor="uncut" className="text-xs font-medium cursor-pointer">Uncut (no edge)</label>
            {!frame?.is_uncut && <span className="text-[11px] text-muted-foreground">Edged to frame — edging fee applies at review</span>}
          </div>
          <div className="flex justify-between">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStep("account")}>← Back</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep("lens")}>Next: Lens <ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}

      {/* ── Lens (guided picker) ── */}
      {step === "lens" && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Lens Selection</h2>
          {!catalog.pricelistHasLensRows && accountId != null && (
            <div className="flex items-center gap-2 text-[11px] px-3 py-2 rounded border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5" />
              This account's pricelist has no explicit lens rows — showing the full web catalog at list prices.
            </div>
          )}

          {lensLines.length > 0 && (
            <div className="border border-border rounded p-2 space-y-1 bg-muted/20">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Selected</div>
              {lensLines.map((l) => (
                <div key={l.id} className="flex items-center gap-2 text-xs bg-background border border-border rounded px-2 py-1.5">
                  <span className="font-medium flex-1 truncate">{l.item_name}</span>
                  {l.innovations_alias && <Badge variant="outline" className="text-[9px]">colour set</Badge>}
                  <span className="font-mono">${l.unit_sell_price_bbd.toFixed(2)}</span>
                  <button onClick={() => deleteLineMutation.mutate(l.id)} className="p-0.5 rounded hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 1. Material */}
          <div>
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">1 · Material</div>
            <div className="flex gap-1.5 flex-wrap">
              {materialOptions.map((m: any) => (
                <Button key={m.id} size="sm" variant={pickMaterial === m.id ? "default" : "outline"} className="h-7 text-xs"
                  onClick={() => { setPickMaterial(m.id === pickMaterial ? null : m.id); setPickDesign(null); }}>
                  {m.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 2. Design */}
          {pickMaterial && (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">2 · Vision type & design</div>
              <div className="flex gap-1.5 flex-wrap">
                {designOptions.map((d) => (
                  <Button key={d.key} size="sm" variant={pickDesign === d.key ? "default" : "outline"} className="h-7 text-xs"
                    onClick={() => setPickDesign(d.key === pickDesign ? null : d.key)}>
                    {d.mftype} · {d.lenstype}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Lens */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">3 · Lens</div>
              <Input value={lensSearch} onChange={(e) => setLensSearch(e.target.value)} placeholder="Search name…" className="h-7 text-xs w-52" />
            </div>
            <div className="border border-border rounded overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Lens</th>
                    <th className="text-center px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">Type</th>
                    <th className="text-center px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">Material</th>
                    <th className="text-center px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">Index</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Price</th>
                    <th className="w-[60px]" />
                  </tr>
                </thead>
                <tbody>
                  {!catalog.ready && <tr><td colSpan={6} className="text-center text-xs text-muted-foreground py-6">Loading catalog…</td></tr>}
                  {catalog.ready && lensChoices.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-xs text-muted-foreground py-6">Nothing matches — try clearing the filters above.</td></tr>
                  )}
                  {lensChoices.map((l) => (
                    <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-2 py-1.5 font-medium">{l.name}</td>
                      <td className="px-1 py-1.5 text-center text-muted-foreground">{l.mftype?.name ?? "—"}</td>
                      <td className="px-1 py-1.5 text-center text-muted-foreground">{l.material?.name ?? "—"}</td>
                      <td className="px-1 py-1.5 text-center text-muted-foreground">{l.index_value}</td>
                      <td className="px-2 py-1.5 text-right font-mono">${catalog.priceFor(l.id, l.sell_price).toFixed(2)}</td>
                      <td className="px-2 py-1.5">
                        <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => selectLens(l)} disabled={addLineMutation.isPending}>Select</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Colour — only when confirmed alias mappings exist for the chosen lens */}
          {activeLensLine && colours.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">4 · Colour</div>
              <div className="flex gap-1.5 flex-wrap">
                {colours.map((c) => (
                  <Button
                    key={c.alias}
                    size="sm"
                    variant={activeLensLine.innovations_alias === c.alias ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setColour(activeLensLine, activeLensLine.innovations_alias === c.alias ? null : c.alias)}
                  >
                    {c.color_description}{c.is_primary ? " · default" : ""}
                  </Button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Colours come from Innovations' own alias catalog — only combinations the lab can actually make are offered.</p>
            </div>
          )}

          <div className="flex justify-between">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStep(jobScope === "full_glaze" ? "frame" : "account")}>← Back</Button>
            {hasLens && <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep("prescription")}>Next: Prescription <ChevronRight className="h-3.5 w-3.5" /></Button>}
          </div>
        </div>
      )}

      {/* ── Prescription ── */}
      {step === "prescription" && (
        <div className="space-y-4 max-w-4xl">
          <h2 className="text-sm font-semibold text-foreground">Prescription</h2>
          {lensLines.map((line) => (
            <PrescriptionSection key={line.id} lensLine={line} onSaved={() => setStep("addons")} />
          ))}
          <div className="flex justify-between pt-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStep("lens")}>← Back</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep("addons")}>Next: Add-ons <ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}

      {/* ── Coatings & Add-ons ── */}
      {step === "addons" && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Coatings & Add-ons</h2>
          {(() => {
            const groups = new Map<string, typeof catalog.addons>();
            for (const a of catalog.addons) {
              const g = a.category || "Other";
              if (!groups.has(g)) groups.set(g, []);
              groups.get(g)!.push(a);
            }
            return [...groups.entries()].map(([group, items]) => (
              <div key={group}>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                  {items.map((a) => {
                    const selected = addonLines.some((l) => l.product_id === a.id);
                    const clash = !selected ? clashFor(a.id) : null;
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleAddon(a)}
                        title={clash ? clash.reason : a.description || undefined}
                        className={cn(
                          "text-left border rounded px-2.5 py-2 text-xs transition-colors",
                          selected ? "border-primary bg-primary/5 font-medium"
                            : clash ? "border-border opacity-45 cursor-not-allowed"
                            : "border-border hover:border-primary/50 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate">{a.name}</span>
                          <span className="font-mono text-muted-foreground shrink-0">${catalog.priceFor(a.id, a.price).toFixed(2)}</span>
                        </div>
                        {clash && <div className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">⚠ {clash.reason}</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
          {addonLines.length > 0 && (
            <div className="border border-border rounded p-2 space-y-1 bg-muted/20">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Selected add-ons</div>
              {addonLines.map((l) => (
                <div key={l.id} className="flex items-center gap-2 text-xs bg-background border border-border rounded px-2 py-1.5">
                  <span className="flex-1 truncate">{l.item_name}</span>
                  <button
                    title={l.needs_assistance ? "Assistance requested" : "Request assistance with this item"}
                    onClick={() => updateLineMutation.mutate({ id: l.id, updates: { needs_assistance: !l.needs_assistance } as any })}
                    className={cn("p-1 rounded", l.needs_assistance ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20" : "text-muted-foreground hover:text-foreground")}
                  >
                    <HandHelping className="h-3.5 w-3.5" />
                  </button>
                  <span className="font-mono">${l.unit_sell_price_bbd.toFixed(2)}</span>
                  <button onClick={() => deleteLineMutation.mutate(l.id)} className="p-0.5 rounded hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setStep("prescription")}>← Back</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep("review")}>Review Order <ChevronRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      )}

      {/* ── Review ── */}
      {step === "review" && (
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-sm font-semibold text-foreground">Review & Submit</h2>
          <div className="border border-border rounded divide-y divide-border">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <Badge variant="outline" className="text-[9px] h-4">{l.line_type}</Badge>
                <span className="flex-1 truncate">{l.item_name}</span>
                {l.needs_assistance && <Badge className="text-[9px] h-4 bg-amber-100 text-amber-700 border-amber-200">assist</Badge>}
                <span className="font-mono">${(l.qty * l.unit_sell_price_bbd).toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold">
              <span>Total ({quote.currency ?? "BBD"})</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Everything is already saved against quote <span className="font-mono">{quote.quote_number}</span>.
            {actions.cart && " Adding to cart lets you pay by card or place it on the account at checkout — once paid/confirmed, the order queues for submission to Innovations (staff release each one)."}
          </p>
          <div className="flex gap-2 justify-end flex-wrap">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { toast({ title: "Draft saved", description: `Quote ${quote.quote_number}` }); navigate(surface === "admin" ? "/admin/website/quotations" : "/profile/quotes"); }}>
              Save Draft & Close
            </Button>
            {actions.print && surface === "admin" && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => navigate(`/admin/website/quotations/${quoteId}`)}>
                <Printer className="h-3.5 w-3.5" /> Open in Quotations (print)
              </Button>
            )}
            {actions.cart && (
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleAddToCart} disabled={!hasLens}>
                <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RxOrderForm;
