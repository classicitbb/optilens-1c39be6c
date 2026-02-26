import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, AlertTriangle, Settings2, X } from "lucide-react";
import type { Supply, SupplyFormData } from "@/hooks/useSupplies";
import { useReferenceData } from "@/hooks/useReferenceData";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { checkGovernance } from "@/hooks/useGovernanceCheck";
import GovernanceAlert from "@/components/admin/GovernanceAlert";
import ConcessionReasonDialog from "@/components/admin/ConcessionReasonDialog";
import UnsavedChangesDialog from "@/components/admin/UnsavedChangesDialog";
import ReferenceDataModal from "@/components/admin/ReferenceDataModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: Supply | null;
  supplies?: Supply[];
  onSubmit: (form: SupplyFormData, reason?: string) => void;
  onSubmitAndClose?: (form: SupplyFormData, reason?: string) => void;
  onNavigate?: (supply: Supply) => void;
  isPending: boolean;
}

/* Categories are now loaded from supply_categories reference table */

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
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "saveAndClose" | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<Supply | null>(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catEditItem, setCatEditItem] = useState<{ id: string; name: string; abbrev: string; code: string } | null>(null);
  const initialFormRef = useRef<string>("");
  const userEditedRef = useRef(false);
  const { data: suppliers } = useReferenceData("suppliers");
  const { data: brands } = useReferenceData("brands");
  const { data: supplyCategories, createMutation: createCat, updateMutation: updateCat } = useReferenceData("supply_categories");
  const { calculate, settings } = usePricingEngine();

  const activeSuppliers = (suppliers ?? []).filter((s) => s.is_active);
  const activeBrands = (brands ?? []).filter((b) => b.is_active);
  const activeCategories = (supplyCategories ?? []).filter((c) => c.is_active);

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

  useEffect(() => {
    if (open) {
      userEditedRef.current = false;
      const timer = setTimeout(() => { initialFormRef.current = JSON.stringify(form); }, 0);
      return () => clearTimeout(timer);
    }
  }, [open, supply]);

  const calc = useMemo(() => calculate({
    component_type: "supplies",
    supplier_cost: form.base_price,
    currency: form.currency,
    bb_item: form.bb_item,
    vat_recoverable: form.vat_paid,
    duty_applicable: form.duty_added,
    labour_cost: form.labour_added ? form.base_price * 0.05 : 0,
    category: form.category === "lab" || form.category === "optical" ? "supplies" : "addons",
    sell_price: form.sell_price,
  }), [form, calculate]);

  const governance = useMemo(() => checkGovernance(calc, settings, form.base_price), [calc, settings, form.base_price]);

  const set = (key: keyof SupplyFormData, value: any) => {
    userEditedRef.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const currentIndex = supply && supplies ? supplies.findIndex((s) => s.id === supply.id) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = supplies ? currentIndex >= 0 && currentIndex < supplies.length - 1 : false;

  const isDirty = () => JSON.stringify(form) !== initialFormRef.current;

  const handleNavigate = (target: Supply) => {
    if (userEditedRef.current && isDirty() && form.base_price > 0) {
      setPendingNavTarget(target);
      setUnsavedDialogOpen(true);
    } else if (userEditedRef.current && isDirty()) {
      onSubmit(form);
      setTimeout(() => onNavigate?.(target), 100);
    } else {
      onNavigate?.(target);
    }
  };

  const handleUnsavedSave = () => {
    setUnsavedDialogOpen(false);
    onSubmit(form);
    if (pendingNavTarget) {
      setTimeout(() => onNavigate?.(pendingNavTarget), 100);
      setPendingNavTarget(null);
    }
  };

  const handleUnsavedDiscard = () => {
    setUnsavedDialogOpen(false);
    if (pendingNavTarget) {
      onNavigate?.(pendingNavTarget);
      setPendingNavTarget(null);
    }
  };

  const handleUnsavedCancel = () => {
    setUnsavedDialogOpen(false);
    setPendingNavTarget(null);
  };

  const attemptSave = (action: "save" | "saveAndClose") => {
    if (governance.blocked) return;
    if (governance.needsReason) {
      setPendingAction(action);
      setReasonDialogOpen(true);
      return;
    }
    if (action === "save") onSubmit(form);
    else onSubmitAndClose?.(form);
  };

  const handleReasonConfirm = (reason: string) => {
    setReasonDialogOpen(false);
    if (pendingAction === "save") onSubmit(form, reason);
    else onSubmitAndClose?.(form, reason);
    setPendingAction(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptSave("save");
  };

  const inputCls = "h-8 text-xs";
  const labelCls = "text-xs font-medium";
  const sectionCls = "text-[11px] font-semibold uppercase tracking-wider mb-2";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto [&>button[data-radix-collection-item]]:hidden" style={{ borderRadius: "4px" }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
              {supply ? "Edit Supply Item" : "New Supply"}
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
              {supply && onNavigate && supplies && <>
                <span>{currentIndex + 1} / {supplies.length}</span>
                <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                  disabled={!canGoPrev || isPending}
                  onClick={() => canGoPrev && handleNavigate(supplies[currentIndex - 1])}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                  disabled={!canGoNext || isPending}
                  onClick={() => canGoNext && handleNavigate(supplies[currentIndex + 1])}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </>}
              <DialogClose asChild>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6">
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogClose>
            </div>
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
                    <div className="flex items-center gap-1">
                      <Label className={labelCls}>Category</Label>
                      <button type="button" className="p-0.5 rounded hover:bg-black/5" title="Manage categories" onClick={() => { setCatEditItem(null); setCatModalOpen(true); }}>
                        <Settings2 className="h-3 w-3" style={{ color: "hsl(215 15% 50%)" }} />
                      </button>
                    </div>
                    <Select value={form.category} onValueChange={(v) => set("category", v)}>
                      <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {activeCategories.map((c) => <SelectItem key={c.code || c.id} value={c.code || c.id}>{c.name}</SelectItem>)}
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
                    <Label className={labelCls}>{form.bb_item ? "Cost (BBD)" : "Cost (USD)"}</Label>
                    <Input className={inputCls} type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => set("base_price", +e.target.value)} />
                  </div>
                  <div>
                    <Label className={labelCls}>Sell Price (BBD)</Label>
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
                    <ReadOnly label="FX Rate" value={calc.fx_rate_used.toFixed(4)} />
                    <ReadOnly label="Converted (BBD)" value={fmt(calc.converted_cost)} />
                    <ReadOnly label="CIF (BBD)" value={fmt(calc.cif)} />
                    <ReadOnly label="Duty (BBD)" value={fmt(calc.duty)} />
                    <ReadOnly label="Charges (BBD)" value={fmt(calc.charges)} />
                    <ReadOnly label="VAT (BBD)" value={fmt(calc.vat)} />
                    <ReadOnly label="Landed (BBD)" value={fmt(calc.landed_cost)} highlight />
                    <ReadOnly label="Overhead (BBD)" value={fmt(calc.overhead)} />
                    <ReadOnly label="Financing (BBD)" value={fmt(calc.financing)} />
                    <ReadOnly label="Holding (BBD)" value={fmt(calc.holding)} />
                    <ReadOnly label="Shrinkage (BBD)" value={fmt(calc.shrinkage)} />
                    <ReadOnly label="Labour (BBD)" value={fmt(calc.labour)} />
                    <ReadOnly label="Full Cost (BBD)" value={fmt(calc.full_cost)} highlight />
                    <ReadOnly label="Strat. Price (BBD)" value={fmt(calc.strategic_price)} />
                    <ReadOnly label="Margin" value={calc.margin != null ? fmtPct(calc.margin) : "—"} />
                    <ReadOnly label="Sell (USD)" value={calc.sell_price_usd != null ? fmt(calc.sell_price_usd) : "—"} />
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

              {/* Governance Alert */}
              {governance.blocked && <GovernanceAlert reasons={governance.blockReasons} />}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} disabled={isPending || !form.name || governance.blocked}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            {onSubmitAndClose && (
              <Button type="button" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 45% 35%)", color: "white", borderRadius: "4px" }} disabled={isPending || !form.name || governance.blocked} onClick={() => attemptSave("saveAndClose")}>
                Save & Close
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>

      <ConcessionReasonDialog
        open={reasonDialogOpen}
        onConfirm={handleReasonConfirm}
        onCancel={() => { setReasonDialogOpen(false); setPendingAction(null); }}
      />
      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        onSave={handleUnsavedSave}
        onDiscard={handleUnsavedDiscard}
        onCancel={handleUnsavedCancel}
      />
      <ReferenceDataModal
        open={catModalOpen}
        onOpenChange={(o) => { setCatModalOpen(o); if (!o) setCatEditItem(null); }}
        mode={catEditItem ? "edit" : "create"}
        initialName={catEditItem?.name ?? ""}
        initialAbbrev={catEditItem?.abbrev ?? ""}
        initialCode={catEditItem?.code ?? ""}
        entityLabel="Supply Category"
        isPending={createCat.isPending || updateCat.isPending}
        onSubmit={(vals) => {
          if (catEditItem) {
            updateCat.mutate({ id: catEditItem.id, updates: vals }, { onSuccess: () => { setCatModalOpen(false); setCatEditItem(null); } });
          } else {
            createCat.mutate(vals, { onSuccess: () => { setCatModalOpen(false); } });
          }
        }}
      />
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
