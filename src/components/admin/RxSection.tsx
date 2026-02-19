import { useState, useEffect } from "react";
import { useRxDetails } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { QuoteLine } from "@/hooks/useQuotes";

interface RxSectionProps {
  lensLines: QuoteLine[];
}

// ── Validation helpers ──────────────────────────────────────────────────────
// SPH / CYL: ±0.00 in 0.25 steps, range -30 to +30
const validateSphCyl = (v: string) => {
  if (!v) return true;
  const n = parseFloat(v);
  if (isNaN(n)) return false;
  if (n < -30 || n > 30) return false;
  return Math.abs(Math.round(n * 100) % 25) < 1; // 0.25 steps
};

// AXIS: integer 0–180
const validateAxis = (v: string) => {
  if (!v) return true;
  const n = parseFloat(v);
  if (isNaN(n) || !Number.isInteger(n)) return false;
  return n >= 0 && n <= 180;
};

// ADD: 0 to +4.00 in 0.25 steps
const validateAdd = (v: string) => {
  if (!v) return true;
  const n = parseFloat(v);
  if (isNaN(n)) return false;
  if (n < 0 || n > 4) return false;
  return Math.abs(Math.round(n * 100) % 25) < 1;
};

// PD: 10–40 each eye or 50–80 binocular
const validatePd = (v: string) => {
  if (!v) return true;
  const n = parseFloat(v);
  if (isNaN(n)) return false;
  return (n >= 50 && n <= 80) || (n >= 10 && n <= 40);
};

// General positive decimal (FPD, NPD, OC, etc.)
const validatePositiveDecimal = (v: string) => {
  if (!v) return true;
  const n = parseFloat(v);
  return !isNaN(n) && n >= 0;
};

// Prism value: 0–20 Δ
const validatePrism = (v: string) => {
  if (!v) return true;
  const n = parseFloat(v);
  return !isNaN(n) && n >= 0 && n <= 20;
};

// Prism direction: BU BD BI BO or angle 0-360
const validatePrismDir = (v: string) => {
  if (!v) return true;
  const dirs = ["BU", "BD", "BI", "BO"];
  if (dirs.includes(v.toUpperCase())) return true;
  const n = parseFloat(v);
  return !isNaN(n) && n >= 0 && n <= 360;
};

const INITIAL_FORM = {
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

type FormState = typeof INITIAL_FORM;

// ── Field input with inline validation ──────────────────────────────────────
const RxInput = ({
  value, onChange, validate, placeholder = "",
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  validate?: (v: string) => boolean;
  placeholder?: string;
}) => {
  const isInvalid = validate ? !validate(value) : false;
  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="h-6 text-[11px] text-center px-0.5"
      style={isInvalid ? { borderColor: "hsl(0 60% 50%)", background: "hsl(0 60% 98%)" } : undefined}
    />
  );
};

// ── Collapsible section header ───────────────────────────────────────────────
const SectionToggle = ({
  label, open, onToggle, hasData,
}: {
  label: string; open: boolean; onToggle: () => void; hasData?: boolean;
}) => (
  <button
    onClick={onToggle}
    className="flex items-center gap-1 text-[11px] font-semibold select-none"
    style={{ color: hasData ? "hsl(215 65% 45%)" : "hsl(215 15% 50%)" }}
  >
    {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
    {label}
    {hasData && <span className="ml-1 text-[9px] px-1 py-px rounded" style={{ background: "hsl(215 65% 50% / 0.1)", color: "hsl(215 65% 45%)" }}>•</span>}
  </button>
);

// ── Main form ────────────────────────────────────────────────────────────────
const RxLineForm = ({ lineId }: { lineId: string }) => {
  const { data: rx, upsertMutation } = useRxDetails(lineId);
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [showPrism, setShowPrism] = useState(false);
  const [showDigital, setShowDigital] = useState(false);

  useEffect(() => {
    if (rx) {
      const toStr = (v: any) => (v != null ? String(v) : "");
      const next: any = {};
      for (const key of Object.keys(INITIAL_FORM)) next[key] = toStr((rx as any)[key]);
      setForm(next);
      // Auto-expand sections if data exists
      const hasPrism = !!(rx.od_prism_value || rx.os_prism_value || rx.od_slab_off || rx.os_slab_off);
      const hasDigital = !!(rx.od_face_form_angle || rx.od_panto || rx.os_face_form_angle || rx.od_vertex_refracted);
      setShowPrism(hasPrism);
      setShowDigital(hasDigital);
    } else {
      setForm({ ...INITIAL_FORM });
      setShowPrism(false);
      setShowDigital(false);
    }
  }, [rx, lineId]);

  // Axis warning
  const hasAxisWarning =
    (!!form.od_cyl && parseFloat(form.od_cyl) !== 0 && !form.od_axis) ||
    (!!form.os_cyl && parseFloat(form.os_cyl) !== 0 && !form.os_axis);

  const handleSave = () => {
    const toNum = (v: string) => v ? parseFloat(v) : null;
    const toStr = (v: string) => v || null;
    upsertMutation.mutate({
      quote_line_id: lineId,
      od_sph: toNum(form.od_sph), od_cyl: toNum(form.od_cyl),
      od_axis: toNum(form.od_axis), od_add: toNum(form.od_add),
      os_sph: toNum(form.os_sph), os_cyl: toNum(form.os_cyl),
      os_axis: toNum(form.os_axis), os_add: toNum(form.os_add),
      od_fpd: toNum(form.od_fpd), od_npd: toNum(form.od_npd),
      os_fpd: toNum(form.os_fpd), os_npd: toNum(form.os_npd),
      od_oc: toNum(form.od_oc), os_oc: toNum(form.os_oc),
      od_bc: toNum(form.od_bc), os_bc: toNum(form.os_bc),
      od_prism_value: toNum(form.od_prism_value), od_prism_dir: toStr(form.od_prism_dir),
      od_prism2_value: toNum(form.od_prism2_value), od_prism2_dir: toStr(form.od_prism2_dir),
      os_prism_value: toNum(form.os_prism_value), os_prism_dir: toStr(form.os_prism_dir),
      os_prism2_value: toNum(form.os_prism2_value), os_prism2_dir: toStr(form.os_prism2_dir),
      od_slab_off: toNum(form.od_slab_off), os_slab_off: toNum(form.os_slab_off),
      od_special_thickness: toStr(form.od_special_thickness),
      os_special_thickness: toStr(form.os_special_thickness),
      od_face_form_angle: toNum(form.od_face_form_angle), od_panto: toNum(form.od_panto),
      od_object_distance: toNum(form.od_object_distance),
      od_vertex_refracted: toNum(form.od_vertex_refracted),
      od_vertex_fitted: toNum(form.od_vertex_fitted),
      od_eye_level: toNum(form.od_eye_level), od_inset: toNum(form.od_inset), od_ercd: toNum(form.od_ercd),
      os_face_form_angle: toNum(form.os_face_form_angle), os_panto: toNum(form.os_panto),
      os_object_distance: toNum(form.os_object_distance),
      os_vertex_refracted: toNum(form.os_vertex_refracted),
      os_vertex_fitted: toNum(form.os_vertex_fitted),
      os_eye_level: toNum(form.os_eye_level), os_inset: toNum(form.os_inset), os_ercd: toNum(form.os_ercd),
      pd: toStr(form.pd), seg_height: toStr(form.seg_height),
      fitting_height: toStr(form.fitting_height), rx_notes: toStr(form.rx_notes),
    } as any, {
      onSuccess: () => toast({ title: "Rx details saved" }),
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const tdStyle = "px-0.5 py-0.5";
  const thStyle = "px-1 py-0.5 text-[9px] font-semibold text-muted-foreground text-center whitespace-nowrap";
  const eyeStyle = "px-1.5 py-0.5 text-[10px] font-bold w-8";
  const tblStyle = { borderColor: "hsl(215 15% 85%)" };
  const headBg = { background: "hsl(215 15% 97%)" };

  const hasPrismData = !!(form.od_prism_value || form.os_prism_value || form.od_slab_off || form.os_slab_off);
  const hasDigitalData = !!(form.od_face_form_angle || form.od_panto || form.os_face_form_angle);

  return (
    <div className="space-y-2">
      {/* ── Prescription table ─────────────────────────────── */}
      <div className="border rounded overflow-hidden" style={tblStyle}>
        <table className="w-full text-xs">
          <thead>
            <tr style={headBg}>
              <th className={`text-left ${eyeStyle} text-muted-foreground`}>Rx</th>
              <th className={thStyle}>SPH</th>
              <th className={thStyle}>CYL</th>
              <th className={thStyle}>AXIS</th>
              <th className={thStyle}>ADD</th>
              <th className="w-px" style={{ background: "hsl(215 15% 88%)" }} />
              <th className={thStyle}>FPD</th>
              <th className={thStyle}>NPD</th>
              <th className={thStyle}>OC</th>
              <th className={thStyle}>BC</th>
              <th className="w-px" style={{ background: "hsl(215 15% 88%)" }} />
              <th className={thStyle}>Seg Ht</th>
              <th className={thStyle}>Fit Ht</th>
            </tr>
          </thead>
          <tbody>
            {(["od", "os"] as const).map(eye => (
              <tr key={eye} className="border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
                <td className={`${eyeStyle} font-bold`} style={{ color: "hsl(215 30% 30%)" }}>{eye.toUpperCase()}</td>
                <td className={tdStyle}><RxInput value={form[`${eye}_sph`]} onChange={set(`${eye}_sph`)} validate={validateSphCyl} /></td>
                <td className={tdStyle}><RxInput value={form[`${eye}_cyl`]} onChange={set(`${eye}_cyl`)} validate={validateSphCyl} /></td>
                <td className={tdStyle}><RxInput value={form[`${eye}_axis`]} onChange={set(`${eye}_axis`)} validate={validateAxis} /></td>
                <td className={tdStyle}><RxInput value={form[`${eye}_add`]} onChange={set(`${eye}_add`)} validate={validateAdd} /></td>
                <td className="w-px" style={{ background: "hsl(215 15% 88%)" }} />
                <td className={tdStyle}><RxInput value={form[`${eye}_fpd`]} onChange={set(`${eye}_fpd`)} validate={validatePositiveDecimal} /></td>
                <td className={tdStyle}><RxInput value={form[`${eye}_npd`]} onChange={set(`${eye}_npd`)} validate={validatePositiveDecimal} /></td>
                <td className={tdStyle}><RxInput value={form[`${eye}_oc`]} onChange={set(`${eye}_oc`)} validate={validatePositiveDecimal} /></td>
                <td className={tdStyle}><RxInput value={form[`${eye}_bc`]} onChange={set(`${eye}_bc`)} validate={validatePositiveDecimal} /></td>
                <td className="w-px" style={{ background: "hsl(215 15% 88%)" }} />
                <td className={tdStyle}>
                  {eye === "od"
                    ? <RxInput value={form.seg_height} onChange={set("seg_height")} validate={validatePositiveDecimal} />
                    : <RxInput value={form.fitting_height} onChange={set("fitting_height")} validate={validatePositiveDecimal} />
                  }
                </td>
                <td className={tdStyle}>
                  {eye === "od"
                    ? <RxInput value={form.pd} onChange={set("pd")} validate={validatePd} placeholder="PD" />
                    : <span className="block text-center text-[9px] text-muted-foreground pt-1">—</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasAxisWarning && (
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px]" style={{ background: "hsl(35 80% 50% / 0.12)", color: "hsl(35 80% 40%)" }}>
          ⚠ Cyl set without Axis
        </div>
      )}

      {/* ── Prism & Slab-Off (collapsible) ────────────────── */}
      <div>
        <SectionToggle label="Prism & Slab-Off" open={showPrism} onToggle={() => setShowPrism(v => !v)} hasData={hasPrismData} />
        {showPrism && (
          <div className="border rounded overflow-hidden mt-1" style={tblStyle}>
            <table className="w-full text-xs">
              <thead>
                <tr style={headBg}>
                  <th className={`text-left ${eyeStyle} text-muted-foreground`} />
                  <th className={thStyle}>P1 Δ</th>
                  <th className={thStyle}>P1 Dir</th>
                  <th className={thStyle}>P2 Δ</th>
                  <th className={thStyle}>P2 Dir</th>
                  <th className="w-px" style={{ background: "hsl(215 15% 88%)" }} />
                  <th className={thStyle}>Slab-Off</th>
                  <th className={thStyle}>Sp. Thick</th>
                </tr>
              </thead>
              <tbody>
                {(["od", "os"] as const).map(eye => (
                  <tr key={eye} className="border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
                    <td className={`${eyeStyle} font-bold`} style={{ color: "hsl(215 30% 30%)" }}>{eye.toUpperCase()}</td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_prism_value`]} onChange={set(`${eye}_prism_value`)} validate={validatePrism} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_prism_dir`]} onChange={set(`${eye}_prism_dir`)} validate={validatePrismDir} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_prism2_value`]} onChange={set(`${eye}_prism2_value`)} validate={validatePrism} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_prism2_dir`]} onChange={set(`${eye}_prism2_dir`)} validate={validatePrismDir} /></td>
                    <td className="w-px" style={{ background: "hsl(215 15% 88%)" }} />
                    <td className={tdStyle}><RxInput value={form[`${eye}_slab_off`]} onChange={set(`${eye}_slab_off`)} validate={validatePositiveDecimal} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_special_thickness`]} onChange={set(`${eye}_special_thickness`)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Digital Measurements (collapsible) ────────────── */}
      <div>
        <SectionToggle label="Digital Measurements" open={showDigital} onToggle={() => setShowDigital(v => !v)} hasData={hasDigitalData} />
        {showDigital && (
          <div className="border rounded overflow-hidden mt-1" style={tblStyle}>
            <table className="w-full text-xs">
              <thead>
                <tr style={headBg}>
                  <th className={`text-left ${eyeStyle} text-muted-foreground`} />
                  <th className={thStyle}>Face Form</th>
                  <th className={thStyle}>Panto</th>
                  <th className={thStyle}>Obj Dist</th>
                  <th className={thStyle}>Vtx Ref</th>
                  <th className={thStyle}>Vtx Fit</th>
                  <th className={thStyle}>Eye Lvl</th>
                  <th className={thStyle}>Inset</th>
                  <th className={thStyle}>ERCD</th>
                </tr>
              </thead>
              <tbody>
                {(["od", "os"] as const).map(eye => (
                  <tr key={eye} className="border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
                    <td className={`${eyeStyle} font-bold`} style={{ color: "hsl(215 30% 30%)" }}>{eye.toUpperCase()}</td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_face_form_angle`]} onChange={set(`${eye}_face_form_angle`)} validate={validatePositiveDecimal} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_panto`]} onChange={set(`${eye}_panto`)} validate={validatePositiveDecimal} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_object_distance`]} onChange={set(`${eye}_object_distance`)} validate={validatePositiveDecimal} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_vertex_refracted`]} onChange={set(`${eye}_vertex_refracted`)} validate={validatePositiveDecimal} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_vertex_fitted`]} onChange={set(`${eye}_vertex_fitted`)} validate={validatePositiveDecimal} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_eye_level`]} onChange={set(`${eye}_eye_level`)} validate={validatePositiveDecimal} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_inset`]} onChange={set(`${eye}_inset`)} validate={validatePositiveDecimal} /></td>
                    <td className={tdStyle}><RxInput value={form[`${eye}_ercd`]} onChange={set(`${eye}_ercd`)} validate={validatePositiveDecimal} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Notes + Save ──────────────────────────────────── */}
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <label className="text-[9px] font-medium block mb-0.5 text-muted-foreground">Rx Notes</label>
          <Textarea value={form.rx_notes} onChange={set("rx_notes")} className="text-xs min-h-[36px] py-1" />
        </div>
        <Button
          size="sm"
          className="h-7 text-xs mt-4 shrink-0"
          style={{ background: "hsl(215 65% 50%)", color: "white" }}
          onClick={handleSave}
          disabled={upsertMutation.isPending}
        >
          {upsertMutation.isPending ? "Saving…" : "Save Rx"}
        </Button>
      </div>
    </div>
  );
};

// ── Outer section wrapper ────────────────────────────────────────────────────
const RxSection = ({ lensLines }: RxSectionProps) => {
  const [selectedLineId, setSelectedLineId] = useState<string>("");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (lensLines.length > 0 && !selectedLineId) setSelectedLineId(lensLines[0].id);
    if (selectedLineId && !lensLines.find(l => l.id === selectedLineId)) {
      setSelectedLineId(lensLines[0]?.id ?? "");
    }
  }, [lensLines.map(l => l.id).join(",")]);

  if (lensLines.length === 0) {
    return (
      <div className="border rounded px-3 py-2 text-[11px]" style={{ borderColor: "hsl(215 15% 85%)", color: "hsl(215 15% 55%)" }}>
        Add a lens line to enter Rx details.
      </div>
    );
  }

  return (
    <div className="border rounded" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)" }}>
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer select-none"
        style={{ borderBottom: collapsed ? "none" : "1px solid hsl(215 15% 88%)", background: "hsl(215 15% 97%)" }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Rx Details</span>
        </div>
        {lensLines.length > 1 && !collapsed && (
          <div onClick={e => e.stopPropagation()}>
            <Select value={selectedLineId} onValueChange={setSelectedLineId}>
              <SelectTrigger className="h-6 text-[11px] w-[200px]">
                <SelectValue placeholder="Select lens line…" />
              </SelectTrigger>
              <SelectContent>
                {lensLines.map(l => (
                  <SelectItem key={l.id} value={l.id} className="text-xs">{l.item_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {lensLines.length === 1 && (
          <span className="text-[11px]" style={{ color: "hsl(215 15% 50%)" }}>{lensLines[0].item_name}</span>
        )}
      </div>

      {!collapsed && selectedLineId && (
        <div className="p-3">
          <RxLineForm key={selectedLineId} lineId={selectedLineId} />
        </div>
      )}
    </div>
  );
};

export default RxSection;
