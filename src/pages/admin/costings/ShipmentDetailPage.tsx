import { useParams, useNavigate } from "react-router";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useShipmentCharges, useShipmentLines, computeShipmentTotals, computeLineCosts, type Shipment, type ShipmentCharge, type ShipmentLine } from "@/hooks/useShipments";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useShipmentTypes, useChargeTypes } from "@/hooks/useImportCostingRefs";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { ArrowLeft, Save, Plus, Trash2, Download, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeChargeRowTotal, computeInsuranceFreightCharge, formatMoney } from "@/lib/importCostings";

const fmt = formatMoney;

/** A text input for numeric values that only saves on blur */
const NumericInput = ({
  value,
  onChange,
  disabled,
  className,
  onAdvance,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  className?: string;
  onAdvance?: () => void;
}) => {
  const [local, setLocal] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setLocal(String(value));
    }
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(local);
    if (!isNaN(parsed) && parsed !== value) {
      onChange(parsed);
    } else if (local === "" || isNaN(parseFloat(local))) {
      setLocal(String(value));
    }
  };

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={className}
      value={local}
      disabled={disabled}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          onAdvance?.();
        }
      }}
    />
  );
};

/** A text input that only saves on blur */
const TextInput = ({
  value,
  onChange,
  disabled,
  className,
  onAdvance,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  onAdvance?: () => void;
}) => {
  const [local, setLocal] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setLocal(value);
    }
  }, [value]);

  const commit = () => {
    if (local !== value) onChange(local);
  };

  return (
    <Input
      ref={ref}
      type="text"
      className={className}
      value={local}
      disabled={disabled}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          onAdvance?.();
        }
      }}
    />
  );
};

/** Searchable product combobox */
const ProductCombobox = ({
  options,
  value,
  onSelect,
  disabled,
}: {
  options: { id: string; label: string }[];
  value: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-7 text-xs w-44 justify-between font-normal px-2"
        >
          <span className="truncate">{selected?.label ?? "Select…"}</span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products…" className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-2 text-xs">No results</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.id}
                  value={o.label}
                  onSelect={() => {
                    onSelect(o.id);
                    setOpen(false);
                  }}
                  className="text-xs"
                >
                  <Check className={cn("mr-1 h-3 w-3 shrink-0", value === o.id ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/** Focus next tabbable input in the table */
const focusNextInput = (current: EventTarget) => {
  const el = current as HTMLElement;
  const table = el.closest("table");
  if (!table) return;
  const inputs = Array.from(table.querySelectorAll<HTMLInputElement>("input:not([disabled]), button:not([disabled])"));
  const idx = inputs.indexOf(el as HTMLInputElement);
  if (idx >= 0 && idx < inputs.length - 1) {
    inputs[idx + 1].focus();
  }
};

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
    currency: "USD", exchange_rate: 2, fob_foreign: 0, invoice_total_foreign: 0, freight_provider: "dhl",
    status: "draft", version: 1, parent_id: null, created_by: user?.id ?? "",
    created_at: "", updated_at: "",
  };

  const [shipment, setShipment] = useState<Shipment | null>(isNew ? defaultShipment : null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [invoiceTouched, setInvoiceTouched] = useState(false);

  const { data: suppliers } = useReferenceData("suppliers");
  const { settings } = usePricingEngine();
  const { data: shipmentTypes = [] } = useShipmentTypes();
  const { data: chargeTypes = [] } = useChargeTypes();
  const activeChargeTypes = chargeTypes.filter(ct => ct.is_active);
  const { data: lenses = [] } = useLenses();
  const { data: supplies = [] } = useSupplies();
  const { data: addons = [] } = useAddons();
  const realId = isNew ? null : (id ?? null);
  const { data: charges = [], upsertMutation: upsertCharge, deleteMutation: deleteCharge } = useShipmentCharges(realId);
  const { data: lines = [], upsertMutation: upsertLine, deleteMutation: deleteLine } = useShipmentLines(realId);

  useEffect(() => {
    if (isNew || !id) return;
    (async () => {
      const { data, error } = await (supabase.from("shipments") as any).select("*").eq("id", id).single();
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
      const s = data as Shipment;
      setShipment(s);
      if (s.invoice_total_foreign !== s.fob_foreign) setInvoiceTouched(true);
      setLoading(false);
    })();
  }, [id]);

  const isLocked = shipment?.status === "locked";
  const editable = canEdit && !isLocked;
  const LENS_CODES = ["lens", "stklens", "osrxlens"];
  const isLensShipment = LENS_CODES.includes(shipment?.type ?? "");

  const totals = useMemo(() => {
    if (!shipment) return { exchangeRate: 1, fobBbd: 0, invoiceBbd: 0, amountTotal: 0, vatTotal: 0, dutyTotal: 0, totalChargesBbd: 0, totalLandedBbd: 0, totalLandedUsd: 0, charityAllocationBbd: 0, totalShipmentCostBbd: 0, multiplier: 0 };
    return computeShipmentTotals(shipment, charges, settings);
  }, [shipment, charges, settings]);

  const updateField = (field: string, value: any) => {
    if (!shipment) return;
    if (field === "fob_foreign" && !invoiceTouched) {
      setShipment({ ...shipment, fob_foreign: value, invoice_total_foreign: value } as Shipment);
    } else {
      setShipment({ ...shipment, [field]: value } as Shipment);
    }
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
        const { data, error } = await (supabase.from("shipments") as any)
          .insert({ ...form, created_by: user?.id })
          .select()
          .single();
        if (error) throw error;
        logChange({ table_name: "shipments", record_id: data.id, action: "create", new_data: data });
        toast({ title: "Shipment created" });
        navigate(`/admin/pricing/costings/${data.id}`, { replace: true });
      } else {
        const { id: _, created_at, updated_at, supplier_name, ...form } = shipment as any;
        const { error } = await (supabase.from("shipments") as any).update(form).eq("id", id);
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
      const { error } = await (supabase.from("shipments") as any).update({ status: newStatus }).eq("id", id);
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
    await upsertCharge.mutateAsync({ shipment_id: id, charge_type: activeChargeTypes[0]?.name ?? "Miscellaneous", amount_bbd: 0, sort_order: charges.length });
  };

  const addLine = async () => {
    if (!id || isNew) return;
    await upsertLine.mutateAsync({ shipment_id: id, product_type: isLensShipment ? "lens" : "free", description: "", quantity: 1, unit_fob_foreign: 0, line_fob_foreign: 0, markup_percent: 30, sort_order: lines.length });
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

  // Product selector options — for non-lens, combine supplies + addons
  const dedup = (items: { id: string; label: string }[]) => {
    const seen = new Set<string>();
    return items.filter(i => { if (seen.has(i.label)) return false; seen.add(i.label); return true; });
  };
  const lensOptions = useMemo(() => dedup(lenses.filter(l => l.is_active).map(l => ({ id: l.id, label: l.name }))), [lenses]);
  const supplyOptions = useMemo(() => dedup(supplies.filter(s => s.is_active).map(s => ({ id: s.id, label: s.name }))), [supplies]);
  const addonOptions = useMemo(() => dedup(addons.filter(a => a.is_active).map(a => ({ id: a.id, label: a.name }))), [addons]);

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
    const updates: Partial<ShipmentLine> = { id: line.id, lens_id: null, supply_id: null, addon_id: null };
    if (line.product_type === "lens") updates.lens_id = productId;
    else if (line.product_type === "supply") updates.supply_id = productId;
    else if (line.product_type === "addon") updates.addon_id = productId;

    const opts = getProductOptions(line.product_type);
    const match = opts.find(o => o.id === productId);
    if (match) updates.description = match.label;

    upsertLine.mutate(updates);
  };

  const handleProductTypeChange = (line: ShipmentLine, newType: string) => {
    upsertLine.mutate({ id: line.id, product_type: newType as any, lens_id: null, supply_id: null, addon_id: null });
  };

  // Charge field updater (blur-based) — send only the changed field to avoid
  // stale-closure spreads clobbering values saved by other cells.
  const updateCharge = useCallback((charge: ShipmentCharge, field: string, value: any) => {
    upsertCharge.mutate({ id: charge.id, [field]: value } as Partial<ShipmentCharge>);
  }, [upsertCharge]);

  // Line field updater (blur-based) — partial update by id only.
  const updateLine = useCallback((line: ShipmentLine, updates: Partial<ShipmentLine>) => {
    upsertLine.mutate({ id: line.id, ...updates });
  }, [upsertLine]);

  if (loading || !shipment) return <div className="p-4 text-sm text-muted-foreground">Loading…</div>;

  const xr = totals.exchangeRate || shipment.exchange_rate || 1;
  const insuranceFreightAmount = computeInsuranceFreightCharge(charges);

  return (
    <div className="p-4 space-y-4 w-fit min-w-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-foreground">
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
              {shipmentTypes.filter(t => t.is_active).map(t => (
                <SelectItem key={t.id} value={t.code}>{t.name}</SelectItem>
              ))}
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
        <Field label="PO / Order Ref/AWB#">
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
          <NumericInput value={shipment.exchange_rate} onChange={(v) => updateField("exchange_rate", v)} disabled={!editable} className="h-8 text-xs text-right" />
        </Field>
        <Field label={`FOB (${shipment.currency}) *`}>
          <NumericInput value={shipment.fob_foreign} onChange={(v) => updateField("fob_foreign", v)} disabled={!editable} className="h-8 text-xs text-right" />
        </Field>
        <Field label={`Invoice Total (${shipment.currency}) *`}>
          <NumericInput value={shipment.invoice_total_foreign} onChange={(v) => { setInvoiceTouched(true); updateField("invoice_total_foreign", v); }} disabled={!editable} className="h-8 text-xs text-right" />
        </Field>
        <Field label="Freight Provider">
          <div className="flex h-8 items-center justify-between rounded-md border border-input bg-background px-3">
            <span className="text-xs font-medium text-foreground">DHL / non-DHL</span>
            <Switch
              checked={(shipment.freight_provider ?? "dhl") === "dhl"}
              disabled={!editable}
              onCheckedChange={(checked) => updateField("freight_provider", checked ? "dhl" : "non-dhl")}
              aria-label="Toggle freight provider between DHL and non-DHL"
            />
          </div>
        </Field>
      </div>

      {/* Computed summary */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Dials</h2>
          <span className="text-xs text-muted-foreground">Rates use pricing settings for {shipment.currency} when available.</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 rounded border border-border bg-muted p-3">
          <ComputedField label="FOB (BBD)" value={fmt(totals.fobBbd)} />
          <ComputedField label="Invoice (BBD)" value={fmt(totals.invoiceBbd)} />
          <ComputedField label="10% of Ins. & Frt. to Charity">
            <div className="space-y-0.5 text-center">
              <div className="text-sm font-mono font-semibold text-foreground">{fmt(totals.charityAllocationBbd)}</div>
              <div className="text-[10px] text-muted-foreground">{fmt(totals.charityAllocationBbd)} + {fmt(totals.totalChargesBbd)} = {fmt(totals.totalShipmentCostBbd)}</div>
            </div>
          </ComputedField>
          <ComputedField label="Total Charges (BBD)" value={fmt(totals.totalChargesBbd)} />
          <ComputedField label="Total Landed (BBD)" value={fmt(totals.totalLandedBbd)} />
          <ComputedField label="Multiplier" value={totals.multiplier.toFixed(4)} />
        </div>
      </section>

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
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-8 w-[160px]">Charge Type</TableHead>
                    <TableHead className="h-8 text-right w-[96px]">Amount</TableHead>
                    <TableHead className="h-8 text-right w-[96px]">VAT</TableHead>
                    <TableHead className="h-8 text-right w-[96px]">Duty</TableHead>
                    <TableHead className="h-8 w-[100px]">VAT Reclaimable</TableHead>
                    <TableHead className="h-8 w-[140px]">Notes</TableHead>
                    <TableHead className="h-8 text-right w-[96px]">Row Total</TableHead>
                    {editable && <TableHead className="h-8 w-10" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.map((c) => {
                    const rowTotal = computeChargeRowTotal(c);
                    return (
                      <TableRow key={c.id} className="text-xs">
                        <TableCell className="py-1">
                          <Select value={c.charge_type} disabled={!editable} onValueChange={(v) => updateCharge(c, "charge_type", v)}>
                            <SelectTrigger className="h-7 text-xs border-0 shadow-none"><SelectValue /></SelectTrigger>
                            <SelectContent>{activeChargeTypes.map((ct) => <SelectItem key={ct.id} value={ct.name}>{ct.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-1">
                          <NumericInput value={c.amount_bbd} disabled={!editable} className="h-7 text-xs text-right w-full"
                            onChange={(v) => updateCharge(c, "amount_bbd", v)} onAdvance={() => {}} />
                        </TableCell>
                        <TableCell className="py-1">
                          <NumericInput value={c.vat_bbd ?? 0} disabled={!editable} className="h-7 text-xs text-right w-full"
                            onChange={(v) => updateCharge(c, "vat_bbd", v)} onAdvance={() => {}} />
                        </TableCell>
                        <TableCell className="py-1">
                          <NumericInput value={c.duty_bbd ?? 0} disabled={!editable} className="h-7 text-xs text-right w-full"
                            onChange={(v) => updateCharge(c, "duty_bbd", v)} onAdvance={() => {}} />
                        </TableCell>
                        <TableCell className="py-1">
                          <Switch checked={c.vat_reclaimable} disabled={!editable}
                            onCheckedChange={(v) => updateCharge(c, "vat_reclaimable", v)} />
                        </TableCell>
                        <TableCell className="py-1">
                          <TextInput value={c.notes ?? ""} disabled={!editable} className="h-7 text-xs w-full"
                            onChange={(v) => updateCharge(c, "notes", v)} onAdvance={() => {}} />
                        </TableCell>
                        <TableCell className="py-1 text-right"><AlignedMoney value={rowTotal} /></TableCell>
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
                  {charges.length > 0 && (
                    <TableRow className="bg-muted/60 text-xs font-semibold">
                      <TableCell className="py-2">Totals</TableCell>
                      <TableCell className="py-2 text-right"><AlignedMoney value={totals.amountTotal} /></TableCell>
                      <TableCell className="py-2 text-right"><AlignedMoney value={totals.vatTotal} /></TableCell>
                      <TableCell className="py-2 text-right font-mono">{fmt(totals.dutyTotal)}</TableCell>
                      <TableCell className="py-2" />
                      <TableCell className="py-2 text-[11px] text-muted-foreground">Insurance &amp; Freight: <span className="font-mono text-foreground">{fmt(insuranceFreightAmount)}</span></TableCell>
                      <TableCell className="py-2 text-right"><AlignedMoney value={totals.totalChargesBbd} /></TableCell>
                      {editable && <TableCell className="py-2" />}
                    </TableRow>
                  )}
                  {charges.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-xs py-4 text-muted-foreground">No charges added</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between">
              <div>
                {editable && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addCharge}><Plus className="h-3 w-3" /> Add Charge</Button>}
              </div>
              <div className="text-right">
                <div className="text-[11px] font-medium text-muted-foreground">Total Charges (BBD)</div>
                <AlignedMoney value={totals.totalChargesBbd} className="text-sm font-semibold text-foreground" />
              </div>
            </div>
          </TabsContent>

          {/* Line Items Tab */}
          <TabsContent value="lines" className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Multiplier: {totals.multiplier.toFixed(4)}</span>
              {editable && <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addLine}><Plus className="h-3 w-3" /> Add Line</Button>}
            </div>
            <div className="border rounded overflow-auto">
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="h-8 w-[80px]">Type</TableHead>
                    <TableHead className="h-8 w-[160px]">Product</TableHead>
                    <TableHead className="h-8 w-[150px]">Description</TableHead>
                    <TableHead className="h-8 text-right w-[60px]">Qty</TableHead>
                    <TableHead className="h-8 text-right w-[100px]">Unit FOB ({shipment.currency})</TableHead>
                    <TableHead className="h-8 text-right w-[100px]">Line FOB ({shipment.currency})</TableHead>
                    <TableHead className="h-8 text-right w-[100px]">Line FOB (BBD)</TableHead>
                    <TableHead className="h-8 text-right w-[100px]">Landed/Unit (BBD)</TableHead>
                    <TableHead className="h-8 text-right w-[100px]">Landed/Unit (USD)</TableHead>
                    <TableHead className="h-8 text-right w-[70px]">Markup %</TableHead>
                    <TableHead className="h-8 text-right w-[90px]">Sell (BBD)</TableHead>
                    <TableHead className="h-8 text-right w-[90px]">Sell (USD)</TableHead>
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
                            <SelectTrigger className="h-7 text-xs border-0 shadow-none w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {isLensShipment ? (
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
                            <ProductCombobox
                              options={productOpts}
                              value={selectedProductId}
                              onSelect={(pid) => handleProductSelect(l, pid)}
                              disabled={!editable}
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-1">
                          <TextInput value={l.description} disabled={!editable} className="h-7 text-xs w-full"
                            onChange={(v) => updateLine(l, { description: v })} />
                        </TableCell>
                        <TableCell className="py-1">
                          <NumericInput value={l.quantity} disabled={!editable} className="h-7 text-xs text-right w-full"
                            onChange={(qty) => updateLine(l, { quantity: qty, line_fob_foreign: l.unit_fob_foreign * qty })} />
                        </TableCell>
                        <TableCell className="py-1">
                          <NumericInput value={l.unit_fob_foreign} disabled={!editable} className="h-7 text-xs text-right w-full"
                            onChange={(unitFob) => updateLine(l, { unit_fob_foreign: unitFob, line_fob_foreign: unitFob * l.quantity })} />
                        </TableCell>
                        <TableCell className="py-1 text-right font-mono">{fmt(l.line_fob_foreign)}</TableCell>
                        <TableCell className="py-1 text-right font-mono">{fmt(computed.lineFobBbd)}</TableCell>
                        <TableCell className="py-1 text-right font-mono">{fmt(computed.landedUnitBbd)}</TableCell>
                        <TableCell className="py-1 text-right font-mono text-muted-foreground">{fmt(computed.landedUnitUsd)}</TableCell>
                        <TableCell className="py-1">
                          <NumericInput value={l.markup_percent} disabled={!editable} className="h-7 text-xs text-right w-full"
                            onChange={(v) => updateLine(l, { markup_percent: v })} />
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
            {editable && (
              <div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={addLine}><Plus className="h-3 w-3" /> Add Line</Button>
              </div>
            )}
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
                  fob_foreign: shipment.fob_foreign, freight_provider: shipment.freight_provider ?? "dhl", fob_bbd: fobBbd.toFixed(2),
                  invoice_total_foreign: shipment.invoice_total_foreign, invoice_total_bbd: invoiceBbd.toFixed(2),
                  total_charges_bbd: totalChargesBbd.toFixed(2), charity_allocation_bbd: totals.charityAllocationBbd.toFixed(2), total_shipment_cost_bbd: totals.totalShipmentCostBbd.toFixed(2), total_landed_bbd: totalLandedBbd.toFixed(2),
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
        <div className="text-center py-8 text-xs text-muted-foreground border border-border rounded bg-muted">
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

const ComputedField = ({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) => (
  <div className="text-center">
    <div className="text-[10px] text-muted-foreground">{label}</div>
    {children ?? <div className="text-sm font-mono font-semibold text-foreground">{value}</div>}
  </div>
);

const AlignedMoney = ({ value, className }: { value: number; className?: string }) => {
  const fixed = Math.abs(value).toFixed(2);
  const [whole, cents] = fixed.split(".");
  const sign = value < 0 ? "-" : "";

  return (
    <span className={cn("inline-flex min-w-[88px] items-baseline justify-end font-mono tabular-nums", className)}>
      <span>{sign}{Number(whole).toLocaleString()}</span>
      <span className="w-[2.5ch] text-right">.{cents}</span>
    </span>
  );
};

export default ShipmentDetailPage;
