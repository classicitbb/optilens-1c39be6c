import { useState, useEffect, useMemo, useCallback } from "react";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem, CommandGroup } from "@/components/ui/command";
import { useReferenceData, ReferenceItem } from "@/hooks/useReferenceData";
import { Check, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { Lens, LensFormData } from "@/hooks/useLenses";
import { RefreshCw, Lock, LockOpen } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lens: Lens | null;
  lenses?: Lens[];
  onSubmit: (form: LensFormData) => void;
  onSubmitAndClose?: (form: LensFormData) => void;
  onNavigate?: (lens: Lens) => void;
  isPending: boolean;
}

const PROGRESSIVE_KEYWORDS = ["progressive", "bifocal", "multifocal"];

const emptyForm: LensFormData = {
  name: "", supplier_id: "", brand_id: "", material_id: "", mftype_id: "", lenstype_id: "", finishtype_id: null,
  index_value: 1.5, base_price: 0, sell_price: 0,
  sph_min: -6, sph_max: 6, cyl_min: -4, cyl_max: 0,
  add_min: null, add_max: null,
  is_active: true, show_in_pricelist: true, full_lab: false, show_in_ws_pricelist: false, show_on_website: false, notes: null, option: null,
};

const LensFormDialog = ({ open, onOpenChange, lens, lenses, onSubmit, onSubmitAndClose, onNavigate, isPending }: Props) => {
  const [form, setForm] = useState<LensFormData>(emptyForm);
  const [nameLocked, setNameLocked] = useState(true);

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
        option: lens.lens_lens_options.length > 0
          ? { lens_option_id: lens.lens_lens_options[0].lens_option_id, extra_cost: lens.lens_lens_options[0].extra_cost }
          : null,
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, lens]);

  const selectedMaterial = (materials.data ?? []).find((m) => m.id === form.material_id);
  const selectedMftype = (mftypes.data ?? []).find((m) => m.id === form.mftype_id);
  const selectedLensType = (lenstypes.data ?? []).find((lt) => lt.id === form.lenstype_id);
  const selectedOption = (lensOptions.data ?? []).find((o) => o.id === form.option?.lens_option_id);
  const showAdd = selectedLensType
    ? PROGRESSIVE_KEYWORDS.some((kw) => selectedLensType.name.toLowerCase().includes(kw))
    : false;

  // Auto-generate name from Material abbrev + MFType abbrev + LensType name + Option name
  const generateName = useCallback(() => {
    const parts = [
      selectedMaterial?.abbrev,
      selectedMftype?.abbrev,
      selectedLensType?.name,
      selectedOption?.name,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "";
  }, [selectedMaterial, selectedMftype, selectedLensType, selectedOption]);

  // Auto-generate name when locked
  useEffect(() => {
    if (!nameLocked) return;
    const name = generateName();
    if (name) setForm((prev) => ({ ...prev, name }));
  }, [nameLocked, generateName]);

  const margin = useMemo(() => {
    const m = Number(form.sell_price) - Number(form.base_price);
    return isNaN(m) ? 0 : m;
  }, [form.sell_price, form.base_price]);

  const { calculate } = usePricingEngine();
  const calc = useMemo(() => calculate({
    component_type: "lenses",
    supplier_cost: form.base_price,
    currency: "USD",
    bb_item: false,
    vat_recoverable: false,
    duty_applicable: true,
    labour_cost: 0,
    category: "lenses",
    sell_price: form.sell_price,
  }), [form.base_price, form.sell_price, calculate]);

  const set = <K extends keyof LensFormData>(key: K, value: LensFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setNum = (key: keyof LensFormData, raw: string) => {
    const v = raw === "" ? 0 : parseFloat(raw);
    set(key, isNaN(v) ? 0 : v as any);
  };

  const setOption = (optionId: string) => {
    setForm((prev) => ({
      ...prev,
      option: optionId ? { lens_option_id: optionId, extra_cost: prev.option?.extra_cost ?? 0 } : null,
    }));
  };

  const setOptionCost = (cost: number) => {
    setForm((prev) => ({
      ...prev,
      option: prev.option ? { ...prev.option, extra_cost: cost } : null,
    }));
  };

  const handleSubmit = () => {
    const finalForm = { ...form };
    if (!showAdd) { finalForm.add_min = null; finalForm.add_max = null; }
    onSubmit(finalForm);
  };

  const isValid = form.name && form.supplier_id && form.brand_id && form.material_id && form.mftype_id && form.lenstype_id;

  const currentIndex = lens && lenses ? lenses.findIndex((l) => l.id === lens.id) : -1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = lenses ? currentIndex >= 0 && currentIndex < lenses.length - 1 : false;

  const RefSelect = ({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: ReferenceItem[] }) => {
    const [open, setOpen] = useState(false);
    const selected = items.find((i) => i.id === value);
    return (
      <div className="space-y-0.5">
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
                  {items.map((i) => (
                    <CommandItem
                      key={i.id}
                      value={i.name}
                      onSelect={() => { onChange(i.id); setOpen(false); }}
                      className="text-xs"
                    >
                      <Check className={`mr-1.5 h-3 w-3 ${value === i.id ? "opacity-100" : "opacity-0"}`} />
                      {i.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  const NumInput = ({ label, value, onChange, step = "0.25" }: { label: string; value: number | null; step?: string; onChange: (v: string) => void }) => (
    <div className="space-y-0.5">
      <Label className="text-[11px]">{label}</Label>
      <Input type="number" step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto" style={{ borderRadius: "4px" }}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            {lens && onNavigate && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canGoPrev || isPending}
                onClick={() => canGoPrev && lenses && onNavigate(lenses[currentIndex - 1])}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <DialogTitle className="text-sm font-semibold flex-1" style={{ color: "hsl(215 30% 15%)" }}>
              {lens ? "Edit Lens" : "Add Lens"}
            </DialogTitle>
            {lens && onNavigate && (
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!canGoNext || isPending}
                onClick={() => canGoNext && lenses && onNavigate(lenses[currentIndex + 1])}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-3">
          {/* Top row: Identity + Specifications side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Identity */}
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Identity</h3>
              <div className="space-y-1">
                <Label className="text-[11px]">Name</Label>
                <div className="flex gap-1">
                  <Input
                    value={form.name}
                    readOnly={nameLocked}
                    onChange={(e) => set("name", e.target.value)}
                    className={`h-7 text-xs flex-1 ${nameLocked ? "bg-muted" : ""}`}
                    placeholder="Lens SKU name"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title="Regenerate name"
                    onClick={() => { const name = generateName(); if (name) set("name", name); }}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    title={nameLocked ? "Unlock to edit manually" : "Lock to auto-generate"}
                    onClick={() => setNameLocked((v) => !v)}
                  >
                    {nameLocked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <RefSelect label="Supplier" value={form.supplier_id} onChange={(v) => set("supplier_id", v)} items={activeSuppliers} />
                <RefSelect label="Brand" value={form.brand_id} onChange={(v) => set("brand_id", v)} items={activeBrands} />
                <RefSelect label="Material" value={form.material_id} onChange={(v) => set("material_id", v)} items={activeMaterials} />
                <RefSelect label="MF Type" value={form.mftype_id} onChange={(v) => set("mftype_id", v)} items={activeMftypes} />
                <RefSelect label="Lens Type" value={form.lenstype_id} onChange={(v) => set("lenstype_id", v)} items={activeLenstypes} />
                <RefSelect label="Finish Type" value={form.finishtype_id ?? ""} onChange={(v) => set("finishtype_id", v || null)} items={activeFinishtypes} />
                <RefSelect label="Option" value={form.option?.lens_option_id ?? ""} onChange={(v) => setOption(v)} items={activeLensOptions} />
                {form.option && (
                  <NumInput label="Extra Cost" value={form.option.extra_cost} step="0.01" onChange={(v) => setOptionCost(parseFloat(v) || 0)} />
                )}
              </div>
            </section>

            {/* Specifications */}
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Specifications</h3>
              <div className="grid grid-cols-2 gap-2">
                <NumInput label="Index" value={form.index_value} step="0.01" onChange={(v) => setNum("index_value", v)} />
                <div /> {/* spacer */}
                <NumInput label="SPH Min" value={form.sph_min} onChange={(v) => setNum("sph_min", v)} />
                <NumInput label="SPH Max" value={form.sph_max} onChange={(v) => setNum("sph_max", v)} />
                <NumInput label="CYL Min" value={form.cyl_min} onChange={(v) => setNum("cyl_min", v)} />
                <NumInput label="CYL Max" value={form.cyl_max} onChange={(v) => setNum("cyl_max", v)} />
                {showAdd && (
                  <>
                    <NumInput label="ADD Min" value={form.add_min} onChange={(v) => set("add_min", v === "" ? null : parseFloat(v) as any)} />
                    <NumInput label="ADD Max" value={form.add_max} onChange={(v) => set("add_max", v === "" ? null : parseFloat(v) as any)} />
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Bottom row: Pricing + Notes side by side */}
          <div className="grid grid-cols-2 gap-4">
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Pricing</h3>
              <div className="grid grid-cols-3 gap-2">
                <NumInput label="Base Price (USD)" value={form.base_price} step="0.01" onChange={(v) => setNum("base_price", v)} />
                <NumInput label="Sell Price (BBD)" value={form.sell_price} step="0.01" onChange={(v) => setNum("sell_price", v)} />
                <div className="space-y-0.5">
                  <Label className="text-[11px]">Margin</Label>
                  <Input value={margin.toFixed(2)} readOnly className="h-7 text-xs bg-muted" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[11px]">Sell (USD)</Label>
                  <Input value={calc?.sell_price_usd != null ? calc.sell_price_usd.toFixed(2) : "—"} readOnly className="h-7 text-xs bg-muted" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-[11px]">FX Rate</Label>
                  <Input value={calc?.fx_rate_used?.toFixed(4) ?? "—"} readOnly className="h-7 text-xs bg-muted" />
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Notes</h3>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value || null)}
                className="text-xs"
                rows={2}
                placeholder="Optional notes..."
              />
            </section>
          </div>
        </div>

        {/* Flags */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Flags</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-1.5 text-xs cursor-pointer" onClick={() => set("show_in_pricelist", !form.show_in_pricelist)}>
              <Checkbox checked={form.show_in_pricelist} onCheckedChange={(v) => set("show_in_pricelist", !!v)} />
              <span>Show in Pricelist</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs cursor-pointer" onClick={() => set("full_lab", !form.full_lab)}>
              <Checkbox checked={form.full_lab} onCheckedChange={(v) => set("full_lab", !!v)} />
              <span>Full Lab</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs cursor-pointer" onClick={() => set("show_in_ws_pricelist", !form.show_in_ws_pricelist)}>
              <Checkbox checked={form.show_in_ws_pricelist} onCheckedChange={(v) => set("show_in_ws_pricelist", !!v)} />
              <span>Show in Wholesale PL</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs cursor-pointer" onClick={() => set("show_on_website", !form.show_on_website)}>
              <Checkbox checked={form.show_on_website} onCheckedChange={(v) => set("show_on_website", !!v)} />
              <span>Show on Website</span>
            </div>
          </div>
        </section>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Active</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={!isValid || isPending}
              onClick={handleSubmit}
              style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
            {onSubmitAndClose && (
              <Button type="button" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 45% 35%)", color: "white", borderRadius: "4px" }} disabled={!isValid || isPending}
                onClick={() => { const finalForm = { ...form }; if (!showAdd) { finalForm.add_min = null; finalForm.add_max = null; } onSubmitAndClose(finalForm); }}>
                Save & Close
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LensFormDialog;
