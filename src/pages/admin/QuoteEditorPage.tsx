import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useQuotes, useQuoteLines, useRxDetails, Quote, QuoteLine, RxDetail,
  computeLineProfit, QUOTE_STATUSES, OVERRIDE_REASONS,
} from "@/hooks/useQuotes";
import { useLenses, Lens } from "@/hooks/useLenses";
import { useAddons, Addon } from "@/hooks/useAddons";
import { useSupplies, Supply } from "@/hooks/useSupplies";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, AlertTriangle, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import QuotePdfExport from "@/components/admin/QuotePdfExport";
import RxQuoteWizard from "@/components/admin/RxQuoteWizard";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const profitBadge = (status: string) => {
  switch (status) {
    case "Profitable": return { bg: "hsl(145 60% 40% / 0.12)", color: "hsl(145 60% 35%)", label: "✓" };
    case "AtCost":     return { bg: "hsl(35 80% 50% / 0.12)",  color: "hsl(35 80% 40%)",  label: "=" };
    case "BelowCost":  return { bg: "hsl(0 60% 50% / 0.12)",   color: "hsl(0 60% 45%)",   label: "↓" };
    default:           return { bg: "hsl(215 15% 50% / 0.12)", color: "hsl(215 15% 45%)", label: "?" };
  }
};

const thresholdBadge = (status: string) => {
  switch (status) {
    case "AboveThreshold": return { color: "hsl(145 60% 35%)" };
    case "BelowThreshold": return { color: "hsl(35 80% 40%)" };
    case "BelowCost":      return { color: "hsl(0 60% 45%)" };
    case "AtCost":         return { color: "hsl(35 80% 40%)" };
    default:               return { color: "hsl(215 15% 45%)" };
  }
};

// ─── Main page ────────────────────────────────────────────────────────────────
const QuoteEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();

  const { data: allQuotes, updateMutation } = useQuotes();
  const quote = allQuotes?.find((q) => q.id === id);

  // Lines (used for STOCK flow and for totals in both)
  const { data: lines = [], addLineMutation, updateLineMutation, deleteLineMutation } = useQuoteLines(id);
  const { data: lenses = [] } = useLenses();
  const { data: addons = [] } = useAddons();
  const { data: supplies = [] } = useSupplies();

  // Local header state (shared by both flows)
  const [headerForm, setHeaderForm] = useState<Partial<Quote>>({});
  const [emailError, setEmailError] = useState("");
  const [showInternalExport, setShowInternalExport] = useState(false);

  // STOCK-only state
  const [overrideDialogLine, setOverrideDialogLine] = useState<QuoteLine | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideNote, setOverrideNote] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  // Rx map (for summary / PDF export on RX quotes)
  const lensLineIds = useMemo(() => lines.filter(l => l.line_type === "Lens").map(l => l.id), [lines]);
  const [rxMap, setRxMap] = useState<Record<string, RxDetail>>({});

  useEffect(() => {
    if (lensLineIds.length === 0) { setRxMap({}); return; }
    const fetchAll = async () => {
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase
        .from("rx_details").select("*").in("quote_line_id", lensLineIds);
      if (!error && data) {
        const map: Record<string, RxDetail> = {};
        data.forEach((r: any) => { map[r.quote_line_id] = r as RxDetail; });
        setRxMap(map);
      }
    };
    fetchAll();
  }, [lensLineIds.join(",")]);

  useEffect(() => {
    if (quote) {
      setHeaderForm({
        customer_name: quote.customer_name,
        contact_name: quote.contact_name,
        contact_email: quote.contact_email,
        contact_phone: quote.contact_phone,
        currency: quote.currency,
        valid_until: quote.valid_until,
        lead_time_days: quote.lead_time_days,
        notes_customer: quote.notes_customer,
        notes_internal: quote.notes_internal,
        status: quote.status,
      });
    }
  }, [quote?.id]);

  // Compute totals from lines (used by both flows)
  const totals = useMemo(() => {
    let subtotalSell = 0; let totalLandedCost = 0;
    lines.forEach(l => { subtotalSell += l.qty * l.unit_sell_price_bbd; totalLandedCost += l.qty * l.unit_cost_landed_bbd; });
    const gpAmount = subtotalSell - totalLandedCost;
    const gpPercent = subtotalSell > 0 ? (gpAmount / subtotalSell) * 100 : 0;
    return {
      subtotalSell, totalLandedCost, gpAmount, gpPercent, grandTotal: subtotalSell,
      belowCostCount: lines.filter(l => l.profit_status === "BelowCost").length,
      belowThresholdCount: lines.filter(l => l.threshold_status === "BelowThreshold").length,
      editedCount: lines.filter(l => l.price_override).length,
      noCostCount: lines.filter(l => l.profit_status === "NoCost").length,
    };
  }, [lines]);

  const validateEmail = (email: string) => {
    if (!email) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Invalid email address";
  };

  const saveHeader = useCallback(() => {
    if (!id || !quote) return;
    const emailErr = validateEmail(headerForm.contact_email || "");
    setEmailError(emailErr);
    if (emailErr) return;
    updateMutation.mutate({ id, updates: { ...headerForm, subtotal_sell: totals.subtotalSell, total_landed_cost: totals.totalLandedCost, gp_amount: totals.gpAmount, gp_percent: totals.gpPercent, grand_total: totals.grandTotal } as any });
  }, [id, headerForm, totals]);

  // Auto-save totals when lines change
  useEffect(() => {
    if (!id || !quote) return;
    const t = setTimeout(() => {
      updateMutation.mutate({ id, updates: { subtotal_sell: totals.subtotalSell, total_landed_cost: totals.totalLandedCost, gp_amount: totals.gpAmount, gp_percent: totals.gpPercent, grand_total: totals.grandTotal } as any });
    }, 500);
    return () => clearTimeout(t);
  }, [totals.subtotalSell, totals.grandTotal]);

  // ── STOCK add product ────────────────────────────────────────────────────
  const addProduct = (type: string, productId: string, name: string, sku: string, costLanded: number, basePrice: number) => {
    if (!id || !quote) return;
    const profit = computeLineProfit(basePrice, costLanded, 1, quote.quote_type as "STOCK" | "RX");
    addLineMutation.mutate({
      quote_id: id, line_type: type, product_id: productId, sku, item_name: name,
      qty: 1, unit_cost_landed_bbd: costLanded, unit_base_price_bbd: basePrice, unit_sell_price_bbd: basePrice,
      threshold_percent: quote.quote_type === "STOCK" ? 28 : 48, ...profit, sort_order: lines.length,
    });
    setProductPickerOpen(false); setPickerSearch("");
    logChange({ table_name: "quotes", record_id: id, action: "create", new_data: { type, name } });
  };

  const handleSellPriceChange = (line: QuoteLine, newPrice: number) => {
    if (!quote) return;
    const profit = computeLineProfit(newPrice, line.unit_cost_landed_bbd, line.qty, quote.quote_type as "STOCK" | "RX");
    const isOverride = newPrice !== line.unit_base_price_bbd;
    if (isOverride && profit.profit_status === "BelowCost" && !line.override_reason) {
      setOverrideDialogLine({ ...line, unit_sell_price_bbd: newPrice }); return;
    }
    updateLineMutation.mutate({ id: line.id, updates: { unit_sell_price_bbd: newPrice, price_override: isOverride, ...profit } });
  };

  const handleQtyChange = (line: QuoteLine, newQty: number) => {
    if (!quote) return;
    const profit = computeLineProfit(line.unit_sell_price_bbd, line.unit_cost_landed_bbd, newQty, quote.quote_type as "STOCK" | "RX");
    updateLineMutation.mutate({ id: line.id, updates: { qty: newQty, ...profit } });
  };

  const saveOverride = () => {
    if (!overrideDialogLine || !overrideReason || !quote) return;
    if (overrideReason === "Other" && !overrideNote.trim()) {
      toast({ title: "Note required", description: "Please provide a note for 'Other' reason.", variant: "destructive" }); return;
    }
    const profit = computeLineProfit(overrideDialogLine.unit_sell_price_bbd, overrideDialogLine.unit_cost_landed_bbd, overrideDialogLine.qty, quote.quote_type as "STOCK" | "RX");
    updateLineMutation.mutate({ id: overrideDialogLine.id, updates: { unit_sell_price_bbd: overrideDialogLine.unit_sell_price_bbd, price_override: true, override_reason: overrideReason, override_note: overrideReason === "Other" ? overrideNote : null, ...profit } });
    logChange({ table_name: "quote_lines", record_id: overrideDialogLine.id, action: "update", old_data: { sell: overrideDialogLine.unit_base_price_bbd }, new_data: { sell: overrideDialogLine.unit_sell_price_bbd, reason: overrideReason } });
    setOverrideDialogLine(null); setOverrideReason(""); setOverrideNote("");
  };

  const roundTotalUp = (nearest: number) => {
    if (!id || !quote || lines.length === 0) return;
    const diff = Math.ceil(totals.grandTotal / nearest) * nearest - totals.grandTotal;
    if (diff <= 0) return;
    const profit = computeLineProfit(diff, 0, 1, quote.quote_type as "STOCK" | "RX");
    addLineMutation.mutate({ quote_id: id, line_type: "Fee", sku: "", item_name: `Rounding Adjustment (+${diff.toFixed(2)})`, qty: 1, unit_cost_landed_bbd: 0, unit_base_price_bbd: diff, unit_sell_price_bbd: diff, threshold_percent: quote.quote_type === "STOCK" ? 28 : 48, ...profit, sort_order: lines.length });
  };

  const pickerItems = useMemo(() => {
    if (!quote) return [];
    const s = pickerSearch.toLowerCase();
    return supplies.filter(sup => sup.is_active && (sup.name.toLowerCase().includes(s) || sup.sku?.toLowerCase().includes(s))).slice(0, 50).map(sup => ({ id: sup.id, name: sup.name, sku: sup.sku || "", type: "Stock", cost: sup.base_price, price: sup.sell_price }));
  }, [pickerSearch, supplies]);

  if (!quote) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-primary" />
      </div>
    );
  }

  const isRx = quote.quote_type === "RX";

  return (
    <div className="flex flex-col h-full">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={() => navigate("/admin/quotations")} className="p-1 rounded hover:bg-muted">
          <ArrowLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">{quote.quote_number}</h1>
            <Badge variant="outline" className="text-[10px] h-4">{quote.quote_type}</Badge>
            <Select
              value={headerForm.status || quote.status}
              onValueChange={v => {
                setHeaderForm(p => ({ ...p, status: v }));
                updateMutation.mutate({ id: quote.id, updates: { status: v } as any });
                logChange({ table_name: "quotes", record_id: quote.id, action: "update", old_data: { status: quote.status }, new_data: { status: v } });
              }}
              disabled={!canEdit}
            >
              <SelectTrigger className="h-5 w-[90px] text-[10px] border-0 p-0 px-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_STATUSES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* PDF export always visible */}
          <QuotePdfExport quote={quote} lines={lines} totals={totals} showInternal={showInternalExport} rxMap={rxMap} />
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={showInternalExport} onChange={e => setShowInternalExport(e.target.checked)} className="h-3 w-3 rounded" />
            Internal
          </label>
          {/* STOCK: rounding buttons */}
          {!isRx && canEdit && lines.length > 0 && (
            <div className="flex gap-0.5 ml-2">
              <span className="text-[10px] text-muted-foreground self-center mr-1">Round:</span>
              {[1, 5, 10].map(n => <Button key={n} size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => roundTotalUp(n)}>↑{n}</Button>)}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {/* ══ RX QUOTE: multi-step wizard ════════════════════════════════ */}
        {isRx && (
          <RxQuoteWizard
            quote={quote}
            onUpdateQuote={updates => updateMutation.mutate({ id: quote.id, updates: updates as any })}
            headerForm={headerForm}
            setHeaderForm={setHeaderForm}
            saveHeader={saveHeader}
            emailError={emailError}
            setEmailError={setEmailError}
            totals={totals}
            canEdit={canEdit}
          />
        )}

        {/* ══ STOCK QUOTE: flat editor ════════════════════════════════════ */}
        {!isRx && (
          <div className="flex gap-4">
            <div className="flex-1 min-w-0 space-y-4">
              {/* Header fields */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Customer</label>
                  <Input value={headerForm.customer_name ?? ""} onChange={e => setHeaderForm(p => ({ ...p, customer_name: e.target.value }))} onBlur={saveHeader} className="h-7 text-xs" disabled={!canEdit} />
                </div>
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Contact</label>
                  <Input value={headerForm.contact_name ?? ""} onChange={e => setHeaderForm(p => ({ ...p, contact_name: e.target.value }))} onBlur={saveHeader} className="h-7 text-xs" disabled={!canEdit} />
                </div>
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Email</label>
                  <Input type="email" value={headerForm.contact_email ?? ""} onChange={e => { setHeaderForm(p => ({ ...p, contact_email: e.target.value })); if (emailError) setEmailError(validateEmail(e.target.value)); }} onBlur={saveHeader} className={`h-7 text-xs ${emailError ? "border-destructive" : ""}`} disabled={!canEdit} />
                  {emailError && <p className="text-[10px] text-destructive mt-0.5">{emailError}</p>}
                </div>
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Phone</label>
                  <Input value={headerForm.contact_phone ?? ""} onChange={e => setHeaderForm(p => ({ ...p, contact_phone: e.target.value }))} onBlur={saveHeader} className="h-7 text-xs" disabled={!canEdit} />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Currency</label>
                  <Select value={headerForm.currency || "BBD"} onValueChange={v => setHeaderForm(p => ({ ...p, currency: v }))} disabled={!canEdit}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="BBD">BBD</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Valid Until</label>
                  <Input type="date" value={headerForm.valid_until ?? ""} onChange={e => setHeaderForm(p => ({ ...p, valid_until: e.target.value || null }))} onBlur={saveHeader} className="h-7 text-xs" disabled={!canEdit} />
                </div>
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Lead Time (days)</label>
                  <Input type="number" value={headerForm.lead_time_days ?? ""} onChange={e => setHeaderForm(p => ({ ...p, lead_time_days: e.target.value ? Number(e.target.value) : null }))} onBlur={saveHeader} className="h-7 text-xs" disabled={!canEdit} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Customer Notes</label>
                  <Textarea value={headerForm.notes_customer ?? ""} onChange={e => setHeaderForm(p => ({ ...p, notes_customer: e.target.value }))} onBlur={saveHeader} className="text-xs min-h-[60px]" disabled={!canEdit} />
                </div>
                <div>
                  <label className="text-[11px] font-medium mb-0.5 block text-muted-foreground">Internal Notes</label>
                  <Textarea value={headerForm.notes_internal ?? ""} onChange={e => setHeaderForm(p => ({ ...p, notes_internal: e.target.value }))} onBlur={saveHeader} className="text-xs min-h-[60px]" disabled={!canEdit} />
                </div>
              </div>

              {/* Line items */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">Line Items</h2>
                {canEdit && (
                  <Button size="sm" className="h-6 text-[11px] gap-1" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} onClick={() => { setProductPickerOpen(true); setPickerSearch(""); }}>
                    <Plus className="h-3 w-3" /> Add Line
                  </Button>
                )}
              </div>

              <div className="border rounded border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] w-[200px]">Item</TableHead>
                      <TableHead className="text-[11px] text-right w-[50px]">Qty</TableHead>
                      <TableHead className="text-[11px] text-right w-[80px]">Cost (L)</TableHead>
                      <TableHead className="text-[11px] text-right w-[80px]">Base</TableHead>
                      <TableHead className="text-[11px] text-right w-[80px]">Sell</TableHead>
                      <TableHead className="text-[11px] text-right w-[80px]">Line Total</TableHead>
                      <TableHead className="text-[11px] text-right w-[55px]">GP%</TableHead>
                      <TableHead className="text-[11px] w-[40px]">Status</TableHead>
                      <TableHead className="text-[11px] w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-xs py-8 text-muted-foreground">No line items. Click "Add Line" to add products.</TableCell></TableRow>
                    )}
                    {lines.map(line => {
                      const pb = profitBadge(line.profit_status);
                      const tb = thresholdBadge(line.threshold_status);
                      const lineTotal = line.qty * line.unit_sell_price_bbd;
                      return (
                        <TableRow key={line.id} style={line.profit_status === "BelowCost" ? { background: "hsl(0 60% 50% / 0.06)" } : undefined}>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <span className="truncate max-w-[170px]">{line.item_name}</span>
                              {line.price_override && <Badge className="text-[9px] h-3.5 px-1 border-0" style={{ background: "hsl(35 80% 50% / 0.15)", color: "hsl(35 80% 40%)" }}>Edited</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-right">
                            {canEdit ? <Input type="number" value={line.qty} onChange={e => handleQtyChange(line, Number(e.target.value) || 1)} className="h-6 text-xs text-right w-12 p-1" min={1} /> : line.qty}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">{line.unit_cost_landed_bbd.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">{line.unit_base_price_bbd.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right">
                            {canEdit
                              ? <Input type="number" defaultValue={line.unit_sell_price_bbd} onBlur={e => handleSellPriceChange(line, Number(e.target.value) || 0)} className="h-6 text-xs text-right w-16 p-1 font-mono" step={0.01} />
                              : <span className="font-mono">{line.unit_sell_price_bbd.toFixed(2)}</span>}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-medium">{lineTotal.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-mono" style={{ color: tb.color }}>{line.gp_percent.toFixed(1)}%</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold" style={{ background: pb.bg, color: pb.color }} title={`${line.profit_status} / ${line.threshold_status}`}>{pb.label}</span>
                          </TableCell>
                          <TableCell>
                            {canEdit && <button onClick={() => deleteLineMutation.mutate(line.id)} className="p-0.5 rounded hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* STOCK right summary */}
            <div className="w-[220px] shrink-0 space-y-3 sticky top-0 self-start">
              <div className="border rounded border-border p-3 space-y-2">
                <h3 className="text-xs font-semibold text-foreground">Summary</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Subtotal Sell</span><span className="font-mono font-medium">{totals.subtotalSell.toFixed(2)}</span></div>
                  <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Landed Cost</span><span className="font-mono text-muted-foreground">{totals.totalLandedCost.toFixed(2)}</span></div>
                  <div className="border-t border-border pt-1.5">
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">GP $</span><span className="font-mono font-medium" style={{ color: totals.gpAmount >= 0 ? "hsl(145 60% 35%)" : "hsl(0 60% 45%)" }}>{totals.gpAmount.toFixed(2)}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-muted-foreground">GP %</span><span className="font-mono font-medium" style={{ color: totals.gpPercent >= 28 ? "hsl(145 60% 35%)" : "hsl(35 80% 40%)" }}>{totals.gpPercent.toFixed(1)}%</span></div>
                  </div>
                  <div className="border-t border-border pt-1.5">
                    <div className="flex justify-between text-xs font-semibold"><span className="text-foreground">Grand Total</span><span className="font-mono">{totals.grandTotal.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>
              <div className="border rounded border-border p-3 space-y-1.5">
                <h3 className="text-xs font-semibold text-foreground">Flags</h3>
                {totals.belowCostCount > 0 && <div className="flex items-center gap-1.5 text-[11px] text-destructive"><XCircle className="h-3.5 w-3.5" /> {totals.belowCostCount} below-cost</div>}
                {totals.belowThresholdCount > 0 && <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "hsl(35 80% 40%)" }}><AlertTriangle className="h-3.5 w-3.5" /> {totals.belowThresholdCount} below-threshold</div>}
                {totals.editedCount > 0 && <div className="flex items-center gap-1.5 text-[11px] text-primary"><MinusCircle className="h-3.5 w-3.5" /> {totals.editedCount} edited</div>}
                {totals.noCostCount > 0 && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><AlertTriangle className="h-3.5 w-3.5" /> {totals.noCostCount} no-cost</div>}
                {totals.belowCostCount === 0 && totals.belowThresholdCount === 0 && totals.editedCount === 0 && totals.noCostCount === 0 && <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "hsl(145 60% 35%)" }}><CheckCircle2 className="h-3.5 w-3.5" /> All lines healthy</div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── STOCK: product picker dialog ────────────────────────────────── */}
      {!isRx && (
        <Dialog open={productPickerOpen} onOpenChange={setProductPickerOpen}>
          <DialogContent className="sm:max-w-lg max-h-[70vh] flex flex-col">
            <DialogHeader><DialogTitle className="text-sm font-semibold">Add Stock Item</DialogTitle></DialogHeader>
            <Input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Search items…" className="h-7 text-xs" autoFocus />
            <div className="flex-1 overflow-auto space-y-0.5">
              {pickerItems.length === 0 && <div className="text-center text-xs py-8 text-muted-foreground">No matching items found.</div>}
              {pickerItems.map(item => (
                <button key={item.id} onClick={() => addProduct(item.type, item.id, item.name, item.sku, item.cost, item.price)} className="w-full flex items-center justify-between px-3 py-2 text-xs rounded hover:bg-muted text-left">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{item.name}</div>
                    {item.sku && <div className="text-[10px] text-muted-foreground">{item.sku}</div>}
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    <div className="font-mono text-[11px]">${item.price.toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Override reason dialog ──────────────────────────────────────── */}
      <Dialog open={!!overrideDialogLine} onOpenChange={open => { if (!open) { setOverrideDialogLine(null); setOverrideReason(""); setOverrideNote(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-sm font-semibold">Price Override Reason</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground">This price is below cost. Please select an override reason.</p>
            <Select value={overrideReason} onValueChange={setOverrideReason}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select reason…" /></SelectTrigger>
              <SelectContent>{OVERRIDE_REASONS.map(r => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
            </Select>
            {overrideReason === "Other" && (
              <Textarea value={overrideNote} onChange={e => setOverrideNote(e.target.value)} placeholder="Explain reason…" className="text-xs min-h-[60px]" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setOverrideDialogLine(null); setOverrideReason(""); setOverrideNote(""); }}>Cancel</Button>
            <Button size="sm" className="h-7 text-xs" onClick={saveOverride} disabled={!overrideReason}>Confirm Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteEditorPage;
