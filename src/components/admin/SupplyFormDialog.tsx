import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import type { Supply, SupplyFormData } from "@/hooks/useSupplies";
import { useReferenceData } from "@/hooks/useReferenceData";
import { usePricingEngine } from "@/hooks/usePricingEngine";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: Supply | null;
  supplies?: Supply[];
  onSubmit: (form: SupplyFormData) => void;
  onSubmitAndClose?: (form: SupplyFormData) => void;
  onNavigate?: (supply: Supply) => void;
  isPending: boolean;
}

const CATEGORIES = [
  { value: "lab", label: "Lab Supplies" },
  { value: "optical", label: "Optical Supplies" },
  { value: "accessories", label: "Eyewear Accessories" },
];

const UNITS = ["each", "box", "case", "pack", "roll", "bottle", "pair"];

const defaultForm: SupplyFormData = {
  name: "", category: "lab", description: "", sku: "",
  base_price: 0, sell_price: 0, unit: "each", quantity_per_unit: 1,
  is_active: true, show_on_website: false, image_url: null, notes: null,
  supplier_id: null, brand_id: null,
  preferred: false, stocked: false, show_in_pricelist: false,
  bin: "", detail: "", currency: "USD",
  bb_item: false, duty_added: false, vat_paid: false, labour_added: false, stk_wspl: false,
};

const fmt = (n: number) => n.toFixed(2);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const MARGIN_STATUS_COLORS: Record<string, string> = {
  healthy: "bg-green-100 text-green-800",
  thin: "bg-yellow-100 text-yellow-800",
  below_floor: "bg-orange-100 text-orange-800",
  loss: "bg-red-100 text-red-800",
};

const SupplyFormDialog = ({ open, onOpenChange, supply, supplies, onSubmit, onSubmitAndClose, onNavigate, isPending }: Props) => {
  const [form, setForm] = useState<SupplyFormData>(defaultForm);
  const { data: suppliers } = useReferenceData("suppliers");
  const { data: brands } = useReferenceData("brands");
  const { calculate } = usePricingEngine();

  const activeSuppliers = (suppliers ?? []).filter((s) => s.is_active);
  const activeBrands = (brands ?? []).filter((b) => b.is_active);

  useEffect(() => {
    if (supply) {
      setForm({
        name: supply.name, category: supply.category, description: supply.description,
        sku: supply.sku, base_price: supply.base_price, sell_price: supply.sell_price,
        unit: supply.unit, quantity_per_unit: supply.quantity_per_unit,
        is_active: supply.is_active, show_on_website: supply.show_on_website,
        image_url: supply.image_url, notes: supply.notes,
        supplier_id: supply.supplier_id, brand_id: supply.brand_id,
        preferred: supply.preferred, stocked: supply.stocked,
        show_in_pricelist: supply.show_in_pricelist, bin: supply.bin,
        detail: supply.detail, currency: supply.currency,
        bb_item: supply.bb_item, duty_added: supply.duty_added,
        vat_paid: supply.vat_paid, labour_added: supply.labour_added,
        stk_wspl: supply.stk_wspl,
      });
    } else {
      setForm(defaultForm);
    }
  }, [supply, open]);

  const calc = useMemo(() => calculate({
    component_type: "supplies",
    supplier_cost: form.base_price,
    currency: form.currency,
    bb_item: form.bb_item,
    vat_recoverable: form.vat_paid,
    duty_applicable: form.duty_added,
    labour_cost: form.labour_added ? form.base_price * 0.05 : 0, // placeholder labour
    category: form.category === "lab" || form.category === "optical" ? "supplies" : "addons",
    sell_price: form.sell_price,
  }), [form, calculate]);

  const set = (key: keyof SupplyFormData, value: any) => setForm((f) => ({ ...f, [key]: value }));

  // Navigation
  const currentIndex = supply && supplies ? supplies.findIndex((s) => s.id === supply.id) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = supplies ? currentIndex >= 0 && currentIndex < supplies.length - 1 : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const handleSaveAndClose = () => {
    onSubmitAndClose?.(form);
  };

  const inputCls = "h-8 text-xs";
  const labelCls = "text-xs font-medium";
  const sectionCls = "text-[11px] font-semibold uppercase tracking-wider mb-2";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: "4px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {supply && onNavigate && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canGoPrev || isPending}
                onClick={() => canGoPrev && supplies && onNavigate(supplies[currentIndex - 1])}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-sm font-semibold flex-1" style={{ color: "hsl(215 30% 15%)" }}>
              {supply ? "Edit Supply Item" : "New Supply"}
            </DialogTitle>
            {supply && onNavigate && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canGoNext || isPending}
                onClick={() => canGoNext && supplies && onNavigate(supplies[currentIndex + 1])}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              <div>
                <p className={sectionCls} style={{ color: "hsl(215 15% 45%)" }}>Item Info</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <Label className={labelCls}>Name *</Label>
                    <Input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} required />
                  </div>
                  <div>
                    <Label className={labelCls}>SKU</Label>
                    <Input className={inputCls} value={form.sku} onChange={(e) => set("sku", e.target.value)} />
                  </div>
                  <div>
                    <Label className={labelCls}>Category</Label>
                    <Select value={form.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className={labelCls}>Supplier</Label>
                    <Select value={form.supplier_id ?? "__none__"} onValueChange={(v) => set("supplier_id", v === "__none__" ? null : v)}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {activeSuppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className={labelCls}>Brand</Label>
                    <Select value={form.brand_id ?? "__none__"} onValueChange={(v) => set("brand_id", v === "__none__" ? null : v)}>
                      <SelectTrigger className={inputCls}><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {activeBrands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-4">
                    <Label className={labelCls}>Description</Label>
                    <Textarea className="text-xs min-h-[50px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <Label className={labelCls}>Detail</Label>
                    <Textarea className="text-xs min-h-[40px]" value={form.detail} onChange={(e) => set("detail", e.target.value)} />
                  </div>
                  <div>
                    <Label className={labelCls}>Bin</Label>
                    <Input className={inputCls} value={form.bin} onChange={(e) => set("bin", e.target.value)} />
                  </div>
                  <div>
                    <Label className={labelCls}>Unit</Label>
                    <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={labelCls}>Qty/Unit</Label>
                    <Input className={inputCls} type="number" min="1" value={form.quantity_per_unit} onChange={(e) => set("quantity_per_unit", +e.target.value)} />
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <Label className={labelCls}>Notes</Label>
                <Textarea className="text-xs min-h-[40px]" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Flags */}
              <div>
                <p className={sectionCls} style={{ color: "hsl(215 15% 45%)" }}>Flags</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {([
                    ["is_active", "Active"],
                    ["show_on_website", "Website"],
                    ["preferred", "Preferred"],
                    ["stocked", "Stocked"],
                    ["show_in_pricelist", "Price List"],
                    ["stk_wspl", "Stk WSPL"],
                  ] as [keyof SupplyFormData, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs">
                      <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <Separator />

              {/* Pricing & Cost */}
              <div>
                <p className={sectionCls} style={{ color: "hsl(215 15% 45%)" }}>Pricing & Cost</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className={labelCls}>Currency</Label>
                    <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="BBD">BBD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className={labelCls}>Cost</Label>
                    <Input className={inputCls} type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => set("base_price", +e.target.value)} />
                  </div>
                  <div>
                    <Label className={labelCls}>Sell Price</Label>
                    <Input className={inputCls} type="number" step="0.01" min="0" value={form.sell_price} onChange={(e) => set("sell_price", +e.target.value)} />
                  </div>
                  <div />
                  {([
                    ["bb_item", "BB Item"],
                    ["duty_added", "Duty Added"],
                    ["vat_paid", "VAT Paid"],
                    ["labour_added", "Labour Added"],
                  ] as [keyof SupplyFormData, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-1.5 text-xs">
                      <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <Separator />

              {/* Calculated Values */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className={sectionCls + " mb-0"} style={{ color: "hsl(215 15% 45%)" }}>Calculated Values</p>
                  {calc?.margin_status && (
                    <Badge className={`text-[10px] px-1.5 py-0 ${MARGIN_STATUS_COLORS[calc.margin_status]}`}>
                      {calc.margin_status === "loss" && <AlertTriangle className="h-3 w-3 mr-0.5" />}
                      {calc.margin_status}
                    </Badge>
                  )}
                </div>
                {calc ? (
                  <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 text-xs">
                    <ReadOnly label="Converted" value={fmt(calc.converted_cost)} />
                    <ReadOnly label="CIF" value={fmt(calc.cif)} />
                    <ReadOnly label="Duty" value={fmt(calc.duty)} />
                    <ReadOnly label="Charges" value={fmt(calc.charges)} />
                    <ReadOnly label="VAT" value={fmt(calc.vat)} />
                    <ReadOnly label="Landed" value={fmt(calc.landed_cost)} highlight />
                    <ReadOnly label="Overhead" value={fmt(calc.overhead)} />
                    <ReadOnly label="Financing" value={fmt(calc.financing)} />
                    <ReadOnly label="Holding" value={fmt(calc.holding)} />
                    <ReadOnly label="Shrinkage" value={fmt(calc.shrinkage)} />
                    <ReadOnly label="Labour" value={fmt(calc.labour)} />
                    <ReadOnly label="Full Cost" value={fmt(calc.full_cost)} highlight />
                    <ReadOnly label="Strat. Price" value={fmt(calc.strategic_price)} />
                    <ReadOnly label="Margin" value={calc.margin != null ? fmtPct(calc.margin) : "—"} />
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Loading pricing settings…</p>
                )}
                {calc?.governance_flags && (calc.governance_flags.at_loss || calc.governance_flags.below_floor) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {calc.governance_flags.at_loss && <Badge variant="destructive" className="text-[10px]">At Loss</Badge>}
                    {calc.governance_flags.below_floor && <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-700">Below Floor</Badge>}
                    {calc.governance_flags.below_target && <Badge variant="outline" className="text-[10px]">Below Target</Badge>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} disabled={isPending || !form.name}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            {onSubmitAndClose && (
              <Button type="button" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 45% 35%)", color: "white", borderRadius: "4px" }} disabled={isPending || !form.name} onClick={handleSaveAndClose}>
                Save & Close
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ReadOnly = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div>
    <span className="text-[10px]" style={{ color: "hsl(215 15% 50%)" }}>{label}</span>
    <div
      className="h-7 flex items-center px-2 rounded text-xs tabular-nums"
      style={{
        background: highlight ? "hsl(215 60% 95%)" : "hsl(215 20% 97%)",
        color: "hsl(215 30% 15%)",
        fontWeight: highlight ? 600 : 400,
      }}
    >
      {value}
    </div>
  </div>
);

export default SupplyFormDialog;
