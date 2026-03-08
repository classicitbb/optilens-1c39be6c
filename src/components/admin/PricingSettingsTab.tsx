import { useState, useEffect } from "react";
import { usePricingSettings, PricingSettings } from "@/hooks/usePricingSettings";
import { useLegacyRates, LegacyRate } from "@/hooks/useCompanySettings";
import { useChargeTypes, useShipmentTypes, ChargeType, ShipmentType } from "@/hooks/useImportCostingRefs";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, GripVertical } from "lucide-react";
import CurrencyFxSection from "./CurrencyFxSection";

type FormData = Omit<PricingSettings, "id" | "created_at" | "created_by" | "version" | "is_active">;

const DEFAULTS: FormData = {
  label: null,
  base_currency: "BBD",
  fx_rates: { USD: 2, BBD: 1 },
  fx_risk_buffer: 0.02,
  vat_rate: 0.175,
  duty_rates: { lenses: 0.20, frames: 0.30, supplies: 0.20, addons: 0.15 },
  brokerage_fee: 0,
  port_charges: 0,
  freight_method: "per_unit",
  insurance_percent: 0.01,
  cost_of_capital: 0.08,
  inventory_holding: 0.05,
  avg_days_in_stock: 90,
  overhead_percent: 0.10,
  shrinkage_percent: 0.02,
  target_margin: 0.50,
  category_margin_floors: { lenses: 0.30, wspl: 0.25, frames: 0.35, supplies: 0.25, addons: 0.20 },
  category_target_margins: { lenses: 0.50, wspl: 0.40, frames: 0.50, supplies: 0.45, addons: 0.40 },
  max_price_increase: 0.10,
  rounding_rule: 0.50,
  psychological_rounding: false,
  block_below_floor: true,
  block_loss: true,
  require_concession_reason: true,
  price_reduction_threshold: 0.10
};

const toPercent = (v: number) => +(v * 100).toFixed(4);
const fromPercent = (v: number) => +(v / 100).toFixed(6);

const PricingSettingsTab = () => {
  const { versions, isLoading, saveNewVersion, saveInPlace } = usePricingSettings();
  const { canEdit } = useAdminRole();
  const { toast } = useToast();
  const { logChange } = useAuditLog();
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULTS);

  const activeVersion = versions.find((v) => v.is_active) ?? versions[0];
  const viewedVersion = selectedVersion != null ? versions.find((v) => v.version === selectedVersion) : activeVersion;
  const isEditable = canEdit && viewedVersion?.version === activeVersion?.version;

  useEffect(() => {
    if (viewedVersion) {
      const { id, created_at, created_by, version, is_active, ...rest } = viewedVersion;
      setForm(rest);
    }
  }, [viewedVersion?.version, versions.length]);

  const setField = <K extends keyof FormData,>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setJsonField = (key: keyof FormData, mapKey: string, value: number) => {
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key] as Record<string, number>), [mapKey]: value } }));
  };

  const addJsonKey = (key: keyof FormData, newKey: string) => {
    if (!newKey) return;
    setForm((prev) => ({ ...prev, [key]: { ...(prev[key] as Record<string, number>), [newKey]: 0 } }));
  };

  const removeJsonKey = (key: keyof FormData, mapKey: string) => {
    setForm((prev) => {
      const copy = { ...(prev[key] as Record<string, number>) };
      delete copy[mapKey];
      return { ...prev, [key]: copy };
    });
  };

  const handleSave = () => {
    if (!activeVersion) return;
    const oldData = { ...activeVersion };
    saveInPlace.mutate({ id: activeVersion.id, data: form }, {
      onSuccess: () => {
        toast({ title: "Settings saved" });
        logChange({
          table_name: "pricing_settings",
          record_id: activeVersion.id,
          action: "update",
          old_data: oldData as any,
          new_data: { ...form, name: `Pricing Settings v${activeVersion.version}` } as any
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });
  };

  const handleSaveNewVersion = () => {
    const oldData = activeVersion ? { ...activeVersion } : null;
    saveNewVersion.mutate(form, {
      onSuccess: () => {
        toast({ title: "New version saved" });
        setSelectedVersion(null);
        logChange({
          table_name: "pricing_settings",
          record_id: activeVersion?.id ?? "",
          action: "update",
          old_data: oldData as any,
          new_data: { ...form, name: `Pricing Settings v${(activeVersion?.version ?? 0) + 1}` } as any
        });
      },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" })
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-40"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  const NumField = ({ label, value, onChange, hint, disabled }: {label: string;value: number;onChange: (v: number) => void;hint?: string;disabled?: boolean;}) =>
  <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <Input className="h-8 text-xs" type="number" step="0.001" value={value} onChange={(e) => onChange(+e.target.value)} disabled={disabled} />
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>;


  const PercentField = ({ label, value, onChange, disabled }: {label: string;value: number;onChange: (v: number) => void;disabled?: boolean;}) =>
  <div className="space-y-1">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex items-center gap-1">
        <Input className="h-8 text-xs" type="number" step="0.1" value={toPercent(value)} onChange={(e) => onChange(fromPercent(+e.target.value))} disabled={disabled} />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>;


  const SwitchField = ({ label, checked, onChange, disabled }: {label: string;checked: boolean;onChange: (v: boolean) => void;disabled?: boolean;}) =>
  <div className="flex items-center justify-between gap-2 py-1">
      <Label className="text-xs font-medium">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>;


  const JsonGrid = ({ label, data, fieldKey, disabled }: {label: string;data: Record<string, number>;fieldKey: keyof FormData;disabled?: boolean;}) => {
    const [newKey, setNewKey] = useState("");
    return (
      <div className="space-y-1">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data).map(([k, v]) =>
          <div key={k} className="flex items-center gap-1 border border-border bg-muted/50 px-2 py-1">
              <span className="text-[10px] font-medium capitalize whitespace-nowrap">{k}</span>
              <Input className="h-6 min-w-[3rem] w-auto text-[10px]" type="number" step="0.01" value={v} onChange={(e) => setJsonField(fieldKey, k, +e.target.value)} disabled={disabled} />
              {!disabled &&
            <button onClick={() => removeJsonKey(fieldKey, k)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
            }
            </div>
          )}
          {!disabled &&
          <div className="flex items-center gap-1">
              <Input className="h-6 min-w-[4rem] w-auto text-[10px]" placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
              <button onClick={() => {addJsonKey(fieldKey, newKey);setNewKey("");}} className="text-primary hover:text-primary/80"><Plus className="h-3 w-3" /></button>
            </div>
          }
        </div>
      </div>);

  };

  const Section = ({ title, children }: {title: string;children: React.ReactNode;}) =>
  <div className="space-y-3 border border-border p-4 bg-card">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>;


  // Legacy Rates as tag-style widgets
  const LegacyRatesWidget = ({ disabled: d }: { disabled: boolean }) => {
    const { data: rates = [], isLoading: ratesLoading, upsertMutation, deleteMutation } = useLegacyRates();
    const [newKey, setNewKey] = useState("");

    if (ratesLoading) return <Section title="Legacy Cost Rates"><p className="text-xs text-muted-foreground">Loading…</p></Section>;

    const handleAdd = () => {
      if (!newKey.trim()) return;
      upsertMutation.mutate({ rate_code: newKey.toUpperCase(), description: newKey, value_type: "percent", value: 0, is_active: true }, {
        onSuccess: () => { toast({ title: "Rate added" }); setNewKey(""); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    };

    const handleUpdate = (rate: LegacyRate, value: number) => {
      upsertMutation.mutate({ id: rate.id, value });
    };

    const handleRemove = (id: string) => {
      deleteMutation.mutate(id, {
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    };

    return (
      <Section title="Legacy Cost Rates">
        <p className="text-[10px] text-muted-foreground mb-1">Historical landed-cost rates used by the supply costing engine.</p>
        <div className="flex flex-wrap gap-2">
          {rates.map((r) => (
            <div key={r.id} className="flex items-center gap-1 rounded border border-border bg-muted/50 px-2 py-1">
              <span className="text-[10px] font-medium capitalize">{r.rate_code}</span>
              <Input
                className="h-6 w-16 text-[10px]"
                type="number"
                step="0.01"
                value={r.value}
                onChange={(e) => handleUpdate(r, +e.target.value)}
                disabled={d}
              />
              {!d && (
                <button onClick={() => handleRemove(r.id)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {!d && (
            <div className="flex items-center gap-1">
              <Input className="h-6 w-20 text-[10px]" placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
              <button onClick={handleAdd} className="text-primary hover:text-primary/80"><Plus className="h-3 w-3" /></button>
            </div>
          )}
        </div>
      </Section>
    );
  };

  const ChargeTypesWidget = ({ disabled: d }: { disabled: boolean }) => {
    const { data: items = [], isLoading: loading, upsertMutation, deleteMutation } = useChargeTypes();
    const [newName, setNewName] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    if (loading) return <Section title="Charge Types"><p className="text-xs text-muted-foreground">Loading…</p></Section>;

    const handleAdd = () => {
      if (!newName.trim()) return;
      const maxSort = items.reduce((m, i) => Math.max(m, i.sort_order), 0);
      upsertMutation.mutate({ name: newName.trim(), sort_order: maxSort + 1, is_active: true }, {
        onSuccess: () => { toast({ title: "Charge type added" }); setNewName(""); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    };

    const toggleActive = (item: ChargeType) => {
      upsertMutation.mutate({ id: item.id, name: item.name, is_active: !item.is_active });
    };

    const startEdit = (item: ChargeType) => {
      if (d) return;
      setEditingId(item.id);
      setEditValue(item.name);
    };

    const commitEdit = (item: ChargeType) => {
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== item.name) {
        upsertMutation.mutate({ id: item.id, name: trimmed });
      }
      setEditingId(null);
    };

    return (
      <Section title="Charge Types">
        <p className="text-[10px] text-muted-foreground mb-1">Charge categories available on shipment cost allocation.</p>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div key={item.id} className={`flex items-center gap-1 rounded border px-2 py-1 ${item.is_active ? 'border-border bg-muted/50' : 'border-border/50 bg-muted/20 opacity-60'}`}>
              {editingId === item.id ? (
                <Input
                  autoFocus
                  className="h-5 w-28 text-[10px] px-1 py-0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(item)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item); if (e.key === "Escape") setEditingId(null); }}
                />
              ) : (
                <span className={`text-[10px] font-medium ${!d ? 'cursor-pointer hover:underline' : ''}`} onClick={() => startEdit(item)}>{item.name}</span>
              )}
              {!d && (
                <>
                  <Switch className="h-3 w-6 scale-75" checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                  <button onClick={() => deleteMutation.mutate(item.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                </>
              )}
            </div>
          ))}
          {!d && (
            <div className="flex items-center gap-1">
              <Input className="h-6 w-32 text-[10px]" placeholder="New charge type" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
              <button onClick={handleAdd} className="text-primary hover:text-primary/80"><Plus className="h-3 w-3" /></button>
            </div>
          )}
        </div>
      </Section>
    );
  };

  const ShipmentTypesWidget = ({ disabled: d }: { disabled: boolean }) => {
    const { data: items = [], isLoading: loading, upsertMutation, deleteMutation } = useShipmentTypes();
    const [newName, setNewName] = useState("");
    const [newCode, setNewCode] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editField, setEditField] = useState<"name" | "code">("name");
    const [editValue, setEditValue] = useState("");

    if (loading) return <Section title="Shipment Types"><p className="text-xs text-muted-foreground">Loading…</p></Section>;

    const handleAdd = () => {
      if (!newName.trim() || !newCode.trim()) return;
      const maxSort = items.reduce((m, i) => Math.max(m, i.sort_order), 0);
      upsertMutation.mutate({ name: newName.trim(), code: newCode.trim().toLowerCase(), sort_order: maxSort + 1, is_active: true }, {
        onSuccess: () => { toast({ title: "Shipment type added" }); setNewName(""); setNewCode(""); },
        onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
      });
    };

    const toggleActive = (item: ShipmentType) => {
      upsertMutation.mutate({ id: item.id, name: item.name, code: item.code, is_active: !item.is_active });
    };

    const startEdit = (item: ShipmentType, field: "name" | "code") => {
      if (d) return;
      setEditingId(item.id);
      setEditField(field);
      setEditValue(item[field]);
    };

    const commitEdit = (item: ShipmentType) => {
      const trimmed = editValue.trim();
      if (trimmed && trimmed !== item[editField]) {
        const updates = editField === "code"
          ? { id: item.id, name: item.name, code: trimmed.toLowerCase() }
          : { id: item.id, name: trimmed, code: item.code };
        upsertMutation.mutate(updates);
      }
      setEditingId(null);
    };

    return (
      <Section title="Shipment Types">
        <p className="text-[10px] text-muted-foreground mb-1">Shipment categories used in the import costing module.</p>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <div key={item.id} className={`flex items-center gap-1 rounded border px-2 py-1 ${item.is_active ? 'border-border bg-muted/50' : 'border-border/50 bg-muted/20 opacity-60'}`}>
              {editingId === item.id && editField === "name" ? (
                <Input
                  autoFocus
                  className="h-5 w-24 text-[10px] px-1 py-0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(item)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item); if (e.key === "Escape") setEditingId(null); }}
                />
              ) : (
                <span className={`text-[10px] font-medium ${!d ? 'cursor-pointer hover:underline' : ''}`} onClick={() => startEdit(item, "name")}>{item.name}</span>
              )}
              {editingId === item.id && editField === "code" ? (
                <Input
                  autoFocus
                  className="h-5 w-16 text-[8px] px-1 py-0"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(item)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(item); if (e.key === "Escape") setEditingId(null); }}
                />
              ) : (
                <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3 ${!d ? 'cursor-pointer hover:underline' : ''}`} onClick={() => startEdit(item, "code")}>{item.code}</Badge>
              )}
              {!d && (
                <>
                  <Switch className="h-3 w-6 scale-75" checked={item.is_active} onCheckedChange={() => toggleActive(item)} />
                  <button onClick={() => deleteMutation.mutate(item.id)} className="text-muted-foreground hover:text-destructive"><X className="h-3 w-3" /></button>
                </>
              )}
            </div>
          ))}
          {!d && (
            <div className="flex items-center gap-1">
              <Input className="h-6 w-24 text-[10px]" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input className="h-6 w-16 text-[10px]" placeholder="Code" value={newCode} onChange={(e) => setNewCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
              <button onClick={handleAdd} className="text-primary hover:text-primary/80"><Plus className="h-3 w-3" /></button>
            </div>
          )}
        </div>
      </Section>
    );
  };

  const disabled = !isEditable;

  return (
    <div className="space-y-4">
      {/* Version bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Version:</span>
        {versions.map((v) =>
        <Badge
          key={v.version}
          variant={v.version === viewedVersion?.version ? "default" : "outline"}
          className="cursor-pointer text-[10px]"
          onClick={() => setSelectedVersion(v.version)}>

            v{v.version}{v.label ? ` (${v.label})` : ""}{v.is_active ? " ✦" : ""}
          </Badge>
        )}
      </div>

      {/* Version label */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Version Label</Label>
        <Input className="h-8 text-xs max-w-xs" placeholder="e.g. Q1 2026" value={form.label ?? ""} onChange={(e) => setField("label", e.target.value || null)} disabled={disabled} />
      </div>

      {/* Responsive grid of settings cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Currency & FX */}
        <Section title="Currency & FX">
          <CurrencyFxSection
            baseCurrency={form.base_currency}
            fxRates={form.fx_rates}
            fxRiskBuffer={form.fx_risk_buffer}
            disabled={disabled}
            onBaseCurrencyChange={(v) => setField("base_currency", v)}
            onFxRateChange={(currency, engineRate) => setJsonField("fx_rates", currency, engineRate)}
            onFxRiskBufferChange={(v) => setField("fx_risk_buffer", v)} />

        </Section>

        {/* Import Defaults */}
        <Section title="Barbados Import Defaults">
          <PercentField label="VAT Rate" value={form.vat_rate} onChange={(v) => setField("vat_rate", v)} disabled={disabled} />
          <NumField label="Brokerage Fee (BBD)" value={form.brokerage_fee} onChange={(v) => setField("brokerage_fee", v)} disabled={disabled} />
          <NumField label="Port Charges (BBD)" value={form.port_charges} onChange={(v) => setField("port_charges", v)} disabled={disabled} />
          <div className="space-y-1">
            <Label className="text-xs font-medium">Freight Method</Label>
            <Select value={form.freight_method} onValueChange={(v) => setField("freight_method", v)} disabled={disabled}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per_unit">Per Unit</SelectItem>
                <SelectItem value="per_value">Per Value</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <PercentField label="Insurance" value={form.insurance_percent} onChange={(v) => setField("insurance_percent", v)} disabled={disabled} />
        </Section>

        {/* Duty Rates */}
        <Section title="Duty Rates">
          <JsonGrid label="By Category" data={form.duty_rates} fieldKey="duty_rates" disabled={disabled} />
        </Section>

        {/* Financial & Operational */}
        <Section title="Financial & Operational">
          <PercentField label="Cost of Capital" value={form.cost_of_capital} onChange={(v) => setField("cost_of_capital", v)} disabled={disabled} />
          <PercentField label="Inventory Holding" value={form.inventory_holding} onChange={(v) => setField("inventory_holding", v)} disabled={disabled} />
          <NumField label="Avg Days in Stock" value={form.avg_days_in_stock} onChange={(v) => setField("avg_days_in_stock", Math.round(v))} disabled={disabled} />
          <PercentField label="Overhead" value={form.overhead_percent} onChange={(v) => setField("overhead_percent", v)} disabled={disabled} />
          <PercentField label="Shrinkage" value={form.shrinkage_percent} onChange={(v) => setField("shrinkage_percent", v)} disabled={disabled} />
        </Section>

        {/* Pricing Strategy */}
        <Section title="Pricing Strategy">
          <PercentField label="Target Margin" value={form.target_margin} onChange={(v) => setField("target_margin", v)} disabled={disabled} />
          <PercentField label="Max Price Increase/Cycle" value={form.max_price_increase} onChange={(v) => setField("max_price_increase", v)} disabled={disabled} />
          <div className="space-y-1">
            <Label className="text-xs font-medium">Rounding Rule</Label>
            <Select value={String(form.rounding_rule)} onValueChange={(v) => setField("rounding_rule", +v)} disabled={disabled}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0.5">BBD 0.50</SelectItem>
                <SelectItem value="1">BBD 1.00</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <SwitchField label="Psychological Rounding" checked={form.psychological_rounding} onChange={(v) => setField("psychological_rounding", v)} disabled={disabled} />
        </Section>

        {/* Category Margin Floors */}
        <Section title="Category Margin Floors">
          <JsonGrid label="" data={form.category_margin_floors} fieldKey="category_margin_floors" disabled={disabled} />
        </Section>

        {/* Category Target Margins */}
        <Section title="Category Target Margins">
          <JsonGrid label="" data={form.category_target_margins} fieldKey="category_target_margins" disabled={disabled} />
        </Section>

        {/* Governance */}
        <Section title="Governance Rules">
          <SwitchField label="Block Below Floor" checked={form.block_below_floor} onChange={(v) => setField("block_below_floor", v)} disabled={disabled} />
          <SwitchField label="Block Loss" checked={form.block_loss} onChange={(v) => setField("block_loss", v)} disabled={disabled} />
          <SwitchField label="Require Concession Reason" checked={form.require_concession_reason} onChange={(v) => setField("require_concession_reason", v)} disabled={disabled} />
          <PercentField label="Price Reduction Threshold" value={form.price_reduction_threshold} onChange={(v) => setField("price_reduction_threshold", v)} disabled={disabled} />
        </Section>

        {/* Legacy Rates (tag-style like Duty Rates) */}
        <LegacyRatesWidget disabled={disabled} />
      </div>

      {/* Import Costing segment */}
      <h2 className="text-sm font-semibold text-foreground pt-2">Import Costing</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChargeTypesWidget disabled={disabled} />
        <ShipmentTypesWidget disabled={disabled} />
      </div>

      {/* Save */}
      {isEditable &&
      <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleSave} disabled={saveInPlace.isPending}>
            {saveInPlace.isPending ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={handleSaveNewVersion} disabled={saveNewVersion.isPending}>
            {saveNewVersion.isPending ? "Saving…" : "Save as New Version"}
          </Button>
        </div>
      }
    </div>);

};

export default PricingSettingsTab;