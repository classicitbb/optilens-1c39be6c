import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuoteLines, useRxDetails, computeLineProfit, OVERRIDE_REASONS, Quote, QuoteLine, RxDetail } from "@/hooks/useQuotes";
import { useLenses, Lens } from "@/hooks/useLenses";
import { useAddons, Addon } from "@/hooks/useAddons";
import { useSupplies } from "@/hooks/useSupplies";
import { useReferenceData } from "@/hooks/useReferenceData";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import QuotePdfExport, { QuotePreviewPanel, QuotePdfExportHandle } from "@/components/admin/QuotePdfExport";
import { supabase } from "@/integrations/supabase/client";
import {
  CheckCircle2, XCircle, AlertTriangle, MinusCircle, ChevronRight,
  User, Square, Glasses, ClipboardList, Plus, Trash2, ChevronDown, Printer,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Validation helpers ────────────────────────────────────────────────────────
const validateSphCyl = (v: string) => { if (!v) return true; const n = parseFloat(v); if (isNaN(n) || n < -30 || n > 30) return false; return Math.abs(Math.round(n * 100) % 25) < 1; };
const validateAxis = (v: string) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && Number.isInteger(n) && n >= 0 && n <= 180; };
const validateAdd = (v: string) => { if (!v) return true; const n = parseFloat(v); if (isNaN(n) || n < 0 || n > 4) return false; return Math.abs(Math.round(n * 100) % 25) < 1; };
const validatePd = (v: string) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && ((n >= 50 && n <= 80) || (n >= 10 && n <= 40)); };
const validatePositiveDecimal = (v: string) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && n >= 0; };
const validatePrism = (v: string) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && n >= 0 && n <= 20; };

const RxInput = ({ value, onChange, validate, placeholder = "", small = false }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validate?: (v: string) => boolean; placeholder?: string; small?: boolean;
}) => {
  const isInvalid = validate ? !validate(value) : false;
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full rounded border bg-background text-center text-[11px] focus:outline-none focus:ring-1 focus:ring-ring",
        small ? "h-6 px-0.5" : "h-7 px-1",
        isInvalid && value ? "border-destructive bg-destructive/5" : "border-input"
      )}
    />
  );
};

const INITIAL_RX = {
  od_sph: "", od_cyl: "", od_axis: "", od_add: "",
  os_sph: "", os_cyl: "", os_axis: "", os_add: "",
  od_fpd: "", od_npd: "", os_fpd: "", os_npd: "",
  od_oc: "", os_oc: "", od_bc: "", os_bc: "",
  od_prism_value: "", od_prism_dir: "", od_prism2_value: "", od_prism2_dir: "",
  os_prism_value: "", os_prism_dir: "", os_prism2_value: "", os_prism2_dir: "",
  od_slab_off: "", os_slab_off: "",
  od_special_thickness: "", os_special_thickness: "",
  od_face_form_angle: "", od_panto: "", od_object_distance: "",
  od_vertex_refracted: "", od_vertex_fitted: "", od_eye_level: "", od_inset: "", od_ercd: "",
  os_face_form_angle: "", os_panto: "", os_object_distance: "",
  os_vertex_refracted: "", os_vertex_fitted: "", os_eye_level: "", os_inset: "", os_ercd: "",
  pd: "", seg_height: "", fitting_height: "", rx_notes: "",
};
type RxForm = typeof INITIAL_RX;

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: "identification", label: "Identification", icon: User },
  { id: "frame", label: "Frame", icon: Square },
  { id: "lens", label: "Lens", icon: Glasses },
  { id: "prescription", label: "Prescription", icon: ClipboardList },
  { id: "addons", label: "Add-ons", icon: Plus },
] as const;

type StepId = typeof STEPS[number]["id"];

interface Props {
  quote: Quote;
  onUpdateQuote: (updates: Partial<Quote>) => void;
  headerForm: Partial<Quote>;
  setHeaderForm: (fn: (p: Partial<Quote>) => Partial<Quote>) => void;
  saveHeader: () => void;
  emailError: string;
  setEmailError: (v: string) => void;
  totals: {
    subtotalSell: number; totalLandedCost: number; gpAmount: number;
    gpPercent: number; grandTotal: number; belowCostCount: number;
    belowThresholdCount: number; editedCount: number; noCostCount: number;
  };
  canEdit: boolean;
}

// ─── Editable lens line row ────────────────────────────────────────────────
const EditableLensRow = ({ l, canEdit, updateLineMutation, deleteLineMutation }: { l: QuoteLine; canEdit: boolean; updateLineMutation: any; deleteLineMutation: any }) => {
  const [editCost, setEditCost] = useState(String(l.unit_cost_landed_bbd));
  const [editSell, setEditSell] = useState(String(l.unit_sell_price_bbd));
  return (
    <div className="flex items-center gap-2 text-xs bg-background border border-border rounded px-2 py-1.5">
      <span className="font-medium text-foreground flex-1 truncate">{l.item_name}</span>
      <div className="flex items-center gap-1 shrink-0">
        <label className="text-[10px] text-muted-foreground">Cost:</label>
        <Input type="number" value={editCost} onChange={e => setEditCost(e.target.value)}
          onBlur={() => { const cost = parseFloat(editCost) || 0; const profit = computeLineProfit(l.unit_sell_price_bbd, cost, l.qty, "RX"); updateLineMutation.mutate({ id: l.id, updates: { unit_cost_landed_bbd: cost, ...profit } }); }}
          className="h-6 text-xs w-16 p-1 text-right font-mono" step={0.01} />
        <label className="text-[10px] text-muted-foreground">Sell:</label>
        <Input type="number" value={editSell} onChange={e => setEditSell(e.target.value)}
          onBlur={() => { const sell = parseFloat(editSell) || 0; const profit = computeLineProfit(sell, l.unit_cost_landed_bbd, l.qty, "RX"); updateLineMutation.mutate({ id: l.id, updates: { unit_sell_price_bbd: sell, price_override: sell !== l.unit_base_price_bbd, ...profit } }); }}
          className="h-6 text-xs w-16 p-1 text-right font-mono" step={0.01} />
      </div>
      {canEdit && <button onClick={() => deleteLineMutation.mutate(l.id)} className="p-0.5 rounded hover:bg-destructive/10"><Trash2 className="h-3 w-3 text-destructive" /></button>}
    </div>
  );
};

// ─── Editable addon line row ───────────────────────────────────────────────
const EditableAddonRow = ({ l, canEdit, updateLineMutation, deleteLineMutation }: { l: QuoteLine; canEdit: boolean; updateLineMutation: any; deleteLineMutation: any }) => {
  const [editDesc, setEditDesc] = useState(l.description_override || l.item_name);
  const [editCost, setEditCost] = useState(String(l.unit_cost_landed_bbd));
  const [editSell, setEditSell] = useState(String(l.unit_sell_price_bbd));
  return (
    <div className="flex flex-col gap-1 bg-background border border-border rounded px-2 py-1.5 text-xs">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[9px] h-4 shrink-0">{l.line_type}</Badge>
        <Input value={editDesc} onChange={e => setEditDesc(e.target.value)}
          onBlur={() => updateLineMutation.mutate({ id: l.id, updates: { description_override: editDesc !== l.item_name ? editDesc : null } })}
          className="h-6 text-xs flex-1 p-1" placeholder="Description" />
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-muted-foreground">Qty:</span>
          <Input type="number" value={l.qty} onChange={e => { const qty = Number(e.target.value) || 1; const profit = computeLineProfit(l.unit_sell_price_bbd, l.unit_cost_landed_bbd, qty, "RX"); updateLineMutation.mutate({ id: l.id, updates: { qty, ...profit } }); }} className="h-6 text-xs w-10 p-1 text-center" min={1} />
        </div>
        {canEdit && <button onClick={() => deleteLineMutation.mutate(l.id)} className="p-0.5 rounded hover:bg-destructive/10 shrink-0"><Trash2 className="h-3 w-3 text-destructive" /></button>}
      </div>
      <div className="flex items-center gap-2 pl-1">
        <label className="text-[10px] text-muted-foreground">Cost:</label>
        <Input type="number" value={editCost} onChange={e => setEditCost(e.target.value)}
          onBlur={() => { const cost = parseFloat(editCost) || 0; const profit = computeLineProfit(l.unit_sell_price_bbd, cost, l.qty, "RX"); updateLineMutation.mutate({ id: l.id, updates: { unit_cost_landed_bbd: cost, ...profit } }); }}
          className="h-6 text-xs w-16 p-1 text-right font-mono" step={0.01} />
        <label className="text-[10px] text-muted-foreground">Sell:</label>
        <Input type="number" value={editSell} onChange={e => setEditSell(e.target.value)}
          onBlur={() => { const sell = parseFloat(editSell) || 0; const profit = computeLineProfit(sell, l.unit_cost_landed_bbd, l.qty, "RX"); updateLineMutation.mutate({ id: l.id, updates: { unit_sell_price_bbd: sell, price_override: true, ...profit } }); }}
          className="h-6 text-xs w-16 p-1 text-right font-mono" step={0.01} />
        <span className="text-[10px] text-muted-foreground ml-auto">Total: <span className="font-mono font-medium">${(l.qty * l.unit_sell_price_bbd).toFixed(2)}</span></span>
      </div>
    </div>
  );
};

// ─── Searchable filter popover ─────────────────────────────────────────────
const SearchableFilter = ({ label, value, onValueChange, options }: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: { id: string; name: string }[];
}) => {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-7 text-xs w-full justify-between font-normal" role="combobox">
          <span className="truncate">{selected ? selected.name : label}</span>
          <ChevronDown className="h-3 w-3 ml-1 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Search ${label}…`} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs py-3 text-center">No results.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="all" onSelect={() => { onValueChange("all"); setOpen(false); }} className="text-xs">
                All {label}s
              </CommandItem>
              {options.map(o => (
                <CommandItem key={o.id} value={o.name} onSelect={() => { onValueChange(o.id); setOpen(false); }} className="text-xs">
                  {o.name}
                  {value === o.id && <CheckCircle2 className="h-3 w-3 ml-auto text-primary" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ─── Rx Prescription step (inline) ───────────────────────────────────────────
const PrescriptionStep = ({ lensLine, onSaved, onRxChange }: { lensLine: QuoteLine; onSaved?: () => void; onRxChange?: (rx: Partial<RxForm>) => void }) => {
  const { data: rx, upsertMutation } = useRxDetails(lensLine.id);
  const { toast } = useToast();
  const [form, setForm] = useState<RxForm>({ ...INITIAL_RX });
  const [showPrism, setShowPrism] = useState(false);
  const [showDigital, setShowDigital] = useState(false);

  useEffect(() => {
    if (rx) {
      const toStr = (v: any) => (v != null ? String(v) : "");
      const next: any = {};
      for (const k of Object.keys(INITIAL_RX)) next[k] = toStr((rx as any)[k]);
      setForm(next);
      onRxChange?.(next);
      setShowPrism(!!(rx.od_prism_value || rx.os_prism_value));
      setShowDigital(!!(rx.od_face_form_angle || rx.od_panto));
    }
  }, [rx, lensLine.id]);

  const set = (key: keyof RxForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const next = { ...form, [key]: e.target.value };
    setForm(next);
    onRxChange?.(next);
  };

  const hasAxisWarning =
    (!!form.od_cyl && parseFloat(form.od_cyl) !== 0 && !form.od_axis) ||
    (!!form.os_cyl && parseFloat(form.os_cyl) !== 0 && !form.os_axis);

  const hasPrismData = !!(form.od_prism_value || form.os_prism_value || form.od_slab_off || form.os_slab_off);
  const hasDigitalData = !!(form.od_face_form_angle || form.od_panto);

  const handleSave = () => {
    const n = (v: string) => v ? parseFloat(v) : null;
    const s = (v: string) => v || null;
    upsertMutation.mutate({
      quote_line_id: lensLine.id,
      od_sph: n(form.od_sph), od_cyl: n(form.od_cyl), od_axis: n(form.od_axis), od_add: n(form.od_add),
      os_sph: n(form.os_sph), os_cyl: n(form.os_cyl), os_axis: n(form.os_axis), os_add: n(form.os_add),
      od_fpd: n(form.od_fpd), od_npd: n(form.od_npd), os_fpd: n(form.os_fpd), os_npd: n(form.os_npd),
      od_oc: n(form.od_oc), os_oc: n(form.os_oc), od_bc: n(form.od_bc), os_bc: n(form.os_bc),
      od_prism_value: n(form.od_prism_value), od_prism_dir: s(form.od_prism_dir),
      od_prism2_value: n(form.od_prism2_value), od_prism2_dir: s(form.od_prism2_dir),
      os_prism_value: n(form.os_prism_value), os_prism_dir: s(form.os_prism_dir),
      os_prism2_value: n(form.os_prism2_value), os_prism2_dir: s(form.os_prism2_dir),
      od_slab_off: n(form.od_slab_off), os_slab_off: n(form.os_slab_off),
      od_special_thickness: s(form.od_special_thickness), os_special_thickness: s(form.os_special_thickness),
      od_face_form_angle: n(form.od_face_form_angle), od_panto: n(form.od_panto),
      od_object_distance: n(form.od_object_distance), od_vertex_refracted: n(form.od_vertex_refracted),
      od_vertex_fitted: n(form.od_vertex_fitted), od_eye_level: n(form.od_eye_level),
      od_inset: n(form.od_inset), od_ercd: n(form.od_ercd),
      os_face_form_angle: n(form.os_face_form_angle), os_panto: n(form.os_panto),
      os_object_distance: n(form.os_object_distance), os_vertex_refracted: n(form.os_vertex_refracted),
      os_vertex_fitted: n(form.os_vertex_fitted), os_eye_level: n(form.os_eye_level),
      os_inset: n(form.os_inset), os_ercd: n(form.os_ercd),
      pd: s(form.pd), seg_height: s(form.seg_height), fitting_height: s(form.fitting_height), rx_notes: s(form.rx_notes),
    } as any, {
      onSuccess: () => { toast({ title: "Prescription saved" }); onSaved?.(); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const th = "px-1 py-0.5 text-[9px] font-semibold text-center text-muted-foreground";
  const td = "px-0.5 py-0.5";
  const eyeLbl = "px-2 py-1 text-[10px] font-bold text-foreground w-10 text-center";
  const headBg = "bg-muted/50";
  const rowBorder = "border-t border-border";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold text-foreground">{lensLine.item_name}</div>
        <Badge variant="outline" className="text-[10px]">{lensLine.line_type}</Badge>
      </div>

      {/* Main Rx table */}
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className={headBg}>
              <th className={`${th} text-left`}>Rx</th>
              <th className={th}>SPH</th><th className={th}>CYL</th><th className={th}>AXIS</th><th className={th}>ADD</th>
              <th className="w-px bg-border" />
              <th className={th}>FPD</th><th className={th}>NPD</th><th className={th}>OC</th><th className={th}>BC</th>
              <th className="w-px bg-border" />
              <th className={th}>Seg Ht</th><th className={th}>Fit Ht</th><th className={th}>PD</th>
            </tr>
          </thead>
          <tbody>
            {(["od", "os"] as const).map(eye => (
              <tr key={eye} className={rowBorder}>
                <td className={eyeLbl}>{eye.toUpperCase()}</td>
                <td className={td}><RxInput value={form[`${eye}_sph`]} onChange={set(`${eye}_sph`)} validate={validateSphCyl} small /></td>
                <td className={td}><RxInput value={form[`${eye}_cyl`]} onChange={set(`${eye}_cyl`)} validate={validateSphCyl} small /></td>
                <td className={td}><RxInput value={form[`${eye}_axis`]} onChange={set(`${eye}_axis`)} validate={validateAxis} small /></td>
                <td className={td}><RxInput value={form[`${eye}_add`]} onChange={set(`${eye}_add`)} validate={validateAdd} small /></td>
                <td className="w-px bg-border" />
                <td className={td}><RxInput value={form[`${eye}_fpd`]} onChange={set(`${eye}_fpd`)} validate={validatePositiveDecimal} small /></td>
                <td className={td}><RxInput value={form[`${eye}_npd`]} onChange={set(`${eye}_npd`)} validate={validatePositiveDecimal} small /></td>
                <td className={td}><RxInput value={form[`${eye}_oc`]} onChange={set(`${eye}_oc`)} validate={validatePositiveDecimal} small /></td>
                <td className={td}><RxInput value={form[`${eye}_bc`]} onChange={set(`${eye}_bc`)} validate={validatePositiveDecimal} small /></td>
                <td className="w-px bg-border" />
                <td className={td}><RxInput value={form.seg_height} onChange={set("seg_height")} validate={validatePositiveDecimal} small /></td>
                <td className={td}><RxInput value={form.fitting_height} onChange={set("fitting_height")} validate={validatePositiveDecimal} small /></td>
                {eye === "od"
                  ? <td className={td}><RxInput value={form.pd} onChange={set("pd")} validate={validatePd} small /></td>
                  : <td className={td}><span className="block text-center text-[9px] text-muted-foreground pt-1">—</span></td>
                }
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasAxisWarning && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          ⚠ Cyl set without Axis
        </div>
      )}

      {/* Prism collapsible */}
      <div>
        <button
          onClick={() => setShowPrism(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground mb-1"
        >
          {showPrism ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Prism & Slab-Off
          {hasPrismData && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
        </button>
        {showPrism && (
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className={headBg}>
                  <th className={`${th} text-left`} />
                  <th className={th}>P1 Δ</th><th className={th}>P1 Dir</th>
                  <th className={th}>P2 Δ</th><th className={th}>P2 Dir</th>
                  <th className="w-px bg-border" />
                  <th className={th}>Slab-Off</th><th className={th}>Sp.Thick</th>
                </tr>
              </thead>
              <tbody>
                {(["od", "os"] as const).map(eye => (
                  <tr key={eye} className={rowBorder}>
                    <td className={eyeLbl}>{eye.toUpperCase()}</td>
                    <td className={td}><RxInput value={form[`${eye}_prism_value`]} onChange={set(`${eye}_prism_value`)} validate={validatePrism} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_prism_dir`]} onChange={set(`${eye}_prism_dir`)} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_prism2_value`]} onChange={set(`${eye}_prism2_value`)} validate={validatePrism} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_prism2_dir`]} onChange={set(`${eye}_prism2_dir`)} small /></td>
                    <td className="w-px bg-border" />
                    <td className={td}><RxInput value={form[`${eye}_slab_off`]} onChange={set(`${eye}_slab_off`)} validate={validatePositiveDecimal} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_special_thickness`]} onChange={set(`${eye}_special_thickness`)} small /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Digital collapsible */}
      <div>
        <button
          onClick={() => setShowDigital(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground mb-1"
        >
          {showDigital ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Digital Measurements
          {hasDigitalData && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
        </button>
        {showDigital && (
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className={headBg}>
                  <th className={`${th} text-left`} />
                  <th className={th}>Face Form</th><th className={th}>Panto</th><th className={th}>Obj Dist</th>
                  <th className={th}>Vtx Ref</th><th className={th}>Vtx Fit</th>
                  <th className={th}>Eye Lvl</th><th className={th}>Inset</th><th className={th}>ERCD</th>
                </tr>
              </thead>
              <tbody>
                {(["od", "os"] as const).map(eye => (
                  <tr key={eye} className={rowBorder}>
                    <td className={eyeLbl}>{eye.toUpperCase()}</td>
                    <td className={td}><RxInput value={form[`${eye}_face_form_angle`]} onChange={set(`${eye}_face_form_angle`)} validate={validatePositiveDecimal} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_panto`]} onChange={set(`${eye}_panto`)} validate={validatePositiveDecimal} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_object_distance`]} onChange={set(`${eye}_object_distance`)} validate={validatePositiveDecimal} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_vertex_refracted`]} onChange={set(`${eye}_vertex_refracted`)} validate={validatePositiveDecimal} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_vertex_fitted`]} onChange={set(`${eye}_vertex_fitted`)} validate={validatePositiveDecimal} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_eye_level`]} onChange={set(`${eye}_eye_level`)} validate={validatePositiveDecimal} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_inset`]} onChange={set(`${eye}_inset`)} validate={validatePositiveDecimal} small /></td>
                    <td className={td}><RxInput value={form[`${eye}_ercd`]} onChange={set(`${eye}_ercd`)} validate={validatePositiveDecimal} small /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Rx Notes</label>
        <Textarea value={form.rx_notes} onChange={set("rx_notes")} className="text-xs min-h-[40px]" />
      </div>

      <div className="flex justify-end pt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={upsertMutation.isPending}>
          {upsertMutation.isPending ? "Saving…" : "Save Prescription"}
        </Button>
      </div>
    </div>
  );
};

// ─── Rx summary (for sidebar) ─────────────────────────────────────────────────
const RxSummaryLine = ({ label, value }: { label: string; value: string | null | undefined }) => {
  if (!value) return null;
  return <span className="text-[10px] text-muted-foreground">{label}: <span className="text-foreground font-medium">{value}</span></span>;
};

// ─── Main Wizard ──────────────────────────────────────────────────────────────
const RxQuoteWizard = ({ quote, onUpdateQuote, headerForm, setHeaderForm, saveHeader, emailError, setEmailError, totals, canEdit }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>("identification");
  const { data: lenses = [] } = useLenses();
  const { data: addons = [] } = useAddons();
  const { data: supplies = [] } = useSupplies();
  const { data: lines = [], addLineMutation, updateLineMutation, deleteLineMutation } = useQuoteLines(quote.id);
  const { toast } = useToast();

  // Ref data for lens filtering
  const { data: mftypes = [] } = useReferenceData("mftypes");
  const { data: materials = [] } = useReferenceData("materials");
  const { data: lenstypes = [] } = useReferenceData("lenstypes");

  // Lens picker filters
  const [filterMftype, setFilterMftype] = useState("all");
  const [filterMaterial, setFilterMaterial] = useState("all");
  const [filterLenstype, setFilterLenstype] = useState("all");
  const [lensSearch, setLensSearch] = useState("");

  // Retail markup toggle
  const [isRetail, setIsRetail] = useState(false);

  // Frame data (local state — displayed in sidebar live, persisted to quote on Next)
  const [frameRef, setFrameRef] = useState("");
  const [frameModel, setFrameModel] = useState("");
  const [frameBridge, setFrameBridge] = useState("");
  const [frameEd, setFrameEd] = useState("");
  const [frameA, setFrameA] = useState("");
  const [frameB, setFrameB] = useState("");
  const [frameDbl, setFrameDbl] = useState("");
  const [isUncut, setIsUncut] = useState(false);
  const [uncutPrice, setUncutPrice] = useState("");

  // Hydrate frame state from quote notes_internal on mount / quote change
  useEffect(() => {
    const notes = quote.notes_internal ?? "";
    const match = notes.match(/\[\[FRAME:(.*?)\]\]/s);
    if (match) {
      try {
        const f = JSON.parse(match[1]);
        setFrameRef(f.ref ?? "");
        setFrameModel(f.model ?? "");
        setFrameBridge(f.bridge ?? "");
        setFrameEd(f.ed ?? "");
        setFrameA(f.a ?? "");
        setFrameB(f.b ?? "");
        setFrameDbl(f.dbl ?? "");
        setIsUncut(f.uncut ?? false);
        setUncutPrice(f.uncutPrice ?? "");
      } catch { /* ignore parse errors */ }
    }
  }, [quote.id]);

  // Persist frame data into notes_internal as a tagged JSON block
  const saveFrameData = () => {
    const frameJson = JSON.stringify({
      ref: frameRef, model: frameModel, bridge: frameBridge,
      ed: frameEd, a: frameA, b: frameB, dbl: frameDbl,
      uncut: isUncut, uncutPrice,
    });
    const existingNotes = (quote.notes_internal ?? "").replace(/\[\[FRAME:.*?\]\]/s, "").trim();
    const combined = `[[FRAME:${frameJson}]]${existingNotes ? `\n${existingNotes}` : ""}`;
    onUpdateQuote({ notes_internal: combined });
  };

  // Live rx summary for sidebar (updated by PrescriptionStep)
  const [sidebarRx, setSidebarRx] = useState<Partial<RxForm>>({});

  // rxMap for PDF export
  const [rxMap, setRxMap] = useState<Record<string, RxDetail>>({});
  const lensLines = lines.filter(l => l.line_type === "Lens");

  useEffect(() => {
    if (lensLines.length === 0) { setRxMap({}); return; }
    const ids = lensLines.map(l => l.id);
    supabase.from("rx_details").select("*").in("quote_line_id", ids).then(({ data }) => {
      if (data) {
        const map: Record<string, RxDetail> = {};
        data.forEach((r: any) => { map[r.quote_line_id] = r as RxDetail; });
        setRxMap(map);
        // Also populate sidebar rx from first lens
        if (data[0]) {
          const toStr = (v: any) => (v != null ? String(v) : "");
          const next: any = {};
          for (const k of Object.keys(INITIAL_RX)) next[k] = toStr((data[0] as any)[k]);
          setSidebarRx(next);
        }
      }
    });
  }, [lensLines.map(l => l.id).join(",")]);

  // Addon/supply picker
  const [addonSearch, setAddonSearch] = useState("");

  const addonLines = lines.filter(l => l.line_type === "AddOn" || l.line_type === "Supply");
  const hasLens = lensLines.length > 0;

  // Step completion checks
  const stepComplete: Record<StepId, boolean> = {
    identification: !!(headerForm.customer_name),
    frame: true,
    lens: hasLens,
    prescription: hasLens,
    addons: true,
  };

  const stepAvailable: Record<StepId, boolean> = {
    identification: true,
    frame: !!headerForm.customer_name,
    lens: !!headerForm.customer_name,
    prescription: hasLens,
    addons: hasLens,
  };

  const filteredLenses = useMemo(() => {
    return lenses.filter(l => {
      if (!l.is_active) return false;
      if (l.base_price <= 0 && l.sell_price <= 0) return false;
      if (filterMftype !== "all" && l.mftype_id !== filterMftype) return false;
      if (filterMaterial !== "all" && l.material_id !== filterMaterial) return false;
      if (filterLenstype !== "all" && l.lenstype_id !== filterLenstype) return false;
      if (lensSearch && !l.name.toLowerCase().includes(lensSearch.toLowerCase())) return false;
      return true;
    });
  }, [lenses, filterMftype, filterMaterial, filterLenstype, lensSearch]);

  const eligibleAddons = useMemo(() => {
    const a = addons.filter(a => a.is_active).map(a => ({ ...a, kind: "addon" as const, cost: a.cost, price: a.price }));
    const s = supplies.filter(s => s.is_active && s.show_in_pricelist).map(s => ({
      id: s.id, name: s.name, sku: s.sku || "", category: s.category,
      cost: s.base_price, price: s.sell_price, description: s.description, kind: "supply" as const,
    }));
    const all = [...a, ...s];
    if (!addonSearch) return all;
    return all.filter(x => x.name.toLowerCase().includes(addonSearch.toLowerCase()));
  }, [addons, supplies, addonSearch]);

  const addLensLine = (lens: Lens) => {
    const sellPrice = isRetail ? lens.sell_price * 2 : lens.sell_price;
    const profit = computeLineProfit(sellPrice, lens.base_price, 1, "RX");
    addLineMutation.mutate({
      quote_id: quote.id,
      line_type: "Lens",
      product_id: lens.id,
      sku: "",
      item_name: lens.name,
      qty: 1,
      unit_cost_landed_bbd: lens.base_price,
      unit_base_price_bbd: lens.sell_price,
      unit_sell_price_bbd: sellPrice,
      threshold_percent: 48,
      ...profit,
      sort_order: lines.length,
    }, {
      onSuccess: () => {
        toast({ title: "Lens added", description: lens.name });
        setStep("prescription");
      },
    });
  };

  const addAddonLine = (item: { id: string; name: string; sku: string; cost: number; price: number; kind: "addon" | "supply" }) => {
    const sellPrice = isRetail ? item.price * 2 : item.price;
    const profit = computeLineProfit(sellPrice, item.cost, 1, "RX");
    addLineMutation.mutate({
      quote_id: quote.id,
      line_type: item.kind === "addon" ? "AddOn" : "Supply",
      product_id: item.id,
      sku: item.sku,
      item_name: item.name,
      qty: 1,
      unit_cost_landed_bbd: item.cost,
      unit_base_price_bbd: item.price,
      unit_sell_price_bbd: sellPrice,
      threshold_percent: 48,
      ...profit,
      sort_order: lines.length,
    });
  };

  // Edging fee: add $20 for cut (non-uncut) orders when frame is present
  const edgingFeeInTotal = !isUncut && frameRef ? 20 : 0;
  const displayTotal = totals.grandTotal + edgingFeeInTotal;

  const validateEmail = (email: string) => {
    if (!email) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Invalid email address";
  };

  const stepDot = (s: StepId) => {
    const avail = stepAvailable[s];
    const done = stepComplete[s];
    const active = step === s;
    return cn(
      "flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold transition-all border",
      active ? "bg-primary text-primary-foreground border-primary" :
        done && avail ? "bg-primary/10 text-primary border-primary/30" :
        avail ? "bg-background text-muted-foreground border-border" :
        "bg-muted text-muted-foreground border-border opacity-40"
    );
  };

  // PDF ref for "Print & Save"
  const pdfRef = useRef<QuotePdfExportHandle | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Derived frame data object for PDF/preview
  const frameDataForPdf = (frameRef || frameModel || frameA || frameB) ? {
    ref: frameRef, model: frameModel, bridge: frameBridge, ed: frameEd,
    a: frameA, b: frameB, dbl: frameDbl, uncut: isUncut, uncutPrice,
  } : null;

  const handleFinish = () => {
    onUpdateQuote({ status: "Accepted" });
    pdfRef.current?.triggerPrint();
    setTimeout(() => {
      navigate("/admin/quotations");
    }, 1200);
  };

  // Totals that include edging fee (not shown on PDF line items, but included in grand total)
  const effectiveTotals = { ...totals, grandTotal: displayTotal };

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* ── Main area ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-0">
        {/* Step nav */}
        <div className="flex items-center gap-0 border-b border-border pb-3 mb-4">
          {STEPS.map((s, i) => {
            const avail = stepAvailable[s.id];
            const Icon = s.icon;
            return (
              <div key={s.id} className="flex items-center">
                <button
                  disabled={!avail}
                  onClick={() => avail && setStep(s.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors",
                    step === s.id
                      ? "bg-primary text-primary-foreground"
                      : avail
                        ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                        : "text-muted-foreground/40 cursor-not-allowed"
                  )}
                >
                  <span className={stepDot(s.id)}>
                    {stepComplete[s.id] && step !== s.id
                      ? <CheckCircle2 className="h-3 w-3" />
                      : <Icon className="h-3 w-3" />}
                  </span>
                  {s.label}
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground/30 mx-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step: Identification ─────────────────────────────────── */}
        {step === "identification" && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Patient / Customer Identification</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Customer / Practice *</label>
                <Input value={headerForm.customer_name ?? ""} onChange={e => setHeaderForm(p => ({ ...p, customer_name: e.target.value }))} onBlur={saveHeader} className="h-8 text-xs" disabled={!canEdit} placeholder="Practice or customer name" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Patient / Contact Name</label>
                <Input value={headerForm.contact_name ?? ""} onChange={e => setHeaderForm(p => ({ ...p, contact_name: e.target.value }))} onBlur={saveHeader} className="h-8 text-xs" disabled={!canEdit} placeholder="Patient full name" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Email</label>
                <Input
                  type="email"
                  value={headerForm.contact_email ?? ""}
                  onChange={e => { setHeaderForm(p => ({ ...p, contact_email: e.target.value })); if (emailError) setEmailError(validateEmail(e.target.value)); }}
                  onBlur={saveHeader}
                  className={cn("h-8 text-xs", emailError && "border-destructive")}
                  disabled={!canEdit}
                />
                {emailError && <p className="text-[10px] text-destructive mt-0.5">{emailError}</p>}
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Phone</label>
                <Input value={headerForm.contact_phone ?? ""} onChange={e => setHeaderForm(p => ({ ...p, contact_phone: e.target.value }))} onBlur={saveHeader} className="h-8 text-xs" disabled={!canEdit} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Valid Until</label>
                <Input type="date" value={headerForm.valid_until ?? ""} onChange={e => setHeaderForm(p => ({ ...p, valid_until: e.target.value || null }))} onBlur={saveHeader} className="h-8 text-xs" disabled={!canEdit} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Lead Time (days)</label>
                <Input type="number" value={headerForm.lead_time_days ?? ""} onChange={e => setHeaderForm(p => ({ ...p, lead_time_days: e.target.value ? Number(e.target.value) : null }))} onBlur={saveHeader} className="h-8 text-xs" disabled={!canEdit} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Customer Notes</label>
                <Textarea value={headerForm.notes_customer ?? ""} onChange={e => setHeaderForm(p => ({ ...p, notes_customer: e.target.value }))} onBlur={saveHeader} className="text-xs min-h-[64px]" disabled={!canEdit} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Internal Notes</label>
                <Textarea value={headerForm.notes_internal ?? ""} onChange={e => setHeaderForm(p => ({ ...p, notes_internal: e.target.value }))} onBlur={saveHeader} className="text-xs min-h-[64px]" disabled={!canEdit} />
              </div>
            </div>
            {headerForm.customer_name && (
              <div className="flex justify-end">
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep("frame")}>
                  Next: Frame <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Step: Frame ──────────────────────────────────────────── */}
        {step === "frame" && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Frame Details</h2>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Frame Brand / Ref</label>
                <Input value={frameRef} onChange={e => setFrameRef(e.target.value)} className="h-8 text-xs" placeholder="e.g. Silhouette 1234" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Model / Color</label>
                <Input value={frameModel} onChange={e => setFrameModel(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Bridge (mm)</label>
                <Input type="number" value={frameBridge} onChange={e => setFrameBridge(e.target.value)} className="h-8 text-xs text-center" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Eye Size A (mm)</label>
                <Input type="number" value={frameA} onChange={e => setFrameA(e.target.value)} className="h-8 text-xs text-center" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">Eye Size B (mm)</label>
                <Input type="number" value={frameB} onChange={e => setFrameB(e.target.value)} className="h-8 text-xs text-center" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">ED (mm)</label>
                <Input type="number" value={frameEd} onChange={e => setFrameEd(e.target.value)} className="h-8 text-xs text-center" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground block mb-1">DBL (mm)</label>
                <Input type="number" value={frameDbl} onChange={e => setFrameDbl(e.target.value)} className="h-8 text-xs text-center" />
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded border border-border bg-muted/20">
              <div className="flex items-center gap-2 mt-0.5">
                <Checkbox id="uncut" checked={isUncut} onCheckedChange={v => setIsUncut(!!v)} />
                <label htmlFor="uncut" className="text-xs font-medium text-foreground cursor-pointer">Uncut (no edge)</label>
              </div>
              {isUncut && (
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-muted-foreground">Fixed price for uncut:</label>
                  <Input type="number" value={uncutPrice} onChange={e => setUncutPrice(e.target.value)} className="h-7 text-xs w-24" placeholder="0.00" />
                </div>
              )}
              {!isUncut && (
                <span className="text-[11px] text-muted-foreground">Edged (surfaced to frame) — $20.00 edging fee will be added</span>
              )}
            </div>
            <div className="flex justify-between">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setStep("identification")}>
                ← Back
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { saveFrameData(); setStep("lens"); }}>
                Next: Lens <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Lens ───────────────────────────────────────────── */}
        {step === "lens" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Lens Selection</h2>
              {/* Retail toggle */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-border bg-muted/20">
                <label className="text-[11px] font-medium text-foreground">Retail (×2)</label>
                <Switch checked={isRetail} onCheckedChange={setIsRetail} />
                {isRetail && <Badge className="text-[9px] h-4 bg-amber-100 text-amber-700 border-amber-200">100% Markup</Badge>}
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Filter by type to narrow the lens list. Only lenses with cost & sell price assigned are shown.</p>

            {/* Currently selected lenses */}
            {lensLines.length > 0 && (
              <div className="border border-border rounded p-2 space-y-1 bg-muted/20">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Selected Lens(es)</div>
                {lensLines.map(l => (
                  <EditableLensRow key={l.id} l={l} canEdit={canEdit} updateLineMutation={updateLineMutation} deleteLineMutation={deleteLineMutation} />
                ))}
              </div>
            )}

            {/* Searchable Filters */}
            <div className="grid grid-cols-4 gap-2">
              <SearchableFilter
                label="MF Type"
                value={filterMftype}
                onValueChange={setFilterMftype}
                options={(mftypes as any[]).map((m: any) => ({ id: m.id, name: m.name }))}
              />
              <SearchableFilter
                label="Material"
                value={filterMaterial}
                onValueChange={setFilterMaterial}
                options={(materials as any[]).map((m: any) => ({ id: m.id, name: m.name }))}
              />
              <SearchableFilter
                label="Lens Type"
                value={filterLenstype}
                onValueChange={setFilterLenstype}
                options={(lenstypes as any[]).map((m: any) => ({ id: m.id, name: m.name }))}
              />
              <Input value={lensSearch} onChange={e => setLensSearch(e.target.value)} placeholder="Search name…" className="h-7 text-xs" />
            </div>

            {/* Lens list */}
            <div className="border border-border rounded overflow-hidden max-h-[320px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Lens Name</th>
                    <th className="text-center px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">MF Type</th>
                    <th className="text-center px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">Material</th>
                    <th className="text-center px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">Index</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Sell{isRetail ? " (×2)" : ""}</th>
                    <th className="w-[60px]" />
                  </tr>
                </thead>
                <tbody>
                  {filteredLenses.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-xs text-muted-foreground py-6">No lenses match the current filters.</td></tr>
                  )}
                  {filteredLenses.map(l => {
                    const displayPrice = isRetail ? l.sell_price * 2 : l.sell_price;
                    return (
                      <tr key={l.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-2 py-1.5 font-medium text-foreground">{l.name}</td>
                        <td className="px-1 py-1.5 text-center text-muted-foreground">{(l as any).mftype?.name || "—"}</td>
                        <td className="px-1 py-1.5 text-center text-muted-foreground">{(l as any).material?.name || "—"}</td>
                        <td className="px-1 py-1.5 text-center text-muted-foreground">{l.index_value}</td>
                        <td className="px-2 py-1.5 text-right font-mono">${displayPrice.toFixed(2)}</td>
                        <td className="px-2 py-1.5">
                          {canEdit && (
                            <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => addLensLine(l)} disabled={addLineMutation.isPending}>
                              Select
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between">
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setStep("frame")}>← Back</Button>
              {hasLens && (
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep("prescription")}>
                  Next: Prescription <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── Step: Prescription ──────────────────────────────────── */}
        {step === "prescription" && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Prescription</h2>
            {!hasLens && (
              <div className="text-xs text-muted-foreground border border-border rounded p-4 text-center">
                Please select a lens first before entering the prescription.
                <Button size="sm" variant="link" className="ml-2 text-xs h-auto p-0" onClick={() => setStep("lens")}>Go to Lens →</Button>
              </div>
            )}
            {lensLines.map(line => (
              <PrescriptionStep key={line.id} lensLine={line} onSaved={() => setStep("addons")} onRxChange={setSidebarRx} />
            ))}
            {hasLens && (
              <div className="flex justify-between pt-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => setStep("lens")}>← Back</Button>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setStep("addons")}>
                  Next: Add-ons <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Step: Add-ons ────────────────────────────────────────── */}
        {step === "addons" && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Treatments & Add-ons</h2>
            <p className="text-[11px] text-muted-foreground">Add treatments and supplies. Only pricelist-enabled items are shown.</p>

            {/* Selected add-ons — with editable description and cost */}
            {addonLines.length > 0 && (
              <div className="border border-border rounded p-2 space-y-1.5 bg-muted/20">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Selected Add-ons</div>
                {addonLines.map(l => (
                  <EditableAddonRow key={l.id} l={l} canEdit={canEdit} updateLineMutation={updateLineMutation} deleteLineMutation={deleteLineMutation} />
                ))}
              </div>
            )}

            <Input value={addonSearch} onChange={e => setAddonSearch(e.target.value)} placeholder="Search treatments and supplies…" className="h-7 text-xs" />

            <div className="border border-border rounded overflow-hidden max-h-[280px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr>
                    <th className="text-left px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Name</th>
                    <th className="text-left px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">Category</th>
                    <th className="text-left px-1 py-1.5 text-[10px] font-semibold text-muted-foreground">Type</th>
                    <th className="text-right px-2 py-1.5 text-[10px] font-semibold text-muted-foreground">Price{isRetail ? " (×2)" : ""}</th>
                    <th className="w-[60px]" />
                  </tr>
                </thead>
                <tbody>
                  {eligibleAddons.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-xs text-muted-foreground py-6">No add-ons found.</td></tr>
                  )}
                  {eligibleAddons.map(item => {
                    const displayPrice = isRetail ? item.price * 2 : item.price;
                    return (
                      <tr key={item.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-2 py-1.5 font-medium text-foreground">{item.name}</td>
                        <td className="px-1 py-1.5 text-muted-foreground">{item.category}</td>
                        <td className="px-1 py-1.5">
                          <Badge variant="outline" className="text-[9px] h-4">{item.kind === "addon" ? "Add-On" : "Supply"}</Badge>
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono">${displayPrice.toFixed(2)}</td>
                        <td className="px-2 py-1.5">
                          {canEdit && (
                            <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => addAddonLine(item)} disabled={addLineMutation.isPending}>
                              Add
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Preview panel */}
            {showPreview && (
              <div className="mt-2">
                <QuotePreviewPanel
                  quote={quote}
                  lines={lines}
                  totals={effectiveTotals}
                  rxMap={rxMap}
                  frameData={frameDataForPdf}
                />
              </div>
            )}

            {/* Back + Preview + Finish */}
            <div className="flex justify-between pt-2">
              <Button
                size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                onClick={() => {
                  saveHeader();
                  setStep("prescription");
                }}
              >
                ← Back (Save Draft)
              </Button>
              <div className="flex items-center gap-2">
                {/* Hidden PDF export — holds off-screen print content */}
                <div style={{ position: "absolute", left: "-9999px", top: 0, visibility: "hidden" }}>
                  <QuotePdfExport
                    ref={pdfRef}
                    quote={quote}
                    lines={lines}
                    totals={effectiveTotals}
                    rxMap={rxMap}
                    frameData={frameDataForPdf}
                  />
                </div>
                <Button
                  size="sm" variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowPreview(v => !v)}
                >
                  {showPreview ? "Hide Preview" : "▷ Preview"}
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleFinish}
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print & Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Right summary panel ─────────────────────────────────── */}
      <div className="w-[230px] shrink-0 space-y-2.5 sticky top-0 self-start max-h-screen overflow-y-auto pb-4">
        {/* Identity summary */}
        <div className="border border-border rounded p-3 space-y-1.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Patient</div>
          <div className="text-xs font-semibold text-foreground">{headerForm.customer_name || "—"}</div>
          {headerForm.contact_name && <div className="text-[11px] text-muted-foreground">{headerForm.contact_name}</div>}
          {headerForm.contact_email && <div className="text-[11px] text-muted-foreground truncate">{headerForm.contact_email}</div>}
          {headerForm.contact_phone && <div className="text-[11px] text-muted-foreground">{headerForm.contact_phone}</div>}
        </div>

        {/* Frame summary — always shows if any frame data entered */}
        {(frameRef || frameModel || frameA || frameB || frameBridge || frameEd || frameDbl) && (
          <div className="border border-border rounded p-3 space-y-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Frame</div>
            {frameRef && <div className="text-xs font-medium text-foreground">{frameRef}{frameModel ? ` — ${frameModel}` : ""}</div>}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {frameA && <span className="text-[10px] text-muted-foreground">A: {frameA}mm</span>}
              {frameB && <span className="text-[10px] text-muted-foreground">B: {frameB}mm</span>}
              {frameBridge && <span className="text-[10px] text-muted-foreground">Bridge: {frameBridge}mm</span>}
              {frameEd && <span className="text-[10px] text-muted-foreground">ED: {frameEd}mm</span>}
              {frameDbl && <span className="text-[10px] text-muted-foreground">DBL: {frameDbl}mm</span>}
            </div>
            <div className="flex items-center gap-1.5">
              {isUncut
                ? <Badge variant="outline" className="text-[9px] h-4">Uncut{uncutPrice ? ` $${uncutPrice}` : ""}</Badge>
                : <Badge className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-200">Edged (+$20.00)</Badge>
              }
            </div>
          </div>
        )}

        {/* Lens summary */}
        {lensLines.length > 0 && (
          <div className="border border-border rounded p-3 space-y-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Lens(es)</div>
            {lensLines.map(l => (
              <div key={l.id} className="space-y-0.5">
                <div className="text-xs font-medium text-foreground truncate">{l.item_name}</div>
                <div className="flex gap-2 text-[10px] text-muted-foreground font-mono">
                  <span>Cost: {l.unit_cost_landed_bbd.toFixed(2)}</span>
                  <span>Sell: {l.unit_sell_price_bbd.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rx summary — live from form */}
        {(sidebarRx.od_sph || sidebarRx.os_sph) && (
          <div className="border border-border rounded p-3 space-y-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Prescription</div>
            <div className="space-y-1">
              {(["od", "os"] as const).map(eye => {
                const sph = (sidebarRx as any)[`${eye}_sph`];
                const cyl = (sidebarRx as any)[`${eye}_cyl`];
                const axis = (sidebarRx as any)[`${eye}_axis`];
                const add = (sidebarRx as any)[`${eye}_add`];
                if (!sph && !cyl) return null;
                return (
                  <div key={eye} className="text-[10px]">
                    <span className="font-bold text-foreground mr-1.5">{eye.toUpperCase()}</span>
                    {sph && <span className="text-muted-foreground mr-1">SPH {sph}</span>}
                    {cyl && <span className="text-muted-foreground mr-1">CYL {cyl}</span>}
                    {axis && <span className="text-muted-foreground mr-1">×{axis}</span>}
                    {add && <span className="text-muted-foreground">ADD {add}</span>}
                  </div>
                );
              })}
              {sidebarRx.pd && <div className="text-[10px] text-muted-foreground">PD: {sidebarRx.pd}</div>}
            </div>
          </div>
        )}

        {/* Add-ons summary */}
        {addonLines.length > 0 && (
          <div className="border border-border rounded p-3 space-y-1.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Add-ons</div>
            {addonLines.map(l => (
              <div key={l.id} className="flex justify-between text-[11px]">
                <span className="text-foreground truncate mr-1">{l.description_override || l.item_name}</span>
                <span className="font-mono text-muted-foreground shrink-0">${(l.qty * l.unit_sell_price_bbd).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Financial summary */}
        <div className="border border-border rounded p-3 space-y-1.5">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Totals</div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-mono font-medium">${totals.subtotalSell.toFixed(2)}</span>
            </div>
            {edgingFeeInTotal > 0 && (
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Edging</span>
                <span className="font-mono text-muted-foreground">${edgingFeeInTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">GP $</span>
              <span className={cn("font-mono", totals.gpAmount >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}>
                ${totals.gpAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-muted-foreground">GP %</span>
              <span className={cn("font-mono", totals.gpPercent >= 48 ? "text-emerald-700 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                {totals.gpPercent.toFixed(1)}%
              </span>
            </div>
            <div className="border-t border-border pt-1 flex justify-between text-xs font-semibold">
              <span className="text-foreground">Grand Total</span>
              <span className="font-mono">${displayTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Flags */}
        {(totals.belowCostCount > 0 || totals.belowThresholdCount > 0 || totals.editedCount > 0 || totals.noCostCount > 0) && (
          <div className="border border-border rounded p-3 space-y-1">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Flags</div>
            {totals.belowCostCount > 0 && <div className="flex items-center gap-1.5 text-[11px] text-destructive"><XCircle className="h-3 w-3" /> {totals.belowCostCount} below-cost</div>}
            {totals.belowThresholdCount > 0 && <div className="flex items-center gap-1.5 text-[11px] text-amber-600"><AlertTriangle className="h-3 w-3" /> {totals.belowThresholdCount} below-threshold</div>}
            {totals.editedCount > 0 && <div className="flex items-center gap-1.5 text-[11px] text-primary"><MinusCircle className="h-3 w-3" /> {totals.editedCount} edited</div>}
            {totals.noCostCount > 0 && <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><AlertTriangle className="h-3 w-3" /> {totals.noCostCount} no-cost</div>}
          </div>
        )}

        {isRetail && (
          <div className="border border-amber-200 rounded p-2 bg-amber-50 dark:bg-amber-900/20">
            <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">Retail Mode Active</div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400">100% markup applied to lens & add-on prices</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RxQuoteWizard;
