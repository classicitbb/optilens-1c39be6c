import { useState, useEffect } from "react";
import { useRxDetails } from "@/hooks/useQuotes";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface RxDetailsDialogProps {
  lineId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RxDetailsDialog = ({ lineId, open, onOpenChange }: RxDetailsDialogProps) => {
  const { data: rx, upsertMutation } = useRxDetails(lineId);
  const { toast } = useToast();

  const [form, setForm] = useState({
    od_sph: "", od_cyl: "", od_axis: "", od_add: "",
    os_sph: "", os_cyl: "", os_axis: "", os_add: "",
    pd: "", seg_height: "", fitting_height: "", rx_notes: "",
  });

  const [hasAxisWarning, setHasAxisWarning] = useState(false);

  useEffect(() => {
    if (rx) {
      setForm({
        od_sph: rx.od_sph?.toString() ?? "",
        od_cyl: rx.od_cyl?.toString() ?? "",
        od_axis: rx.od_axis?.toString() ?? "",
        od_add: rx.od_add?.toString() ?? "",
        os_sph: rx.os_sph?.toString() ?? "",
        os_cyl: rx.os_cyl?.toString() ?? "",
        os_axis: rx.os_axis?.toString() ?? "",
        os_add: rx.os_add?.toString() ?? "",
        pd: rx.pd ?? "",
        seg_height: rx.seg_height ?? "",
        fitting_height: rx.fitting_height ?? "",
        rx_notes: rx.rx_notes ?? "",
      });
    }
  }, [rx]);

  // Axis warning: if cyl entered without axis
  useEffect(() => {
    const odCylSet = form.od_cyl && parseFloat(form.od_cyl) !== 0;
    const odAxisMissing = !form.od_axis;
    const osCylSet = form.os_cyl && parseFloat(form.os_cyl) !== 0;
    const osAxisMissing = !form.os_axis;
    setHasAxisWarning((odCylSet && odAxisMissing) || (osCylSet && osAxisMissing));
  }, [form.od_cyl, form.od_axis, form.os_cyl, form.os_axis]);

  const handleSave = () => {
    const toNum = (v: string) => v ? parseFloat(v) : null;
    upsertMutation.mutate({
      quote_line_id: lineId,
      od_sph: toNum(form.od_sph), od_cyl: toNum(form.od_cyl),
      od_axis: toNum(form.od_axis), od_add: toNum(form.od_add),
      os_sph: toNum(form.os_sph), os_cyl: toNum(form.os_cyl),
      os_axis: toNum(form.os_axis), os_add: toNum(form.os_add),
      pd: form.pd || null, seg_height: form.seg_height || null,
      fitting_height: form.fitting_height || null, rx_notes: form.rx_notes || null,
    }, {
      onSuccess: () => { toast({ title: "Rx details saved" }); onOpenChange(false); },
      onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  const fieldClass = "h-7 text-xs text-center";
  const labelClass = "text-[10px] font-medium text-center block mb-0.5";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Rx Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* OD Row */}
          <div>
            <div className="text-[11px] font-semibold mb-1" style={{ color: "hsl(215 30% 15%)" }}>OD (Right)</div>
            <div className="grid grid-cols-4 gap-2">
              <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>SPH</label>
                <Input value={form.od_sph} onChange={(e) => setForm(p => ({ ...p, od_sph: e.target.value }))} className={fieldClass} /></div>
              <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>CYL</label>
                <Input value={form.od_cyl} onChange={(e) => setForm(p => ({ ...p, od_cyl: e.target.value }))} className={fieldClass} /></div>
              <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>AXIS</label>
                <Input value={form.od_axis} onChange={(e) => setForm(p => ({ ...p, od_axis: e.target.value }))} className={fieldClass} /></div>
              <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>ADD</label>
                <Input value={form.od_add} onChange={(e) => setForm(p => ({ ...p, od_add: e.target.value }))} className={fieldClass} /></div>
            </div>
          </div>

          {/* OS Row */}
          <div>
            <div className="text-[11px] font-semibold mb-1" style={{ color: "hsl(215 30% 15%)" }}>OS (Left)</div>
            <div className="grid grid-cols-4 gap-2">
              <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>SPH</label>
                <Input value={form.os_sph} onChange={(e) => setForm(p => ({ ...p, os_sph: e.target.value }))} className={fieldClass} /></div>
              <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>CYL</label>
                <Input value={form.os_cyl} onChange={(e) => setForm(p => ({ ...p, os_cyl: e.target.value }))} className={fieldClass} /></div>
              <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>AXIS</label>
                <Input value={form.os_axis} onChange={(e) => setForm(p => ({ ...p, os_axis: e.target.value }))} className={fieldClass} /></div>
              <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>ADD</label>
                <Input value={form.os_add} onChange={(e) => setForm(p => ({ ...p, os_add: e.target.value }))} className={fieldClass} /></div>
            </div>
          </div>

          {hasAxisWarning && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px]" style={{ background: "hsl(35 80% 50% / 0.12)", color: "hsl(35 80% 40%)" }}>
              ⚠ Cyl entered without Axis
            </div>
          )}

          {/* Extra fields */}
          <div className="grid grid-cols-3 gap-2">
            <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>PD</label>
              <Input value={form.pd} onChange={(e) => setForm(p => ({ ...p, pd: e.target.value }))} className={fieldClass} /></div>
            <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>Seg Ht</label>
              <Input value={form.seg_height} onChange={(e) => setForm(p => ({ ...p, seg_height: e.target.value }))} className={fieldClass} /></div>
            <div><label className={labelClass} style={{ color: "hsl(215 15% 45%)" }}>Fit Ht</label>
              <Input value={form.fitting_height} onChange={(e) => setForm(p => ({ ...p, fitting_height: e.target.value }))} className={fieldClass} /></div>
          </div>

          <div>
            <label className="text-[10px] font-medium mb-0.5 block" style={{ color: "hsl(215 15% 45%)" }}>Notes</label>
            <Textarea
              value={form.rx_notes}
              onChange={(e) => setForm(p => ({ ...p, rx_notes: e.target.value }))}
              className="text-xs min-h-[50px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            style={{ background: "hsl(215 65% 50%)", color: "white" }}
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
