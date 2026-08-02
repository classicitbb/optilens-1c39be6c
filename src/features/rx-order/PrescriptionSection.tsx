import { useState, useEffect } from "react";
import { useRxDetails, QuoteLine } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Prescription entry for one lens line. Persistence shape matches the proven
// RxQuoteWizard PrescriptionStep exactly (same rx_details upsert) — this is
// the shared-module equivalent so the portal surface can reuse it without
// importing admin components.

const validateSphCyl = (v: string) => { if (!v) return true; const n = parseFloat(v); if (isNaN(n) || n < -30 || n > 30) return false; return Math.abs(Math.round(n * 100) % 25) < 1; };
const validateAxis = (v: string) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && Number.isInteger(n) && n >= 0 && n <= 180; };
const validateAdd = (v: string) => { if (!v) return true; const n = parseFloat(v); if (isNaN(n) || n < 0 || n > 4) return false; return Math.abs(Math.round(n * 100) % 25) < 1; };
const validatePd = (v: string) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && ((n >= 50 && n <= 80) || (n >= 10 && n <= 40)); };
const validatePositiveDecimal = (v: string) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && n >= 0; };
const validatePrism = (v: string) => { if (!v) return true; const n = parseFloat(v); return !isNaN(n) && n >= 0 && n <= 20; };

const RxInput = ({ value, onChange, validate, placeholder = "" }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validate?: (v: string) => boolean; placeholder?: string;
}) => {
  const isInvalid = validate ? !validate(value) : false;
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full h-7 px-1 rounded border bg-background text-left text-[11px] focus:outline-none focus:ring-1 focus:ring-inset focus:ring-ring",
        isInvalid && value ? "border-destructive bg-destructive/5" : "border-input",
      )}
    />
  );
};

export const INITIAL_RX = {
  od_sph: "", od_cyl: "", od_axis: "", od_add: "",
  os_sph: "", os_cyl: "", os_axis: "", os_add: "",
  od_fpd: "", od_npd: "", os_fpd: "", os_npd: "",
  od_oc: "", os_oc: "", od_bc: "", os_bc: "",
  od_prism_value: "", od_prism_dir: "", od_prism2_value: "", od_prism2_dir: "",
  os_prism_value: "", os_prism_dir: "", os_prism2_value: "", os_prism2_dir: "",
  od_slab_off: "", os_slab_off: "",
  od_special_thickness: "", os_special_thickness: "",
  pd: "", seg_height: "", fitting_height: "", rx_notes: "",
};
export type RxForm = typeof INITIAL_RX;

const NUMERIC_KEYS = new Set([
  "od_sph", "od_cyl", "od_axis", "od_add", "os_sph", "os_cyl", "os_axis", "os_add",
  "od_fpd", "od_npd", "os_fpd", "os_npd", "od_oc", "os_oc", "od_bc", "os_bc",
  "od_prism_value", "od_prism2_value", "os_prism_value", "os_prism2_value",
  "od_slab_off", "os_slab_off",
]);

export const PrescriptionSection = ({ lensLine, onSaved }: { lensLine: QuoteLine; onSaved?: () => void }) => {
  const { data: rx, upsertMutation } = useRxDetails(lensLine.id);
  const { toast } = useToast();
  const [form, setForm] = useState<RxForm>({ ...INITIAL_RX });
  const [showPrism, setShowPrism] = useState(false);

  useEffect(() => {
    if (rx) {
      const toStr = (v: unknown) => (v != null ? String(v) : "");
      const next: Record<string, string> = {};
      for (const k of Object.keys(INITIAL_RX)) next[k] = toStr((rx as any)[k]);
      setForm(next as RxForm);
      setShowPrism(!!(rx.od_prism_value || rx.os_prism_value));
    }
  }, [rx, lensLine.id]);

  const set = (key: keyof RxForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const hasAxisWarning =
    (!!form.od_cyl && parseFloat(form.od_cyl) !== 0 && !form.od_axis) ||
    (!!form.os_cyl && parseFloat(form.os_cyl) !== 0 && !form.os_axis);

  const missingRx = !form.od_sph && !form.os_sph;

  const handleSave = () => {
    const payload: Record<string, unknown> = { quote_line_id: lensLine.id };
    for (const [k, v] of Object.entries(form)) {
      payload[k] = v === "" ? null : NUMERIC_KEYS.has(k) ? parseFloat(v) : v;
    }
    upsertMutation.mutate(payload as any, {
      onSuccess: () => { toast({ title: "Prescription saved" }); onSaved?.(); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const th = "px-1 py-0.5 text-[9px] font-semibold text-center text-muted-foreground";
  const td = "px-0.5 py-0.5";
  const eyeLbl = "px-2 py-1 text-[10px] font-bold text-foreground w-10 text-center";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold text-foreground">{lensLine.item_name}</div>
        <Badge variant="outline" className="text-[10px]">{lensLine.line_type}</Badge>
      </div>

      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50">
              <th className={`${th} text-left`}>Rx</th>
              <th className={th}>SPH</th><th className={th}>CYL</th><th className={th}>AXIS</th><th className={th}>ADD</th>
              <th className="w-px bg-border" />
              <th className={th}>FPD</th><th className={th}>NPD</th><th className={th}>OC</th><th className={th}>BC</th>
              <th className="w-px bg-border" />
              <th className={th}>Seg Ht</th><th className={th}>Fit Ht</th><th className={th}>PD</th>
            </tr>
          </thead>
          <tbody>
            {(["od", "os"] as const).map((eye) => (
              <tr key={eye} className="border-t border-border">
                <td className={eyeLbl}>{eye.toUpperCase()}</td>
                <td className={td}><RxInput value={form[`${eye}_sph`]} onChange={set(`${eye}_sph`)} validate={validateSphCyl} /></td>
                <td className={td}><RxInput value={form[`${eye}_cyl`]} onChange={set(`${eye}_cyl`)} validate={validateSphCyl} /></td>
                <td className={td}><RxInput value={form[`${eye}_axis`]} onChange={set(`${eye}_axis`)} validate={validateAxis} /></td>
                <td className={td}><RxInput value={form[`${eye}_add`]} onChange={set(`${eye}_add`)} validate={validateAdd} /></td>
                <td className="w-px bg-border" />
                <td className={td}><RxInput value={form[`${eye}_fpd`]} onChange={set(`${eye}_fpd`)} validate={validatePositiveDecimal} /></td>
                <td className={td}><RxInput value={form[`${eye}_npd`]} onChange={set(`${eye}_npd`)} validate={validatePositiveDecimal} /></td>
                <td className={td}><RxInput value={form[`${eye}_oc`]} onChange={set(`${eye}_oc`)} validate={validatePositiveDecimal} /></td>
                <td className={td}><RxInput value={form[`${eye}_bc`]} onChange={set(`${eye}_bc`)} validate={validatePositiveDecimal} /></td>
                <td className="w-px bg-border" />
                <td className={td}><RxInput value={form.seg_height} onChange={set("seg_height")} validate={validatePositiveDecimal} /></td>
                <td className={td}><RxInput value={form.fitting_height} onChange={set("fitting_height")} validate={validatePositiveDecimal} /></td>
                {eye === "od"
                  ? <td className={td}><RxInput value={form.pd} onChange={set("pd")} validate={validatePd} /></td>
                  : <td className={td}><span className="block text-center text-[9px] text-muted-foreground pt-1">—</span></td>}
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

      <div>
        <button
          onClick={() => setShowPrism((v) => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground mb-1"
        >
          {showPrism ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Prism & Slab-Off
        </button>
        {showPrism && (
          <div className="border border-border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className={`${th} text-left`} />
                  <th className={th}>P1 Δ</th><th className={th}>P1 Dir</th>
                  <th className={th}>P2 Δ</th><th className={th}>P2 Dir</th>
                  <th className="w-px bg-border" />
                  <th className={th}>Slab-Off</th><th className={th}>Sp.Thick</th>
                </tr>
              </thead>
              <tbody>
                {(["od", "os"] as const).map((eye) => (
                  <tr key={eye} className="border-t border-border">
                    <td className={eyeLbl}>{eye.toUpperCase()}</td>
                    <td className={td}><RxInput value={form[`${eye}_prism_value`]} onChange={set(`${eye}_prism_value`)} validate={validatePrism} /></td>
                    <td className={td}><RxInput value={form[`${eye}_prism_dir`]} onChange={set(`${eye}_prism_dir`)} /></td>
                    <td className={td}><RxInput value={form[`${eye}_prism2_value`]} onChange={set(`${eye}_prism2_value`)} validate={validatePrism} /></td>
                    <td className={td}><RxInput value={form[`${eye}_prism2_dir`]} onChange={set(`${eye}_prism2_dir`)} /></td>
                    <td className="w-px bg-border" />
                    <td className={td}><RxInput value={form[`${eye}_slab_off`]} onChange={set(`${eye}_slab_off`)} validate={validatePositiveDecimal} /></td>
                    <td className={td}><RxInput value={form[`${eye}_special_thickness`]} onChange={set(`${eye}_special_thickness`)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Rx Notes</label>
        <Textarea value={form.rx_notes} onChange={set("rx_notes")} className="text-xs min-h-[40px]" />
      </div>

      <div className="flex justify-end pt-1">
        <Button size="sm" className="h-7 text-xs" onClick={handleSave} disabled={upsertMutation.isPending || missingRx}>
          {upsertMutation.isPending ? "Saving…" : "Save Prescription"}
        </Button>
      </div>
    </div>
  );
};

export default PrescriptionSection;
