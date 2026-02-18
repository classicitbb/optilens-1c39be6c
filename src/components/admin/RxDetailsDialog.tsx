import { useState, useEffect } from "react";
import { useRxDetails } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RxDetailsDialogProps {
  lineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

const RxDetailsDialog = ({ lineId, open, onOpenChange }: RxDetailsDialogProps) => {
  const { data: rx, upsertMutation } = useRxDetails(lineId);
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [hasAxisWarning, setHasAxisWarning] = useState(false);

  useEffect(() => {
    if (rx) {
      const toStr = (v: any) => (v != null ? String(v) : "");
      const next: any = {};
      for (const key of Object.keys(INITIAL_FORM)) {
        next[key] = toStr((rx as any)[key]);
      }
      setForm(next);
    }
  }, [rx]);

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
      onSuccess: () => { toast({ title: "Rx details saved" }); onOpenChange(false); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [key]: e.target.value }));

  const fieldClass = "h-7 text-xs text-center";
  const labelClass = "text-[10px] font-medium text-center block mb-0.5 text-muted-foreground";
  const sectionTitle = "text-[11px] font-semibold mb-1 text-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Rx Details</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4 py-2">
            {/* === Main Rx Table === */}
            <div>
              <div className={sectionTitle}>Prescription</div>
              <div className="border rounded overflow-hidden" style={{ borderColor: "hsl(215 15% 85%)" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "hsl(215 15% 96%)" }}>
                      <th className="text-left px-2 py-1 text-[10px] font-semibold w-10 text-muted-foreground">Rx</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">SPH</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">CYL</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">AXIS</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Fpd</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Npd</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">ADD</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Seg</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Oc</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Bc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["od", "os"] as const).map(eye => (
                      <tr key={eye} className="border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
                        <td className="px-2 py-1 font-semibold text-[10px] text-muted-foreground">{eye.toUpperCase()}</td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_sph`]} onChange={set(`${eye}_sph`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_cyl`]} onChange={set(`${eye}_cyl`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_axis`]} onChange={set(`${eye}_axis`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_fpd`]} onChange={set(`${eye}_fpd`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_npd`]} onChange={set(`${eye}_npd`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_add`]} onChange={set(`${eye}_add`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5">
                          {eye === "od"
                            ? <Input value={form.seg_height} onChange={set("seg_height")} className={fieldClass} />
                            : <Input value={form.fitting_height} onChange={set("fitting_height")} className={fieldClass} placeholder="Fit Ht" />
                          }
                        </td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_oc`]} onChange={set(`${eye}_oc`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_bc`]} onChange={set(`${eye}_bc`)} className={fieldClass} /></td>
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

            {/* === Prism Table === */}
            <div>
              <div className={sectionTitle}>Prism & Slab-Off</div>
              <div className="border rounded overflow-hidden" style={{ borderColor: "hsl(215 15% 85%)" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "hsl(215 15% 96%)" }}>
                      <th className="text-left px-2 py-1 text-[10px] font-semibold w-10 text-muted-foreground"></th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground" colSpan={2}>Prism</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground" colSpan={2}>Prism 2</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Slab-Off</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Special Thickness</th>
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
                        <td className="px-2 py-1 font-semibold text-[10px] text-muted-foreground">{eye.toUpperCase()}</td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_prism_value`]} onChange={set(`${eye}_prism_value`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_prism_dir`]} onChange={set(`${eye}_prism_dir`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_prism2_value`]} onChange={set(`${eye}_prism2_value`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_prism2_dir`]} onChange={set(`${eye}_prism2_dir`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_slab_off`]} onChange={set(`${eye}_slab_off`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_special_thickness`]} onChange={set(`${eye}_special_thickness`)} className={fieldClass} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* === Digital Table === */}
            <div>
              <div className={sectionTitle}>Digital Measurements</div>
              <div className="border rounded overflow-hidden" style={{ borderColor: "hsl(215 15% 85%)" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "hsl(215 15% 96%)" }}>
                      <th className="text-left px-2 py-1 text-[10px] font-semibold w-14 text-muted-foreground">Digital</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Face Form</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">PANTO</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Obj Dist</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Vtx Ref</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Vtx Fit</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Eye Lvl</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">Inset</th>
                      <th className="px-1 py-1 text-[10px] font-semibold text-muted-foreground">ERCD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(["od", "os"] as const).map(eye => (
                      <tr key={eye} className="border-t" style={{ borderColor: "hsl(215 15% 90%)" }}>
                        <td className="px-2 py-1 font-semibold text-[10px] text-muted-foreground">{eye.toUpperCase()}</td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_face_form_angle`]} onChange={set(`${eye}_face_form_angle`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_panto`]} onChange={set(`${eye}_panto`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_object_distance`]} onChange={set(`${eye}_object_distance`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_vertex_refracted`]} onChange={set(`${eye}_vertex_refracted`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_vertex_fitted`]} onChange={set(`${eye}_vertex_fitted`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_eye_level`]} onChange={set(`${eye}_eye_level`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_inset`]} onChange={set(`${eye}_inset`)} className={fieldClass} /></td>
                        <td className="px-0.5 py-0.5"><Input value={form[`${eye}_ercd`]} onChange={set(`${eye}_ercd`)} className={fieldClass} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PD + Notes */}
            <div className="grid grid-cols-3 gap-2">
              <div><label className={labelClass}>PD</label>
                <Input value={form.pd} onChange={set("pd")} className={fieldClass} /></div>
              <div><label className={labelClass}>Seg Height</label>
                <Input value={form.seg_height} onChange={set("seg_height")} className={fieldClass} /></div>
              <div><label className={labelClass}>Fitting Height</label>
                <Input value={form.fitting_height} onChange={set("fitting_height")} className={fieldClass} /></div>
            </div>

            <div>
              <label className="text-[10px] font-medium mb-0.5 block text-muted-foreground">Notes</label>
              <Textarea
                value={form.rx_notes}
                onChange={set("rx_notes")}
                className="text-xs min-h-[50px]"
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            className="h-7 text-xs bg-primary text-primary-foreground"
            onClick={handleSave}
            disabled={upsertMutation.isPending}
          >
            Save Rx
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RxDetailsDialog;
