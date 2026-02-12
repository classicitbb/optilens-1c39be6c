import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useReferenceData, ReferenceItem } from "@/hooks/useReferenceData";
import type { Lens, LensFormData } from "@/hooks/useLenses";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lens: Lens | null; // null = create mode
  onSubmit: (form: LensFormData) => void;
  isPending: boolean;
}

const PROGRESSIVE_KEYWORDS = ["progressive", "bifocal", "multifocal"];

const emptyForm: LensFormData = {
  name: "", supplier_id: "", brand_id: "", material_id: "", mftype_id: "", lenstype_id: "",
  index_value: 1.5, base_price: 0, sell_price: 0,
  sph_min: -6, sph_max: 6, cyl_min: -4, cyl_max: 0,
  add_min: null, add_max: null,
  is_active: true, notes: null, options: [],
};

const LensFormDialog = ({ open, onOpenChange, lens, onSubmit, isPending }: Props) => {
  const [form, setForm] = useState<LensFormData>(emptyForm);

  const suppliers = useReferenceData("suppliers");
  const brands = useReferenceData("brands");
  const materials = useReferenceData("materials");
  const mftypes = useReferenceData("mftypes");
  const lenstypes = useReferenceData("lenstypes");
  const lensOptions = useReferenceData("lens_options");

  const activeItems = (items: ReferenceItem[] | undefined) => (items ?? []).filter((i) => i.is_active);

  useEffect(() => {
    if (!open) return;
    if (lens) {
      setForm({
        name: lens.name, supplier_id: lens.supplier_id, brand_id: lens.brand_id,
        material_id: lens.material_id, mftype_id: lens.mftype_id, lenstype_id: lens.lenstype_id,
        index_value: lens.index_value, base_price: lens.base_price, sell_price: lens.sell_price,
        sph_min: lens.sph_min, sph_max: lens.sph_max, cyl_min: lens.cyl_min, cyl_max: lens.cyl_max,
        add_min: lens.add_min, add_max: lens.add_max,
        is_active: lens.is_active, notes: lens.notes,
        options: lens.lens_lens_options.map((o) => ({ lens_option_id: o.lens_option_id, extra_cost: o.extra_cost })),
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, lens]);

  const selectedLensType = (lenstypes.data ?? []).find((lt) => lt.id === form.lenstype_id);
  const showAdd = selectedLensType
    ? PROGRESSIVE_KEYWORDS.some((kw) => selectedLensType.name.toLowerCase().includes(kw))
    : false;

  const margin = useMemo(() => {
    const m = Number(form.sell_price) - Number(form.base_price);
    return isNaN(m) ? 0 : m;
  }, [form.sell_price, form.base_price]);

  const set = <K extends keyof LensFormData>(key: K, value: LensFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setNum = (key: keyof LensFormData, raw: string) => {
    const v = raw === "" ? 0 : parseFloat(raw);
    set(key, isNaN(v) ? 0 : v as any);
  };

  const toggleOption = (optionId: string, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      options: checked
        ? [...prev.options, { lens_option_id: optionId, extra_cost: 0 }]
        : prev.options.filter((o) => o.lens_option_id !== optionId),
    }));
  };

  const setOptionCost = (optionId: string, cost: number) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((o) => o.lens_option_id === optionId ? { ...o, extra_cost: cost } : o),
    }));
  };

  const handleSubmit = () => {
    const finalForm = { ...form };
    if (!showAdd) { finalForm.add_min = null; finalForm.add_max = null; }
    onSubmit(finalForm);
  };

  const isValid = form.name && form.supplier_id && form.brand_id && form.material_id && form.mftype_id && form.lenstype_id;

  const RefSelect = ({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: ReferenceItem[] }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
        <SelectContent>
          {items.map((i) => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const NumInput = ({ label, value, onChange, step = "0.25" }: { label: string; value: number | null; step?: string; onChange: (v: string) => void }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lens ? "Edit Lens" : "Add Lens"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section 1: Identity */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Identity</h3>
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} className="h-8 text-xs" placeholder="Lens SKU name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <RefSelect label="Supplier" value={form.supplier_id} onChange={(v) => set("supplier_id", v)} items={activeItems(suppliers.data)} />
              <RefSelect label="Brand" value={form.brand_id} onChange={(v) => set("brand_id", v)} items={activeItems(brands.data)} />
              <RefSelect label="Material" value={form.material_id} onChange={(v) => set("material_id", v)} items={activeItems(materials.data)} />
              <RefSelect label="MF Type" value={form.mftype_id} onChange={(v) => set("mftype_id", v)} items={activeItems(mftypes.data)} />
              <RefSelect label="Lens Type" value={form.lenstype_id} onChange={(v) => set("lenstype_id", v)} items={activeItems(lenstypes.data)} />
              {/* Options multi-select next to Lens Type */}
              <div className="space-y-1">
                <Label className="text-xs">Options</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      <span className="truncate text-muted-foreground">
                        {form.options.length === 0
                          ? "Select options"
                          : `${form.options.length} selected`}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 shrink-0"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 z-50 bg-background" align="start">
                    {activeItems(lensOptions.data).length === 0 ? (
                      <p className="text-xs p-2" style={{ color: "hsl(215 15% 50%)" }}>No options available.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {activeItems(lensOptions.data).map((opt) => {
                          const selected = form.options.find((o) => o.lens_option_id === opt.id);
                          return (
                            <div key={opt.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={!!selected}
                                onCheckedChange={(checked) => toggleOption(opt.id, !!checked)}
                              />
                              <span className="text-xs flex-1">{opt.name}</span>
                              {selected && (
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={selected.extra_cost}
                                  onChange={(e) => setOptionCost(opt.id, parseFloat(e.target.value) || 0)}
                                  className="h-7 text-xs w-20"
                                  placeholder="Cost"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </section>

          {/* Section 2: Specifications */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Specifications</h3>
            <div className="grid grid-cols-3 gap-3">
              <NumInput label="Index Value" value={form.index_value} step="0.01" onChange={(v) => setNum("index_value", v)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumInput label="SPH Min" value={form.sph_min} onChange={(v) => setNum("sph_min", v)} />
              <NumInput label="SPH Max" value={form.sph_max} onChange={(v) => setNum("sph_max", v)} />
              <NumInput label="CYL Min" value={form.cyl_min} onChange={(v) => setNum("cyl_min", v)} />
              <NumInput label="CYL Max" value={form.cyl_max} onChange={(v) => setNum("cyl_max", v)} />
            </div>
            {showAdd && (
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="ADD Min" value={form.add_min} onChange={(v) => set("add_min", v === "" ? null : parseFloat(v) as any)} />
                <NumInput label="ADD Max" value={form.add_max} onChange={(v) => set("add_max", v === "" ? null : parseFloat(v) as any)} />
              </div>
            )}
          </section>

          {/* Section 3: Pricing */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Pricing</h3>
            <div className="grid grid-cols-3 gap-3">
              <NumInput label="Base Price" value={form.base_price} step="0.01" onChange={(v) => setNum("base_price", v)} />
              <NumInput label="Sell Price" value={form.sell_price} step="0.01" onChange={(v) => setNum("sell_price", v)} />
              <div className="space-y-1">
                <Label className="text-xs">Margin</Label>
                <Input value={margin.toFixed(2)} readOnly className="h-8 text-xs bg-muted" />
              </div>
            </div>
          </section>


          {/* Section 5: Notes */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: "hsl(215 15% 50%)" }}>Notes</h3>
            <Textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value || null)}
              className="text-xs"
              rows={3}
              placeholder="Optional notes..."
            />
          </section>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Active</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              size="sm"
              disabled={!isValid || isPending}
              onClick={handleSubmit}
              style={{ background: "hsl(215 65% 50%)", color: "white" }}
            >
              {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LensFormDialog;
