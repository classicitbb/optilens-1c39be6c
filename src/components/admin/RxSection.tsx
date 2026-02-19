import { useState, useEffect } from "react";
import { useRxDetails } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { QuoteLine } from "@/hooks/useQuotes";

interface RxSectionProps {
  lensLines: QuoteLine[];
}

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

const RxLineForm = ({ lineId }: { lineId: string }) => {
  const { data: rx, upsertMutation } = useRxDetails(lineId);
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [hasAxisWarning, setHasAxisWarning] = useState(false);

  useEffect(() => {
    if (rx) {
      const toStr = (v: any) => (v != null ? String(v) : "");
      const next: any = {};
      for (const key of Object.keys(INITIAL_FORM)) next[key] = toStr((rx as any)[key]);
      setForm(next);
    } else {
      setForm({ ...INITIAL_FORM });
    }
  }, [rx, lineId]);

  useEffect(() => {
    const odCylSet = form.od_cyl && parseFloat(form.od_cyl) !== 0;
    const odAxisMissing = !form.od_axis;
    const osCylSet = form.os_cyl && parseFloat(form.os_cyl) !== 0;
    const osAxisMissing = !form.os_axis;
    setHasAxisWarning((!!odCylSet && odAxisMissing) || (!!osCylSet && osAxisMissing));
  }, [form.od_cyl, form.od_axis, form.os_cyl, form.os_axis]);

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

  const fc = "h-7 text-xs text-center";
  const th = "px-1 py-1 text-[10px] font-semibold text-muted-foreground";
  const td = "px-0.5 py-0.5";
  const eyeLabel = "px-2 py-1 font-semibold text-[10px] text-muted-foreground";

  return (
    <div className="space-y-4">
      {/* Prescription */}
      <div>
        <div className="text-[11px] font-semibold mb-1" style={{ color: "hsl(215 30% 15%)" }}>Prescription</div>
        <div className="border rounded overflow-hidden" style={{ borderColor: "hsl(215 15% 85%)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "hsl(215 15% 96%)" }}>
                <th className="text-left px-2 py-1 text-[10px] font-semibold w-10 text-muted-foreground">Rx</th>
                <th className={th}>SPH</th>
                <th className={th}>CYL</th>
                <th className={th}>AXIS</th>
                <th className={th}>Fpd</th>
                <th className={th}>Npd</th>
                <th className={th}>ADD</th>
                <th className={th}>Seg</th>
                <th className={th}>Oc</th>
                <th className={th}>Bc</th>
              </tr>
            </thead>
            <tbody>
              {(["od", "os"] as const).map(eye => (
                <tr key={eye} className="border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
                  <td className={eyeLabel}>{eye.toUpperCase()}</td>
                  <td className={td}><Input value={form[`${eye}_sph`]} onChange={set(`${eye}_sph`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_cyl`]} onChange={set(`${eye}_cyl`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_axis`]} onChange={set(`${eye}_axis`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_fpd`]} onChange={set(`${eye}_fpd`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_npd`]} onChange={set(`${eye}_npd`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_add`]} onChange={set(`${eye}_add`)} className={fc} /></td>
                  <td className={td}>
                    {eye === "od"
                      ? <Input value={form.seg_height} onChange={set("seg_height")} className={fc} />
                      : <Input value={form.fitting_height} onChange={set("fitting_height")} className={fc} placeholder="Fit Ht" />
                    }
                  </td>
                  <td className={td}><Input value={form[`${eye}_oc`]} onChange={set(`${eye}_oc`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_bc`]} onChange={set(`${eye}_bc`)} className={fc} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {hasAxisWarning && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px]" style={{ background: "hsl(35 80% 50% / 0.12)", color: "hsl(35 80% 40%)" }}>
          ⚠ Cyl entered without Axis
        </div>
      )}

      {/* Prism & Slab-Off */}
      <div>
        <div className="text-[11px] font-semibold mb-1" style={{ color: "hsl(215 30% 15%)" }}>Prism & Slab-Off</div>
        <div className="border rounded overflow-hidden" style={{ borderColor: "hsl(215 15% 85%)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "hsl(215 15% 96%)" }}>
                <th className="text-left px-2 py-1 text-[10px] font-semibold w-10 text-muted-foreground"></th>
                <th className={th} colSpan={2}>Prism</th>
                <th className={th} colSpan={2}>Prism 2</th>
                <th className={th}>Slab-Off</th>
                <th className={th}>Special Thickness</th>
              </tr>
              <tr style={{ background: "hsl(215 15% 96%)" }}>
                <th></th>
                <th className="px-1 text-[9px] text-muted-foreground">Value</th>
                <th className="px-1 text-[9px] text-muted-foreground">Dir</th>
                <th className="px-1 text-[9px] text-muted-foreground">Value</th>
                <th className="px-1 text-[9px] text-muted-foreground">Dir</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(["od", "os"] as const).map(eye => (
                <tr key={eye} className="border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
                  <td className={eyeLabel}>{eye.toUpperCase()}</td>
                  <td className={td}><Input value={form[`${eye}_prism_value`]} onChange={set(`${eye}_prism_value`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_prism_dir`]} onChange={set(`${eye}_prism_dir`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_prism2_value`]} onChange={set(`${eye}_prism2_value`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_prism2_dir`]} onChange={set(`${eye}_prism2_dir`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_slab_off`]} onChange={set(`${eye}_slab_off`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_special_thickness`]} onChange={set(`${eye}_special_thickness`)} className={fc} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital Measurements */}
      <div>
        <div className="text-[11px] font-semibold mb-1" style={{ color: "hsl(215 30% 15%)" }}>Digital Measurements</div>
        <div className="border rounded overflow-hidden" style={{ borderColor: "hsl(215 15% 85%)" }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "hsl(215 15% 96%)" }}>
                <th className="text-left px-2 py-1 text-[10px] font-semibold w-14 text-muted-foreground">Digital</th>
                <th className={th}>Face Form</th>
                <th className={th}>PANTO</th>
                <th className={th}>Obj Dist</th>
                <th className={th}>Vtx Ref</th>
                <th className={th}>Vtx Fit</th>
                <th className={th}>Eye Lvl</th>
                <th className={th}>Inset</th>
                <th className={th}>ERCD</th>
              </tr>
            </thead>
            <tbody>
              {(["od", "os"] as const).map(eye => (
                <tr key={eye} className="border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
                  <td className={eyeLabel}>{eye.toUpperCase()}</td>
                  <td className={td}><Input value={form[`${eye}_face_form_angle`]} onChange={set(`${eye}_face_form_angle`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_panto`]} onChange={set(`${eye}_panto`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_object_distance`]} onChange={set(`${eye}_object_distance`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_vertex_refracted`]} onChange={set(`${eye}_vertex_refracted`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_vertex_fitted`]} onChange={set(`${eye}_vertex_fitted`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_eye_level`]} onChange={set(`${eye}_eye_level`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_inset`]} onChange={set(`${eye}_inset`)} className={fc} /></td>
                  <td className={td}><Input value={form[`${eye}_ercd`]} onChange={set(`${eye}_ercd`)} className={fc} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PD + Notes */}
      <div className="grid grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-[10px] font-medium block mb-0.5 text-muted-foreground">PD</label>
          <Input value={form.pd} onChange={set("pd")} className={fc} />
        </div>
        <div>
          <label className="text-[10px] font-medium block mb-0.5 text-muted-foreground">Seg Height</label>
          <Input value={form.seg_height} onChange={set("seg_height")} className={fc} />
        </div>
        <div>
          <label className="text-[10px] font-medium block mb-0.5 text-muted-foreground">Fitting Height</label>
          <Input value={form.fitting_height} onChange={set("fitting_height")} className={fc} />
        </div>
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-7 text-xs"
            style={{ background: "hsl(215 65% 50%)", color: "white" }}
            onClick={handleSave}
            disabled={upsertMutation.isPending}
          >
            {upsertMutation.isPending ? "Saving…" : "Save Rx"}
          </Button>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-medium block mb-0.5 text-muted-foreground">Rx Notes</label>
        <Textarea value={form.rx_notes} onChange={set("rx_notes")} className="text-xs min-h-[50px]" />
      </div>
    </div>
  );
};

const RxSection = ({ lensLines }: RxSectionProps) => {
  const [selectedLineId, setSelectedLineId] = useState<string>("");

  useEffect(() => {
    if (lensLines.length > 0 && !selectedLineId) {
      setSelectedLineId(lensLines[0].id);
    }
    // If the selected line was removed, reset
    if (selectedLineId && !lensLines.find(l => l.id === selectedLineId)) {
      setSelectedLineId(lensLines[0]?.id ?? "");
    }
  }, [lensLines.map(l => l.id).join(",")]);

  if (lensLines.length === 0) {
    return (
      <div className="border rounded p-4 text-center text-xs" style={{ borderColor: "hsl(215 15% 85%)", color: "hsl(215 15% 55%)" }}>
        Add a lens line item to enter Rx details.
      </div>
    );
  }

  return (
    <div className="border rounded p-4 space-y-4" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)" }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Rx Details</h2>
        {lensLines.length > 1 && (
          <Select value={selectedLineId} onValueChange={setSelectedLineId}>
            <SelectTrigger className="h-7 text-xs w-[220px]">
              <SelectValue placeholder="Select lens line…" />
            </SelectTrigger>
            <SelectContent>
              {lensLines.map(l => (
                <SelectItem key={l.id} value={l.id} className="text-xs">{l.item_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {lensLines.length === 1 && (
          <span className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>{lensLines[0].item_name}</span>
        )}
      </div>

      {selectedLineId && <RxLineForm key={selectedLineId} lineId={selectedLineId} />}
    </div>
  );
};

export default RxSection;
