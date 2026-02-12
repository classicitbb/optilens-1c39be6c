import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Addon, AddonFormData } from "@/hooks/useAddons";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addon: Addon | null;
  onSubmit: (form: AddonFormData) => void;
  isPending: boolean;
}

const CATEGORIES = [
  { value: "coating", label: "Coating" },
  { value: "mirror", label: "Mirror" },
  { value: "ar_coating", label: "AR Coating" },
  { value: "prism", label: "Prism" },
  { value: "high_power", label: "High Power" },
  { value: "other", label: "Other" },
];

const defaultForm: AddonFormData = {
  name: "",
  category: "other",
  description: "",
  price: 0,
  is_auto: false,
  auto_rule: null,
  is_active: true,
  sort_order: 0,
};

const AddonFormDialog = ({ open, onOpenChange, addon, onSubmit, isPending }: Props) => {
  const [form, setForm] = useState<AddonFormData>(defaultForm);
  const [ruleText, setRuleText] = useState("");

  useEffect(() => {
    if (addon) {
      setForm({
        name: addon.name,
        category: addon.category,
        description: addon.description,
        price: addon.price,
        is_auto: addon.is_auto,
        auto_rule: addon.auto_rule,
        is_active: addon.is_active,
        sort_order: addon.sort_order,
      });
      setRuleText(addon.auto_rule ? JSON.stringify(addon.auto_rule, null, 2) : "");
    } else {
      setForm(defaultForm);
      setRuleText("");
    }
  }, [addon, open]);

  const set = (key: keyof AddonFormData, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const handleAutoToggle = (checked: boolean) => {
    set("is_auto", checked);
    if (!checked) {
      set("auto_rule", null);
      setRuleText("");
    }
  };

  const handleRuleChange = (text: string) => {
    setRuleText(text);
    if (!text.trim()) {
      set("auto_rule", null);
      return;
    }
    try {
      set("auto_rule", JSON.parse(text));
    } catch {
      // keep text, don't update form until valid
    }
  };

  const ruleValid = !form.is_auto || !ruleText.trim() || (() => { try { JSON.parse(ruleText); return true; } catch { return false; } })();

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
            {addon ? "Edit Add-On" : "New Add-On"}
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
              <Label className={labelCls}>Price</Label>
              <Input className={inputCls} type="number" step="0.01" min="0" value={form.price} onChange={(e) => set("price", +e.target.value)} />
            </div>
            <div>
              <Label className={labelCls}>Sort Order</Label>
              <Input className={inputCls} type="number" min="0" value={form.sort_order} onChange={(e) => set("sort_order", +e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label className={labelCls}>Description</Label>
              <Textarea className="text-xs min-h-[60px]" value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} /> Active
              </label>
              <label className="flex items-center gap-2 text-xs">
                <Switch checked={form.is_auto} onCheckedChange={handleAutoToggle} /> Auto-Apply
              </label>
            </div>

            {form.is_auto && (
              <div>
                <Label className={labelCls}>Auto-Apply Rule (JSON)</Label>
                <Textarea
                  className={`text-xs min-h-[60px] font-mono ${!ruleValid ? "border-red-400" : ""}`}
                  value={ruleText}
                  onChange={(e) => handleRuleChange(e.target.value)}
                  placeholder='e.g. {"sph_over": 10} or {"has_prism": true}'
                />
                {!ruleValid && <p className="text-[10px] mt-1" style={{ color: "hsl(0 70% 50%)" }}>Invalid JSON</p>}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="h-7 text-xs" style={{ background: "hsl(215 65% 50%)", color: "white", borderRadius: "4px" }} disabled={isPending || !form.name || !ruleValid}>
              {isPending ? "Saving…" : addon ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddonFormDialog;
