import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReferenceData, ReferenceItem } from "@/hooks/useReferenceData";
import type { Lens, LensFormData } from "@/hooks/useLenses";
import { RefreshCw, Lock, LockOpen } from "lucide-react";

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
  is_active: true, notes: null, option: null,
};

const LensFormDialog = ({ open, onOpenChange, lens, onSubmit, isPending }: Props) => {
  const [form, setForm] = useState<LensFormData>(emptyForm);
  const [nameLocked, setNameLocked] = useState(true);

  const suppliers = useReferenceData("suppliers", open);
  const brands = useReferenceData("brands", open);
  const materials = useReferenceData("materials", open);
  const mftypes = useReferenceData("mftypes", open);
  const lenstypes = useReferenceData("lenstypes", open);
  const lensOptions = useReferenceData("lens_options", open);

  const activeSuppliers = useMemo(() => (suppliers.data ?? []).filter((i) => i.is_active), [suppliers.data]);
  const activeBrands = useMemo(() => (brands.data ?? []).filter((i) => i.is_active), [brands.data]);
  const activeMaterials = useMemo(() => (materials.data ?? []).filter((i) => i.is_active), [materials.data]);
  const activeMftypes = useMemo(() => (mftypes.data ?? []).filter((i) => i.is_active), [mftypes.data]);
  const activeLenstypes = useMemo(() => (lenstypes.data ?? []).filter((i) => i.is_active), [lenstypes.data]);
  const activeLensOptions = useMemo(() => (lensOptions.data ?? []).filter((i) => i.is_active), [lensOptions.data]);

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

  const RefSelect = ({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: ReferenceItem[] }) => (
    <div className="space-y-0.5">
      <Label className="text-[11px]">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={`Select ${label}`} /></SelectTrigger>
        <SelectContent>
          {items.map((i) => <SelectItem key={i.id} value={i.id} className="text-xs">{i.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const NumInput = ({ label, value, onChange, step = "0.25" }: { label: string; value: number | null; step?: string; onChange: (v: string) => void }) => (
    <div className="space-y-0.5">
      <Label className="text-[11px]">{label}</Label>
      <Input type="number" step={step} value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="h-7 text-xs" />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{lens ? "Edit Lens" : "Add Lens"}</DialogTitle>
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
                <NumInput label="Base Price" value={form.base_price} step="0.01" onChange={(v) => setNum("base_price", v)} />
                <NumInput label="Sell Price" value={form.sell_price} step="0.01" onChange={(v) => setNum("sell_price", v)} />
                <div className="space-y-1">
                  <Label className="text-[11px]">Margin</Label>
                  <Input value={margin.toFixed(2)} readOnly className="h-7 text-xs bg-muted" />
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
