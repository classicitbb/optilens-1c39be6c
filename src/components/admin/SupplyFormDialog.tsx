import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Supply, SupplyFormData } from "@/hooks/useSupplies";
import { useReferenceData } from "@/hooks/useReferenceData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supply: Supply | null;
  onSubmit: (form: SupplyFormData) => void;
  isPending: boolean;
}

const CATEGORIES = [
  { value: "lab", label: "Lab Supplies" },
  { value: "optical", label: "Optical Supplies" },
  { value: "accessories", label: "Eyewear Accessories" },
];

const UNITS = ["each", "box", "case", "pack", "roll", "bottle", "pair"];

const defaultForm: SupplyFormData = {
  name: "",
  category: "lab",
  description: "",
  sku: "",
  base_price: 0,
  sell_price: 0,
  unit: "each",
  quantity_per_unit: 1,
  is_active: true,
  show_on_website: false,
  image_url: null,
  notes: null,
  supplier_id: null,
};

const SupplyFormDialog = ({ open, onOpenChange, supply, onSubmit, isPending }: Props) => {
  const [form, setForm] = useState<SupplyFormData>(defaultForm);
  const { data: suppliers } = useReferenceData("suppliers");
  const activeSuppliers = (suppliers ?? []).filter((s) => s.is_active);

  useEffect(() => {
    if (supply) {
      setForm({
        name: supply.name,
        category: supply.category,
        description: supply.description,
        sku: supply.sku,
        base_price: supply.base_price,
        sell_price: supply.sell_price,
        unit: supply.unit,
        quantity_per_unit: supply.quantity_per_unit,
        is_active: supply.is_active,
        show_on_website: supply.show_on_website,
        image_url: supply.image_url,
        notes: supply.notes,
        supplier_id: supply.supplier_id,
      });
    } else {
      setForm(defaultForm);
    }
  }, [supply, open]);

  const set = (key: keyof SupplyFormData, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputCls = "h-8 text-xs";
  const labelCls = "text-xs font-medium";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" style={{ borderRadius: "4px" }}>
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>
            {supply ? "Edit Supply" : "New Supply"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className={labelCls}>Name *</Label>
              <Input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} required />
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
            <div>
              <Label className={labelCls}>SKU</Label>
              <Input className={inputCls} value={form.sku} onChange={(e) => set("sku", e.target.value)} />
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
            <div>
              <Label className={labelCls}>Base Price</Label>
              <Input className={inputCls} type="number" step="0.01" min="0" value={form.base_price} onChange={(e) => set("base_price", +e.target.value)} />
            </div>
            <div>
              <Label className={labelCls}>Sell Price</Label>
              <Input className={inputCls} type="number" step="0.01" min="0" value={form.sell_price} onChange={(e) => set("sell_price", +e.target.value)} />
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
              <Label className={labelCls}>Qty per Unit</Label>
              <Input className={inputCls} type="number" min="1" value={form.quantity_per_unit} onChange={(e) => set("quantity_per_unit", +e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className={labelCls}>Description</Label>
              <Textarea className="text-xs min-h-[60px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className={labelCls}>Notes</Label>
              <Textarea className="text-xs min-h-[40px]" value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} /> Active
            </label>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={form.show_on_website} onCheckedChange={(v) => set("show_on_website", v)} /> Show on Website
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} disabled={isPending || !form.name}>
              {isPending ? "Saving…" : supply ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SupplyFormDialog;
