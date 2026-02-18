import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useShipmentCharges, useShipmentLines, computeShipmentTotals, computeLineCosts, CHARGE_TYPES, type Shipment, type ShipmentCharge, type ShipmentLine } from "@/hooks/useShipments";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useLenses } from "@/hooks/useLenses";
import { useSupplies } from "@/hooks/useSupplies";
import { useAddons } from "@/hooks/useAddons";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Plus, Trash2, Download } from "lucide-react";

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ShipmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const { canEditFeature } = useRolePermissions();
  const { isAdmin } = useUserRole();
  const canEdit = canEditFeature("costings");
  const qc = useQueryClient();
  const { user } = useAuth();

  const defaultShipment: Shipment = {
    id: "", type: "lens", supplier_id: "", commodity: "", date_ordered: null,
    po_ref: "", date_received: new Date().toISOString().split("T")[0],
    invoice_number: "", invoice_date: new Date().toISOString().split("T")[0],
    currency: "USD", exchange_rate: 2, fob_foreign: 0, invoice_total_foreign: 0,
    status: "draft", version: 1, parent_id: null, created_by: user?.id ?? "",
    created_at: "", updated_at: "",
  };

  const [shipment, setShipment] = useState<Shipment | null>(isNew ? defaultShipment : null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const { data: suppliers } = useReferenceData("suppliers");
  const { data: lenses = [] } = useLenses();
  const { data: supplies = [] } = useSupplies();
  const { data: addons = [] } = useAddons();
  const realId = isNew ? null : (id ?? null);
  const { data: charges = [], upsertMutation: upsertCharge, deleteMutation: deleteCharge } = useShipmentCharges(realId);
  const { data: lines = [], upsertMutation: upsertLine, deleteMutation: deleteLine } = useShipmentLines(realId);

  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      const { data, error } = await (supabase.from("shipments" as any) as any).select("*").eq("id", id).single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      setShipment(data as Shipment);
      setLoading(false);
    })();
  }, [id]);

  const isLocked = shipment?.status === "locked";
  const editable = canEdit && !isLocked;

  const totals = useMemo(() => {
    if (!shipment) return { fobBbd: 0, invoiceBbd: 0, totalChargesBbd: 0, totalLandedBbd: 0, multiplier: 1 };
    return computeShipmentTotals(shipment, charges);
  }, [shipment, charges]);

  const updateField = (field: string, value: any) => {
    if (!shipment) return;
    setShipment({ ...shipment, [field]: value } as Shipment);
  };

  const handleSave = async () => {
    if (!shipment) return;
    if (!shipment.supplier_id) {
      toast({ title: "Validation", description: "Supplier is required", variant: "destructive" });
      return;
    }
    if (!shipment.invoice_number) {
      toast({ title: "Validation", description: "Invoice Number is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const { id: _, created_at, updated_at, supplier_name, ...form } = shipment as any;
        const { data, error } = await (supabase.from("shipments" as any) as any)
          .insert({ ...form, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        logChange({ table_name: "shipments", record_id: data.id, action: "create", new_data: data });
        toast({ title: "Shipment created" });
        navigate(`/admin/costings/shipments/${data.id}`, { replace: true });
      } else {
        const { id: _, created_at, updated_at, supplier_name, ...form } = shipment as any;
        const { error } = await (supabase.from("shipments" as any) as any).update(form).eq("id", id);
        if (error) throw error;
        logChange({ table_name: "shipments", record_id: id!, action: "update", new_data: form });
        toast({ title: "Saved" });
        qc.invalidateQueries({ queryKey: ["shipments"] });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!shipment || !id || isNew) return;
    const oldStatus = shipment.status;
    try {
      const { error } = await (supabase.from("shipments" as any) as any).update({ status: newStatus }).eq("id", id);
      if (error) throw error;
      setShipment({ ...shipment, status: newStatus as any });
      logChange({ table_name: "shipments", record_id: id, action: "update", change_summary: { status: { old: oldStatus, new: newStatus } } });
      toast({ title: `Status → ${newStatus}` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const addCharge = async () => {
    if (!id || isNew) return;
    await upsertCharge.mutateAsync({ shipment_id: id, charge_type: CHARGE_TYPES[0], amount_bbd: 0, sort_order: charges.length });
  };

  const addLine = async () => {
    if (!id || isNew) return;
    await upsertLine.mutateAsync({ shipment_id: id, product_type: shipment?.type === "lens" ? "lens" : "free", description: "", quantity: 1, unit_fob_foreign: 0, line_fob_foreign: 0, markup_percent: 30, sort_order: lines.length });
  };

  const exportCSV = (data: Record<string, any>[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((r) => headers.map((h) => `"${r[h] ?? ""}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Product selector options
  const lensOptions = useMemo(() => lenses.filter(l => l.is_active).map(l => ({ id: l.id, label: l.name })), [lenses]);
  const supplyOptions = useMemo(() => supplies.filter(s => s.is_active).map(s => ({ id: s.id, label: s.name })), [supplies]);
  const addonOptions = useMemo(() => addons.filter(a => a.is_active).map(a => ({ id: a.id, label: a.name })), [addons]);

  const getProductOptions = (type: string) => {
    switch (type) {
      case "lens": return lensOptions;
      case "supply": return supplyOptions;
      case "addon": return addonOptions;
      default: return [];
    }
  };

  const getProductId = (line: ShipmentLine) => line.lens_id || line.supply_id || line.addon_id || "";

  const handleProductSelect = (line: ShipmentLine, productId: string) => {
    const updates: Partial<ShipmentLine> = { ...line, lens_id: null, supply_id: null, addon_id: null };
    if (line.product_type === "lens") updates.lens_id = productId;
    else if (line.product_type === "supply") updates.supply_id = productId;
    else if (line.product_type === "addon") updates.addon_id = productId;

    // Auto-fill description from product name
    const opts = getProductOptions(line.product_type);
    const match = opts.find(o => o.id === productId);
    if (match) updates.description = match.label;

    upsertLine.mutate(updates);
  };

  const handleProductTypeChange = (line: ShipmentLine, newType: string) => {
    upsertLine.mutate({ ...line, product_type: newType as any, lens_id: null, supply_id: null, addon_id: null });
  };

  if (loading || !shipment) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  const xr = shipment.exchange_rate || 1;

  return (
    <div className="p-4 space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
          {isNew ? "New Shipment" : `Shipment: ${shipment.invoice_number || "Untitled"}`}
        </h1>
        {!isNew && <Badge variant="outline" className="capitalize">{shipment.status}</Badge>}
        {!isNew && <span className="text-xs text-muted-foreground">v{shipment.version}</span>}
        <div className="flex-1" />
        {!isNew && editable && shipment.status === "draft" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange("reviewed")}>Mark Reviewed</Button>
        )}
        {!isNew && editable && shipment.status === "reviewed" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange("locked")}>Lock</Button>
        )}
        {!isNew && isAdmin && shipment.status === "reviewed" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleStatusChange("draft")}>Back to Draft</Button>
        )}
        {editable && (
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3" /> {isNew ? "Create" : "Save"}
          </Button>
        )}
      </div>

      {/* Shipment fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Type *">
          <Select value={shipment.type} onValueChange={(v) => updateField("type", v)} disabled={!editable}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lens">Lens</SelectItem>
              <SelectItem value="non-lens">Non-Lens</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Supplier *">
          <Select value={shipment.supplier_id} onValueChange={(v) => updateField("supplier_id", v)} disabled={!editable}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {(suppliers ?? []).filter((s) => s.is_active).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Commodity *">
          <Input className="h-8 text-xs" value={shipment.commodity} onChange={(e) => updateField("commodity", e.target.value)} disabled={!editable} />
        </Field>
        <Field label="PO / Order Ref">
          <Input className="h-8 text-xs" value={shipment.po_ref} onChange={(e) => updateField("po_ref", e.target.value)} disabled={!editable} />
        </Field>
        <Field label="Date Ordered">
          <Input type="date" className="h-8 text-xs" value={shipment.date_ordered ?? ""} onChange={(e) => updateField("date_ordered", e.target.value || null)} disabled={!editable} />
        </Field>
        <Field label="Date Received *">
          <Input type="date" className="h-8 text-xs" value={shipment.date_received} onChange={(e) => updateField("date_received", e.target.value)} disabled={!editable} />
        </Field>
        <Field label="Invoice Number *">
          <Input className="h-8 text-xs" value={shipment.invoice_number} onChange={(e) => updateField("invoice_number", e.target.value)} disabled={!editable} />
        </Field>
        <Field label="Invoice Date *">
          <Input type="date" className="h-8 text-xs" value={shipment.invoice_date} onChange={(e) => updateField("invoice_date", e.target.value)} disabled={!editable} />
        </Field>
        <Field label="Currency">
          <Select value={shipment.currency} onValueChange={(v) => updateField("currency", v)} disabled={!editable}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Exchange Rate (BBD per 1 FX) *">
          <Input type="number" step="0.01" className="h-8 text-xs" value={shipment.exchange_rate} onChange={(e) => updateField("exchange_rate", +e.target.value)} disabled={!editable} />
        </Field>
        <Field label={`FOB (${shipment.currency}) *`}>
          <Input type="number" step="0.01" className="h-8 text-xs" value={shipment.fob_foreign} onChange={(e) => updateField("fob_foreign", +e.target.value)} disabled={!editable} />
        </Field>
        <Field label={`Invoice Total (${shipment.currency}) *`}>
          <Input type="number" step="0.01" className="h-8 text-xs" value={shipment.invoice_total_foreign} onChange={(e) => updateField("invoice_total_foreign", +e.target.value)} disabled={!editable} />
        </Field>
      </div>

      {/* Computed summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 rounded border" style={{ background: "hsl(215 20% 97%)", borderColor: "hsl(215 15% 88%)" }}>
        <ComputedField label="FOB (BBD)" value={fmt(totals.fobBbd)} />
        <ComputedField label="Invoice (BBD)" value={fmt(totals.invoiceBbd)} />
        <ComputedField label="Total Charges (BBD)" value={fmt(totals.totalChargesBbd)} />
        <ComputedField label="Total Landed (BBD)" value={fmt(totals.totalLandedBbd)} />
        <ComputedField label="Multiplier" value={totals.multiplier.toFixed(4)} />
      </div>

      {/* Tabs - only show for saved shipments */}
      {!isNew && (
        <Tabs defaultValue="charges" className="w-full">
          <TabsList className="h-8 p-0.5 gap-0.5" style={{ background: "hsl(215 10% 93%)", borderRadius: "4px" }}>
            <TabsTrigger value="charges" className="text-xs h-7 px-3" style={{ borderRadius: "3px" }}>Charges ({charges.length})</TabsTrigger>
            <TabsTrigger value="lines" className="text-xs h-7 px-3" style={{ borderRadius: "3px" }}>Line Items ({lines.length})</TabsTrigger>
            <TabsTrigger value="exports" className="text-xs h-7 px-3" style={{ borderRadius: "3px" }}>Exports</TabsTrigger>
          </TabsList>

          {/* Charges Tab */}
          <TabsContent value="charges" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">All amounts in BBD</span>
              {editable && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addCharge}><Plus className="h-3 w-3" /> Add Charge</Button>}
            </div>
            <div className="border rounded overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-8">Charge Type</TableHead>
                    <TableHead className="h-8 text-right">Amount</TableHead>
                    <TableHead className="h-8 text-right">VAT</TableHead>
                    <TableHead className="h-8 text-right">Duty</TableHead>
                    <TableHead className="h-8">VAT Reclaimable</TableHead>
                    <TableHead className="h-8">Notes</TableHead>
                    <TableHead className="h-8 text-right">Row Total</TableHead>
                    {editable && <TableHead className="h-8 w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.map((c) => {
                    const isDutyRow = c.charge_type === "Duties & VAT";
                    const rowTotal = (c.amount_bbd || 0) + (c.vat_bbd || 0) + (c.duty_bbd || 0);
                    return (
                      <TableRow key={c.id} className="text-xs">
                        <TableCell className="py-1">
                          <Select value={c.charge_type} disabled={!editable} onValueChange={(v) => upsertCharge.mutate({ ...c, charge_type: v })}>
                            <SelectTrigger className="h-7 text-xs border-0 shadow-none"><SelectValue /></SelectTrigger>
                            <SelectContent>{CHARGE_TYPES.map((ct) => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1">
                          <Input type="number" step="0.01" className="h-7 text-xs text-right w-24" value={c.amount_bbd} disabled={!editable}
                            onChange={(e) => upsertCharge.mutate({ ...c, amount_bbd: +e.target.value })} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Input type="number" step="0.01" className="h-7 text-xs text-right w-24" value={c.vat_bbd ?? 0} disabled={!editable}
                            onChange={(e) => upsertCharge.mutate({ ...c, vat_bbd: +e.target.value })} />
                        </TableCell>
                        <TableCell className="py-1">
                          {isDutyRow ? (
                            <Input type="number" step="0.01" className="h-7 text-xs text-right w-24" value={c.duty_bbd ?? 0} disabled={!editable}
                              onChange={(e) => upsertCharge.mutate({ ...c, duty_bbd: +e.target.value })} />
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-1">
                          {isDutyRow ? (
                            <Switch checked={c.vat_reclaimable} disabled={!editable}
                              onCheckedChange={(v) => upsertCharge.mutate({ ...c, vat_reclaimable: v })} />
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-1">
                          <Input className="h-7 text-xs w-32" value={c.notes} disabled={!editable}
                            onChange={(e) => upsertCharge.mutate({ ...c, notes: e.target.value })} />
                        </TableCell>
                        <TableCell className="py-1 text-right font-mono">{fmt(rowTotal)}</TableCell>
                        {editable && (
                          <TableCell className="py-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteCharge.mutate(c.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {charges.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-xs py-4 text-muted-foreground">No charges added</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="text-right text-xs font-medium">Total Charges (BBD): <span className="font-mono">{fmt(totals.totalChargesBbd)}</span></div>
          </TabsContent>

          {/* Line Items Tab */}
          <TabsContent value="lines" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Multiplier: {totals.multiplier.toFixed(4)}</span>
              {editable && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addLine}><Plus className="h-3 w-3" /> Add Line</Button>}
            </div>
            <div className="border rounded overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-8">Type</TableHead>
                    <TableHead className="h-8">Product</TableHead>
                    <TableHead className="h-8">Description</TableHead>
                    <TableHead className="h-8 text-right">Qty</TableHead>
                    <TableHead className="h-8 text-right">Unit FOB ({shipment.currency})</TableHead>
                    <TableHead className="h-8 text-right">Line FOB ({shipment.currency})</TableHead>
                    <TableHead className="h-8 text-right">Line FOB (BBD)</TableHead>
                    <TableHead className="h-8 text-right">Landed/Unit (BBD)</TableHead>
                    <TableHead className="h-8 text-right">Landed/Unit (USD)</TableHead>
                    <TableHead className="h-8 text-right">Markup %</TableHead>
                    <TableHead className="h-8 text-right">Sell (BBD)</TableHead>
                    <TableHead className="h-8 text-right">Sell (USD)</TableHead>
                    {editable && <TableHead className="h-8 w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l) => {
                    const computed = computeLineCosts(l, xr, totals.multiplier);
                    const productOpts = getProductOptions(l.product_type);
                    const selectedProductId = getProductId(l);
                    return (
                      <TableRow key={l.id} className="text-xs">
                        <TableCell className="py-1">
                          <Select value={l.product_type} disabled={!editable} onValueChange={(v) => handleProductTypeChange(l, v)}>
                            <SelectTrigger className="h-7 text-xs border-0 shadow-none w-20"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {shipment.type === "lens" ? (
                                <SelectItem value="lens">Lens</SelectItem>
                              ) : (
                                <>
                                  <SelectItem value="supply">Supply</SelectItem>
                                  <SelectItem value="addon">Add-On</SelectItem>
                                  <SelectItem value="free">Free</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1">
                          {l.product_type !== "free" && productOpts.length > 0 ? (
                            <Select value={selectedProductId} disabled={!editable} onValueChange={(v) => handleProductSelect(l, v)}>
                              <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="Select…" /></SelectTrigger>
                              <SelectContent className="max-h-60">
                                {productOpts.map((o) => (
                                  <SelectItem key={o.id} value={o.id} className="text-xs">{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1">
                          <Input className="h-7 text-xs w-36" value={l.description} disabled={!editable}
                            onChange={(e) => upsertLine.mutate({ ...l, description: e.target.value })} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Input type="number" className="h-7 text-xs text-right w-16" value={l.quantity} disabled={!editable}
                            onChange={(e) => {
                              const qty = +e.target.value;
                              const lineFob = l.unit_fob_foreign * qty;
                              upsertLine.mutate({ ...l, quantity: qty, line_fob_foreign: lineFob });
                            }} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Input type="number" step="0.01" className="h-7 text-xs text-right w-20" value={l.unit_fob_foreign} disabled={!editable}
                            onChange={(e) => {
                              const unitFob = +e.target.value;
                              upsertLine.mutate({ ...l, unit_fob_foreign: unitFob, line_fob_foreign: unitFob * l.quantity });
                            }} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Input type="number" step="0.01" className="h-7 text-xs text-right w-20" value={l.line_fob_foreign} disabled={!editable}
                            onChange={(e) => upsertLine.mutate({ ...l, line_fob_foreign: +e.target.value })} />
                        </TableCell>
                        <TableCell className="py-1 text-right font-mono">{fmt(computed.lineFobBbd)}</TableCell>
                        <TableCell className="py-1 text-right font-mono">{fmt(computed.landedUnitBbd)}</TableCell>
                        <TableCell className="py-1 text-right font-mono text-muted-foreground">{fmt(computed.landedUnitUsd)}</TableCell>
                        <TableCell className="py-1">
                          <Input type="number" step="1" className="h-7 text-xs text-right w-16" value={l.markup_percent} disabled={!editable}
                            onChange={(e) => upsertLine.mutate({ ...l, markup_percent: +e.target.value })} />
                        </TableCell>
                        <TableCell className="py-1 text-right font-mono">{fmt(computed.sellBbd)}</TableCell>
                        <TableCell className="py-1 text-right font-mono text-muted-foreground">{fmt(computed.sellUsd)}</TableCell>
                        {editable && (
                          <TableCell className="py-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteLine.mutate(l.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                  {lines.length === 0 && (
                    <TableRow><TableCell colSpan={13} className="text-center text-xs py-4 text-muted-foreground">No line items</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Exports Tab */}
          <TabsContent value="exports" className="space-y-3">
            <p className="text-xs text-muted-foreground">Export data for this shipment as CSV files.</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => {
                const { fobBbd, invoiceBbd, totalChargesBbd, totalLandedBbd, multiplier } = totals;
                exportCSV([{
                  invoice_number: shipment.invoice_number, type: shipment.type, supplier_id: shipment.supplier_id,
                  commodity: shipment.commodity, po_ref: shipment.po_ref, date_ordered: shipment.date_ordered,
                  date_received: shipment.date_received, invoice_date: shipment.invoice_date,
                  currency: shipment.currency, exchange_rate: shipment.exchange_rate,
                  fob_foreign: shipment.fob_foreign, fob_bbd: fobBbd.toFixed(2),
                  invoice_total_foreign: shipment.invoice_total_foreign, invoice_total_bbd: invoiceBbd.toFixed(2),
                  total_charges_bbd: totalChargesBbd.toFixed(2), total_landed_bbd: totalLandedBbd.toFixed(2),
                  multiplier: multiplier.toFixed(4), status: shipment.status, version: shipment.version,
                }], `shipment-${shipment.invoice_number}.csv`);
              }}><Download className="h-3 w-3" /> Shipment</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => {
                exportCSV(charges.map((c) => ({
                  charge_type: c.charge_type, amount_bbd: c.amount_bbd, vat_bbd: c.vat_bbd,
                  duty_bbd: c.duty_bbd, vat_reclaimable: c.vat_reclaimable, notes: c.notes,
                  row_total_bbd: ((c.amount_bbd || 0) + (c.vat_bbd || 0) + (c.duty_bbd || 0)).toFixed(2),
                })), `charges-${shipment.invoice_number}.csv`);
              }}><Download className="h-3 w-3" /> Charges</Button>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => {
                exportCSV(lines.map((l) => {
                  const c = computeLineCosts(l, xr, totals.multiplier);
                  return {
                    product_type: l.product_type, description: l.description, quantity: l.quantity,
                    unit_fob_foreign: l.unit_fob_foreign, line_fob_foreign: l.line_fob_foreign,
                    line_fob_bbd: c.lineFobBbd.toFixed(2), landed_unit_bbd: c.landedUnitBbd.toFixed(2),
                    landed_unit_usd: c.landedUnitUsd.toFixed(2), markup_percent: l.markup_percent,
                    sell_bbd: c.sellBbd.toFixed(2), sell_usd: c.sellUsd.toFixed(2),
                  };
                }), `lines-${shipment.invoice_number}.csv`);
              }}><Download className="h-3 w-3" /> Lines</Button>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {isNew && (
        <div className="text-center py-8 text-xs text-muted-foreground border rounded" style={{ background: "hsl(215 20% 97%)" }}>
          Save the shipment first to add Charges and Line Items.
        </div>
      )}
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

const ComputedField = ({ label, value }: { label: string; value: string }) => (
  <div className="text-center">
    <div className="text-[10px] text-muted-foreground">{label}</div>
    <div className="text-sm font-mono font-semibold" style={{ color: "hsl(215 30% 25%)" }}>{value}</div>
  </div>
);

export default ShipmentDetailPage;
