import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { checkGovernance } from "@/hooks/useGovernanceCheck";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from "@/components/ui/command";
import { useReferenceData, ReferenceItem } from "@/hooks/useReferenceData";
import { Check, ChevronsUpDown, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, Lock, LockOpen, X } from "lucide-react";
import GovernanceAlert from "@/components/admin/GovernanceAlert";
import ConcessionReasonDialog from "@/components/admin/ConcessionReasonDialog";
import UnsavedChangesDialog from "@/components/admin/UnsavedChangesDialog";
import type { Lens, LensFormData } from "@/hooks/useLenses";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lens: Lens | null;
  lenses?: Lens[];
  onSubmit: (form: LensFormData, reason?: string) => void;
  onSubmitAndClose?: (form: LensFormData, reason?: string) => void;
  onNavigate?: (lens: Lens) => void;
  isPending: boolean;
}

const PROGRESSIVE_KEYWORDS = ["progressive", "bifocal", "multifocal"];

const emptyForm: LensFormData = {
  name: "", supplier_id: "", brand_id: "", material_id: "", mftype_id: "", lenstype_id: "", finishtype_id: null,
  index_value: 1.5, base_price: 0, sell_price: 0,
  sph_min: -6, sph_max: 6, cyl_min: -4, cyl_max: 0,
  add_min: null, add_max: null,
  is_active: true, show_in_pricelist: true, full_lab: false, show_in_ws_pricelist: false, show_on_website: false, notes: null, option: null
};

const fmt = (n: number) => n.toFixed(2);
const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;

const MARGIN_STATUS_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  thin: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  below_floor: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  loss: "bg-red-500/15 text-red-700 dark:text-red-400"
};

const LensFormDialog = ({ open, onOpenChange, lens, lenses, onSubmit, onSubmitAndClose, onNavigate, isPending }: Props) => {
  const [form, setForm] = useState<LensFormData>(emptyForm);
  const [nameLocked, setNameLocked] = useState(true);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<"save" | "saveAndClose" | null>(null);
  const [unsavedDialogOpen, setUnsavedDialogOpen] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<Lens | null>(null);
  const initialFormRef = useRef<string>("");
  const userEditedRef = useRef(false);

  const suppliers = useReferenceData("suppliers", open);
  const brands = useReferenceData("brands", open);
  const materials = useReferenceData("materials", open);
  const mftypes = useReferenceData("mftypes", open);
  const lenstypes = useReferenceData("lenstypes", open);
  const finishtypes = useReferenceData("finishtypes", open);
  const lensOptions = useReferenceData("lens_options", open);

  const activeSuppliers = useMemo(() => (suppliers.data ?? []).filter((i) => i.is_active), [suppliers.data]);
  const activeBrands = useMemo(() => (brands.data ?? []).filter((i) => i.is_active), [brands.data]);
  const activeMaterials = useMemo(() => (materials.data ?? []).filter((i) => i.is_active), [materials.data]);
  const activeMftypes = useMemo(() => (mftypes.data ?? []).filter((i) => i.is_active), [mftypes.data]);
  const activeLenstypes = useMemo(() => (lenstypes.data ?? []).filter((i) => i.is_active), [lenstypes.data]);
  const activeFinishtypes = useMemo(() => (finishtypes.data ?? []).filter((i) => i.is_active), [finishtypes.data]);
  const activeLensOptions = useMemo(() => (lensOptions.data ?? []).filter((i) => i.is_active), [lensOptions.data]);

  const { calculate, settings } = usePricingEngine();

  useEffect(() => {
    if (!open) return;
    if (lens) {
      setForm({
        name: lens.name, supplier_id: lens.supplier_id, brand_id: lens.brand_id,
        material_id: lens.material_id, mftype_id: lens.mftype_id, lenstype_id: lens.lenstype_id,
        finishtype_id: lens.finishtype_id ?? null,
        index_value: lens.index_value, base_price: lens.base_price, sell_price: lens.sell_price,
        sph_min: lens.sph_min, sph_max: lens.sph_max, cyl_min: lens.cyl_min, cyl_max: lens.cyl_max,
        add_min: lens.add_min, add_max: lens.add_max,
        is_active: lens.is_active,
        show_in_pricelist: lens.show_in_pricelist ?? true,
        full_lab: lens.full_lab ?? false,
        show_in_ws_pricelist: lens.show_in_ws_pricelist ?? false,
        show_on_website: lens.show_on_website ?? false,
        notes: lens.notes,
        option: lens.lens_lens_options.length > 0 ?
        { lens_option_id: lens.lens_lens_options[0].lens_option_id, extra_cost: lens.lens_lens_options[0].extra_cost } :
        null
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, lens]);

  useEffect(() => {
    if (open) {
      userEditedRef.current = false;
      const timer = setTimeout(() => {initialFormRef.current = JSON.stringify(form);}, 0);
      return () => clearTimeout(timer);
    }
  }, [open, lens]);

  const selectedMaterial = (materials.data ?? []).find((m) => m.id === form.material_id);
  const selectedMftype = (mftypes.data ?? []).find((m) => m.id === form.mftype_id);
  const selectedLensType = (lenstypes.data ?? []).find((lt) => lt.id === form.lenstype_id);
  const selectedFinishType = (finishtypes.data ?? []).find((f) => f.id === form.finishtype_id);
  const selectedOption = (lensOptions.data ?? []).find((o) => o.id === form.option?.lens_option_id);
  const showAdd = selectedLensType ?
  PROGRESSIVE_KEYWORDS.some((kw) => selectedLensType.name.toLowerCase().includes(kw)) :
  false;

  const generateName = useCallback(() => {
    const parts = [
    selectedMaterial?.abbrev,
    selectedFinishType?.abbrev,
    selectedMftype?.abbrev,
    selectedLensType?.name,
    selectedOption?.name].
    filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "";
  }, [selectedMaterial, selectedMftype, selectedLensType, selectedFinishType, selectedOption]);

  useEffect(() => {
    if (!nameLocked) return;
    const name = generateName();
    if (name) setForm((prev) => ({ ...prev, name }));
  }, [nameLocked, generateName]);

  // Pricing engine with full_lab logic
  const calc = useMemo(() => calculate({
    component_type: "lenses",
    supplier_cost: form.base_price,
    currency: "USD",
    bb_item: false,
    vat_recoverable: true,
    duty_applicable: false,
    labour_cost: form.full_lab ? form.base_price * 0.05 : 0,
    category: "lenses",
    sell_price: form.sell_price
  }), [form.base_price, form.sell_price, form.full_lab, calculate]);

  const governance = useMemo(() => checkGovernance(calc, settings, form.base_price), [calc, settings, form.base_price]);

  const set = <K extends keyof LensFormData,>(key: K, value: LensFormData[K]) => {
    userEditedRef.current = true;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setNum = (key: keyof LensFormData, raw: string) => {
    const v = raw === "" ? 0 : parseFloat(raw);
    set(key, isNaN(v) ? 0 : v as any);
  };

  const setOption = (optionId: string) => {
    setForm((prev) => ({
      ...prev,
      option: optionId ? { lens_option_id: optionId, extra_cost: prev.option?.extra_cost ?? 0 } : null
    }));
  };

  const setOptionCost = (cost: number) => {
    setForm((prev) => ({
      ...prev,
      option: prev.option ? { ...prev.option, extra_cost: cost } : null
    }));
  };

  const buildFinalForm = () => {
    const finalForm = { ...form };
    if (!showAdd) {finalForm.add_min = null;finalForm.add_max = null;}
    return finalForm;
  };

  const attemptSave = (action: "save" | "saveAndClose") => {
    if (governance.blocked) return;
    if (governance.needsReason) {
      setPendingAction(action);
      setReasonDialogOpen(true);
      return;
    }
    const finalForm = buildFinalForm();
    if (action === "save") onSubmit(finalForm);else
    onSubmitAndClose?.(finalForm);
  };

  const handleReasonConfirm = (reason: string) => {
    setReasonDialogOpen(false);
    const finalForm = buildFinalForm();
    if (pendingAction === "save") onSubmit(finalForm, reason);else
    onSubmitAndClose?.(finalForm, reason);
    setPendingAction(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptSave("save");
  };

  const isValid = form.name && form.supplier_id && form.brand_id && form.material_id && form.mftype_id && form.lenstype_id;

  const currentIndex = lens && lenses ? lenses.findIndex((l) => l.id === lens.id) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = lenses ? currentIndex >= 0 && currentIndex < lenses.length - 1 : false;

  const isDirty = () => JSON.stringify(form) !== initialFormRef.current;

  const handleNavigate = (target: Lens) => {
    if (userEditedRef.current && isDirty() && form.base_price > 0) {
      setPendingNavTarget(target);
      setUnsavedDialogOpen(true);
    } else if (userEditedRef.current && isDirty()) {
      const finalForm = buildFinalForm();
      onSubmit(finalForm);
      setTimeout(() => onNavigate?.(target), 100);
    } else {
      onNavigate?.(target);
    }
  };

  const handleUnsavedSave = () => {
    setUnsavedDialogOpen(false);
    const finalForm = buildFinalForm();
    onSubmit(finalForm);
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

  const inputCls = "h-7 text-xs";
  const labelCls = "text-xs font-medium";
  const sectionCls = "text-[11px] font-semibold uppercase tracking-wider mb-2";

  const RefSelect = ({ label, value, onChange, items }: {label: string;value: string;onChange: (v: string) => void;items: ReferenceItem[];}) => {
    const [open, setOpen] = useState(false);
    const selected = items.find((i) => i.id === value);
    return (
      <div className="space-y-0.5 bg-muted/50">
        <Label className="text-[11px]">{label}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="h-7 w-full justify-between text-xs font-normal">
              {selected ? selected.name : <span className="text-muted-foreground">Select {label}</span>}
              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[220px] p-0 z-50" align="start">
            <Command>
              <CommandInput placeholder={`Search ${label.toLowerCase()}…`} className="h-8 text-xs" />
              <CommandList>
                <CommandEmpty className="py-2 text-xs text-center">No results.</CommandEmpty>
                <CommandGroup>
                  {items.map((i) =>
                  <CommandItem key={i.id} value={i.name} onSelect={() => {onChange(i.id);setOpen(false);}} className="text-xs">
                      <Check className={`mr-1.5 h-3 w-3 ${value === i.id ? "opacity-100" : "opacity-0"}`} />
                      {i.name}
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>);

  };

  const NumInput = ({ label, value, onChange, step = "0.25" }: {label: string;value: number | null;step?: string;onChange: (v: string) => void;}) =>
  <div className="space-y-0.5">
      <Label className="text-[11px]">{label}</Label>
      <Input type="number" step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={inputCls} />
    </div>;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto [&>button[data-radix-collection-item]]:hidden" style={{ borderRadius: "4px" }}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-sm font-semibold text-foreground">
              {lens ? "Edit Lens" : "Add Lens"}
            </DialogTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {lens && onNavigate && lenses && <>
                <span>{currentIndex + 1} / {lenses.length}</span>
                <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                  disabled={!canGoPrev || isPending}
                  onClick={() => canGoPrev && handleNavigate(lenses[currentIndex - 1])}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" variant="outline" size="icon" className="h-6 w-6"
                  disabled={!canGoNext || isPending}
                  onClick={() => canGoNext && handleNavigate(lenses[currentIndex + 1])}>
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
            {/* LEFT COLUMN - Item Info */}
            <div className="space-y-4">
              <div>
                <p className={sectionCls + " text-muted-foreground"}>Item Info</p>
                <div className="space-y-2">
                  <div>
                    <Label className="text-[11px]">Name</Label>
                    <div className="flex gap-1">
                      <Input value={form.name} readOnly={nameLocked} onChange={(e) => set("name", e.target.value)}
                      className={`${inputCls} flex-1 ${nameLocked ? "bg-muted" : ""}`} placeholder="Lens SKU name" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Regenerate name"
                      onClick={() => {const name = generateName();if (name) set("name", name);}}>
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                      title={nameLocked ? "Unlock to edit manually" : "Lock to auto-generate"}
                      onClick={() => setNameLocked((v) => !v)}>
                        {nameLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 bg-muted/50 shadow-sm">
                    <RefSelect label="Supplier" value={form.supplier_id} onChange={(v) => set("supplier_id", v)} items={activeSuppliers} />
                    <RefSelect label="Brand" value={form.brand_id} onChange={(v) => set("brand_id", v)} items={activeBrands} />
                    <RefSelect label="Material" value={form.material_id} onChange={(v) => set("material_id", v)} items={activeMaterials} />
                    <RefSelect label="MF Type" value={form.mftype_id} onChange={(v) => set("mftype_id", v)} items={activeMftypes} />
                    <RefSelect label="Lens Type" value={form.lenstype_id} onChange={(v) => set("lenstype_id", v)} items={activeLenstypes} />
                    <RefSelect label="Finish Type" value={form.finishtype_id ?? ""} onChange={(v) => set("finishtype_id", v || null)} items={activeFinishtypes} />
                    <RefSelect label="Option" value={form.option?.lens_option_id ?? ""} onChange={(v) => setOption(v)} items={activeLensOptions} />
                    {form.option &&
                    <NumInput label="Extra Cost" value={form.option.extra_cost} step="0.01" onChange={(v) => setOptionCost(parseFloat(v) || 0)} />
                    }
                  </div>
                </div>
              </div>
              <Separator />

              {/* Specifications */}
              <div>
                <p className={sectionCls} style={{ color: "hsl(215 15% 45%)" }}>Specifications</p>
                <div className="grid grid-cols-2 gap-2">
                  <NumInput label="Index" value={form.index_value} step="0.01" onChange={(v) => setNum("index_value", v)} />
                  <div />
                  <NumInput label="SPH Min" value={form.sph_min} onChange={(v) => setNum("sph_min", v)} />
                  <NumInput label="SPH Max" value={form.sph_max} onChange={(v) => setNum("sph_max", v)} />
                  <NumInput label="CYL Min" value={form.cyl_min} onChange={(v) => setNum("cyl_min", v)} />
                  <NumInput label="CYL Max" value={form.cyl_max} onChange={(v) => setNum("cyl_max", v)} />
                  {showAdd &&
                  <>
                      <NumInput label="ADD Min" value={form.add_min} onChange={(v) => set("add_min", v === "" ? null : parseFloat(v) as any)} />
                      <NumInput label="ADD Max" value={form.add_max} onChange={(v) => set("add_max", v === "" ? null : parseFloat(v) as any)} />
                    </>
                  }
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Notes, Flags, Pricing, Calculated Values */}
            <div className="space-y-4">
              {/* Notes */}
              <div>
                <Label className={labelCls}>Notes</Label>
                <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} className="text-xs min-h-[40px]" placeholder="Optional notes..." />
              </div>
              <Separator />

              {/* Flags */}
              <div>
                <p className={sectionCls} style={{ color: "hsl(215 15% 45%)" }}>Flags</p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {([
                  ["is_active", "Active"],
                  ["show_in_pricelist", "Price List"],
                  ["full_lab", "Full Lab"],
                  ["show_in_ws_pricelist", "WSPL"],
                  ["show_on_website", "Website"]] as
                  [keyof LensFormData, string][]).map(([key, label]) =>
                  <label key={key} className="flex items-center gap-1.5 text-xs">
                      <Switch checked={!!form[key]} onCheckedChange={(v) => set(key, v as any)} />
                      {label}
                    </label>
                  )}
                </div>
              </div>
              <Separator />

              {/* Pricing & Cost */}
              <div>
                <p className={sectionCls} style={{ color: "hsl(215 15% 45%)" }}>Pricing & Cost</p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className={labelCls}>Cost (USD)</Label>
                    <Input className={inputCls} type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => setNum("base_price", e.target.value)} />
                  </div>
                  <div>
                    <Label className={labelCls}>Sell Price (BBD)</Label>
                    <Input className={inputCls} type="number" step="0.01" min="0" value={form.sell_price} onChange={(e) => setNum("sell_price", e.target.value)} />
                  </div>
                  <div />
                </div>
              </div>
              <Separator />

              {/* Calculated Values */}
              <div className="px-[10px] py-[10px] border rounded">
                <div className="flex items-center gap-2 mb-2">
                  <p className={sectionCls + " mb-0"} style={{ color: "hsl(215 15% 45%)" }}>Calculated Values</p>
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
                  </div> :

                <p className="text-xs text-muted-foreground">Loading pricing settings…</p>
                }
                {calc?.governance_flags && (calc.governance_flags.at_loss || calc.governance_flags.below_floor || calc.governance_flags.below_target) &&
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {calc.governance_flags.at_loss && <Badge variant="destructive" className="text-[10px]">At Loss</Badge>}
                    {calc.governance_flags.below_floor && <Badge variant="outline" className="text-[10px] border-orange-400 text-orange-700">Below Floor</Badge>}
                    {calc.governance_flags.below_target && <Badge variant="outline" className="text-[10px]">Below Target</Badge>}
                  </div>
                }
              </div>

              {/* Governance Alert */}
              {governance.blocked && <GovernanceAlert reasons={governance.blockReasons} />}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }}
            disabled={!isValid || isPending || governance.blocked}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            {onSubmitAndClose &&
            <Button type="button" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 45% 35%)", color: "white", borderRadius: "4px" }}
            disabled={!isValid || isPending || governance.blocked} onClick={() => attemptSave("saveAndClose")}>
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
    <div className="h-7 flex items-center px-2 rounded text-xs tabular-nums"
  style={{
    background: highlight ? "hsl(215 60% 95%)" : "hsl(215 20% 97%)",
    color: "hsl(215 30% 15%)",
    fontWeight: highlight ? 600 : 400
  }}>
      {value}
    </div>
  </div>;


export default LensFormDialog;