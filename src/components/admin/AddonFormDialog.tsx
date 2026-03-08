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
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronLeft, ChevronRight, AlertTriangle, X } from "lucide-react";
import type { Addon, AddonFormData } from "@/hooks/useAddons";
import type { PricingSheet } from "@/hooks/usePricingSheets";
import type { AddonPricingSheet } from "@/hooks/useAddonPricingSheets";
import { useReferenceData } from "@/hooks/useReferenceData";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { checkGovernance } from "@/hooks/useGovernanceCheck";
import GovernanceAlert from "@/components/admin/GovernanceAlert";
import ConcessionReasonDialog from "@/components/admin/ConcessionReasonDialog";
import UnsavedChangesDialog from "@/components/admin/UnsavedChangesDialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addon: Addon | null;
  addons?: Addon[];
  onSubmit: (form: AddonFormData, sheetAssignments: {pricing_sheet_id: string;price_override: number | null;}[], reason?: string) => void;
  onSubmitAndClose?: (form: AddonFormData, sheetAssignments: {pricing_sheet_id: string;price_override: number | null;}[], reason?: string) => void;
  onNavigate?: (addon: Addon) => void;
  isPending: boolean;
  pricingSheets: PricingSheet[];
  addonPricingSheets: AddonPricingSheet[];
}

const CATEGORIES = [
{ value: "coating", label: "Coating" },
{ value: "mirror", label: "Mirror" },
{ value: "ar_coating", label: "AR Coating" },
{ value: "prism", label: "Prism" },
{ value: "high_power", label: "High Power" },
{ value: "other", label: "Other" }];


const defaultForm: AddonFormData = {
  name: "",
  sku: "",
  category: "other",
  description: "",
  cost: 0,
  price: 0,
  is_auto: false,
  auto_rule: null,
  is_active: true,
  show_on_website: false,
  sort_order: 0,
  supplier_id: null
};

interface SheetAssignment {
  pricing_sheet_id: string;
  price_override: string;
  checked: boolean;
}

const fmt = (n: number) => n.toFixed(2);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const MARGIN_STATUS_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  thin: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  below_floor: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  loss: "bg-red-500/15 text-red-700 dark:text-red-400"
};

const AddonFormDialog = ({ open, onOpenChange, addon, addons, onSubmit, onSubmitAndClose, onNavigate, isPending, pricingSheets, addonPricingSheets }: Props) => {
  const [form, setForm] = useState<AddonFormData>(defaultForm);
  const [ruleText, setRuleText] = useState("");
  const [sheets, setSheets] = useState<SheetAssignment[]>([]);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "saveAndClose" | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<Addon | null>(null);
  const initialFormRef = useRef<string>("");
  const userEditedRef = useRef(false);
  const { data: suppliers } = useReferenceData("suppliers");
  const activeSuppliers = (suppliers ?? []).filter((s) => s.is_active);
  const { calculate, settings } = usePricingEngine();

  useEffect(() => {
    if (addon) {
      setForm({
        name: addon.name, sku: addon.sku, category: addon.category, description: addon.description,
        cost: addon.cost, price: addon.price, is_auto: addon.is_auto, auto_rule: addon.auto_rule,
        is_active: addon.is_active, show_on_website: addon.show_on_website, sort_order: addon.sort_order,
        supplier_id: addon.supplier_id
      });
      setRuleText(addon.auto_rule ? JSON.stringify(addon.auto_rule, null, 2) : "");
    } else {
      setForm(defaultForm);
      setRuleText("");
    }
    const activeSheets = pricingSheets.filter((s) => s.is_active);
    setSheets(
      activeSheets.map((s) => {
        const existing = addonPricingSheets.find((a) => a.pricing_sheet_id === s.id);
        return {
          pricing_sheet_id: s.id,
          price_override: existing?.price_override != null ? String(existing.price_override) : "",
          checked: !!existing
        };
      })
    );
  }, [addon, open, pricingSheets, addonPricingSheets]);

  useEffect(() => {
    if (open) {
      userEditedRef.current = false;
      const timer = setTimeout(() => {initialFormRef.current = JSON.stringify(form);}, 0);
      return () => clearTimeout(timer);
    }
  }, [open, addon]);

  const calc = useMemo(() => calculate({
    component_type: "addons",
    supplier_cost: form.cost,
    currency: "USD",
    bb_item: false,
    vat_recoverable: false,
    duty_applicable: true,
    labour_cost: 0,
    category: "addons",
    sell_price: form.price
  }), [form.cost, form.price, calculate]);

  const governance = useMemo(() => checkGovernance(calc, settings, form.cost), [calc, settings, form.cost]);

  const set = (key: keyof AddonFormData, value: any) => {
    userEditedRef.current = true;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleAutoToggle = (checked: boolean) => {
    set("is_auto", checked);
    if (!checked) {set("auto_rule", null);setRuleText("");}
  };

  const handleRuleChange = (text: string) => {
    setRuleText(text);
    if (!text.trim()) {set("auto_rule", null);return;}
    try {set("auto_rule", JSON.parse(text));} catch {/* keep text */}
  };

  const ruleValid = !form.is_auto || !ruleText.trim() || (() => {try {JSON.parse(ruleText);return true;} catch {return false;}})();

  const updateSheet = (idx: number, patch: Partial<SheetAssignment>) => {
    setSheets((prev) => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  const getAssignments = () => sheets.filter((s) => s.checked).map((s) => ({
    pricing_sheet_id: s.pricing_sheet_id,
    price_override: s.price_override.trim() ? Number(s.price_override) : null
  }));

  const currentIndex = addon && addons ? addons.findIndex((a) => a.id === addon.id) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = addons ? currentIndex >= 0 && currentIndex < addons.length - 1 : false;

  const isDirty = () => JSON.stringify(form) !== initialFormRef.current;

  const handleNavigate = (target: Addon) => {
    if (userEditedRef.current && isDirty() && form.cost > 0) {
      setPendingNavTarget(target);
      setUnsavedDialogOpen(true);
    } else if (userEditedRef.current && isDirty()) {
      const assignments = getAssignments();
      onSubmit(form, assignments);
      setTimeout(() => onNavigate?.(target), 100);
    } else {
      onNavigate?.(target);
    }
  };

  const handleUnsavedSave = () => {
    setUnsavedDialogOpen(false);
    const assignments = getAssignments();
    onSubmit(form, assignments);
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
    const assignments = getAssignments();
    if (action === "save") onSubmit(form, assignments);else
    onSubmitAndClose?.(form, assignments);
  };

  const handleReasonConfirm = (reason: string) => {
    setReasonDialogOpen(false);
    const assignments = getAssignments();
    if (pendingAction === "save") onSubmit(form, assignments, reason);else
    onSubmitAndClose?.(form, assignments, reason);
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
            {addon ? "Edit Add-On" : "New Add-On"}
              {addon ? "Edit Add-On" : "New Add-On"}
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                {addon && onNavigate && addons && <>
                  <span>{currentIndex + 1} / {addons.length}</span>
                  <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                    disabled={!canGoPrev || isPending}
                    onClick={() => canGoPrev && handleNavigate(addons[currentIndex - 1])}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                    disabled={!canGoNext || isPending}
                    onClick={() => canGoNext && handleNavigate(addons[currentIndex + 1])}>
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
                <p className={sectionCls + " text-muted-foreground"}>Item Info</p>
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <Label className={labelCls}>Name *</Label>
                    <Input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} required />
                  </div>
                  <div>
                    <Label className={labelCls}>SKU</Label>
                    <Input className={inputCls} value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. COAT-001" />
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
                    <Label className={labelCls}>Sort Order</Label>
                    <Input className={inputCls} type="number" min="0" value={form.sort_order} onChange={(e) => set("sort_order", +e.target.value)} />
                  </div>
                  <div className="col-span-4">
                    <Label className={labelCls}>Description</Label>
                    <Textarea className="text-xs min-h-[50px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
                  </div>
                </div>
              </div>
              <Separator />
              {/* Pricing Sheets */}
              {sheets.length > 0 &&
              <div>
                  <p className={sectionCls + " text-muted-foreground"}>Pricing Sheets</p>
                  <div className="space-y-1.5 border p-2 border-border">
                    {sheets.map((s, idx) => {
                    const sheet = pricingSheets.find((p) => p.id === s.pricing_sheet_id);
                    return (
                      <div key={s.pricing_sheet_id} className="flex items-center gap-3">
                          <Checkbox checked={s.checked} onCheckedChange={(v) => updateSheet(idx, { checked: !!v })} />
                          <span className="text-xs flex-1 truncate text-foreground">{sheet?.name ?? s.pricing_sheet_id}</span>
                          {s.checked &&
                        <Input className="h-7 text-xs w-24" type="number" step="0.01" min="0" placeholder="Override (BBD)"
                        value={s.price_override} onChange={(e) => updateSheet(idx, { price_override: e.target.value })} />
                        }
                        </div>);

                  })}
                  </div>
                  <p className="text-[10px] mt-1 text-muted-foreground">Leave override blank to use the default price.</p>
                </div>
              }
              {/* Auto-Apply Rule */}
              {form.is_auto &&
              <div>
                  <p className={sectionCls + " text-muted-foreground"}>Auto-Apply Rule</p>
                  <Textarea
                  className={`text-xs min-h-[60px] font-mono ${!ruleValid ? "border-red-400" : ""}`}
                  value={ruleText}
                  onChange={(e) => handleRuleChange(e.target.value)}
                  placeholder='e.g. {"sph_over": 10} or {"has_prism": true}' />

                  {!ruleValid && <p className="text-[10px] mt-1 text-destructive">Invalid JSON</p>}
                </div>
              }
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Flags */}
              <div>
                <p className={sectionCls + " text-muted-foreground"}>Flags</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} /> Active
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch checked={form.show_on_website} onCheckedChange={(v) => set("show_on_website", v)} /> Website
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch checked={form.is_auto} onCheckedChange={handleAutoToggle} /> Auto-Apply
                  </label>
                </div>
              </div>
              <Separator />
              {/* Pricing & Cost */}
              <div>
                <p className={sectionCls + " text-muted-foreground"}>Pricing & Cost</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label className={labelCls}>Cost (USD)</Label>
                    <Input className={inputCls} type="number" step="0.01" min="0" value={form.cost} onChange={(e) => set("cost", +e.target.value)} />
                  </div>
                  <div>
                    <Label className={labelCls}>Price (BBD)</Label>
                    <Input className={inputCls} type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", +e.target.value)} />
                  </div>
                  <div />
                  <div />
                </div>
              </div>
              <Separator />
              {/* Calculated Values */}
              <div className="px-[10px] py-[10px] border rounded">
                <div className="flex items-center gap-2 mb-2">
                  <p className={sectionCls + " mb-0 text-muted-foreground"}>Calculated Values</p>
                  {calc?.margin_status &&
                  <Badge className={`text-[10px] px-1.5 py-0 ${MARGIN_STATUS_COLORS[calc.margin_status]}`}>
                      {calc.margin_status === "loss" && <AlertTriangle className="h-3 w-3 mr-0.5" />}
                      {calc.margin_status}
                    </Badge>
                  }
                </div>
                {calc ?
                <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 text-xs">
                    <ReadOnly label="FX Rate" value={calc.fx_rate_used.toFixed(4)} />
                    <ReadOnly label="Converted (BBD)" value={fmt(calc.converted_cost)} />
                    <ReadOnly label="Landed (BBD)" value={fmt(calc.landed_cost)} highlight />
                    <ReadOnly label="Full Cost (BBD)" value={fmt(calc.full_cost)} highlight />
                    <ReadOnly label="Strat. Price (BBD)" value={fmt(calc.strategic_price)} />
                    <ReadOnly label="Margin" value={calc.margin != null ? fmtPct(calc.margin) : "—"} />
                    <ReadOnly label="Sell (USD)" value={calc.sell_price_usd != null ? fmt(calc.sell_price_usd) : "—"} />
                  </div> :

                <p className="text-xs text-muted-foreground">Loading pricing settings…</p>
                }
                {calc?.governance_flags && (calc.governance_flags.at_loss || calc.governance_flags.below_floor) &&
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {calc.governance_flags.at_loss && <Badge variant="destructive" className="text-[10px]">At Loss</Badge>}
                    {calc.governance_flags.below_floor && <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-700">Below Floor</Badge>}
                    {calc.governance_flags.below_target && <Badge variant="outline" className="text-[10px]">Below Target</Badge>}
                  </div>
                }
              </div>
              {governance.blocked && <GovernanceAlert reasons={governance.blockReasons} />}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-7 text-xs bg-primary text-primary-foreground" disabled={isPending || !form.name || !ruleValid || governance.blocked}>
              {isPending ? "Saving…" : addon ? "Save" : "Create"}
            </Button>
            {onSubmitAndClose &&
            <Button type="button" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 45% 35%)", color: "white", borderRadius: "4px" }} disabled={isPending || !form.name || !ruleValid || governance.blocked} onClick={() => attemptSave("saveAndClose")}>
                Save & Close
              </Button>
            }
          </DialogFooter>
        </form>
      </DialogContent>

      <ConcessionReasonDialog
        open={reasonDialogOpen}
        onConfirm={handleReasonConfirm}
        onCancel={() => {setReasonDialogOpen(false);setPendingAction(null);}} />

      <UnsavedChangesDialog
        open={unsavedDialogOpen}
        onSave={handleUnsavedSave}
        onDiscard={handleUnsavedDiscard}
        onCancel={handleUnsavedCancel} />

    </Dialog>);

};

const ReadOnly = ({ label, value, highlight }: {label: string;value: string;highlight?: boolean;}) =>
<div>
    <span className="text-[10px]" style={{ color: "hsl(215 15% 50%)" }}>{label}</span>
    <div
    className="h-7 flex items-center px-2 rounded text-xs tabular-nums"
    style={{
      background: highlight ? "hsl(215 60% 95%)" : "hsl(215 20% 97%)",
      color: "hsl(215 30% 15%)",
      fontWeight: highlight ? 600 : 400
    }}>

      {value}
    </div>
  </div>;


export default AddonFormDialog;