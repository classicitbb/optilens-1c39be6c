import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type EyeInput = {
  sph: number;
  cyl: number;
  axis: number;
  pd: number;
};

type ShapePreset = {
  id: string;
  label: string;
  width: number;
  height: number;
};

const SHAPE_PRESETS: ShapePreset[] = [
  { id: "shape-1", label: "Classic Oval", width: 48, height: 40 },
  { id: "shape-2", label: "Round", width: 46, height: 46 },
  { id: "shape-3", label: "Rectangle", width: 54, height: 36 },
  { id: "shape-4", label: "Cat-eye", width: 56, height: 38 },
  { id: "shape-5", label: "Large Fashion", width: 60, height: 44 },
  { id: "shape-6", label: "Compact", width: 44, height: 34 },
];

const MATERIALS = [
  { index: 1.5, label: "1.50 Standard" },
  { index: 1.6, label: "1.60 Mid Index" },
  { index: 1.67, label: "1.67 High Index" },
  { index: 1.74, label: "1.74 Ultra High" },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const computeThickness = ({
  sphere,
  cyl,
  index,
  diameter,
  etOrCt,
}: {
  sphere: number;
  cyl: number;
  index: number;
  diameter: number;
  etOrCt: number;
}) => {
  const effectivePower = sphere + cyl / 2;
  const lensHalf = diameter / 2;

  if (Math.abs(effectivePower) < 0.01) {
    return etOrCt;
  }

  const radiusMm = ((index - 1) / Math.abs(effectivePower)) * 1000;
  const sagMm = radiusMm - Math.sqrt(Math.max(radiusMm * radiusMm - lensHalf * lensHalf, 0));
  return Number((etOrCt + sagMm).toFixed(2));
};

const NumberField = ({
  id,
  label,
  value,
  step,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
}) => (
  <div>
    <Label htmlFor={id}>{label}</Label>
    <Input
      id={id}
      type="number"
      step={step}
      value={Number.isFinite(value) ? value : ""}
      onChange={(event) => {
        const parsed = Number.parseFloat(event.target.value);
        onChange(Number.isFinite(parsed) ? parsed : 0);
      }}
    />
  </div>
);

const OptiEdgeThicknessWidget = () => {
  const [right, setRight] = useState<EyeInput>({ sph: -2.5, cyl: -0.75, axis: 90, pd: 31 });
  const [left, setLeft] = useState<EyeInput>({ sph: -2.0, cyl: -1.0, axis: 85, pd: 31 });
  const [dbl, setDbl] = useState(18);
  const [ctEt, setCtEt] = useState(1.1);
  const [presetId, setPresetId] = useState(SHAPE_PRESETS[0].id);

  const preset = useMemo(() => SHAPE_PRESETS.find((shape) => shape.id === presetId) ?? SHAPE_PRESETS[0], [presetId]);
  const framePd = useMemo(() => preset.width + dbl, [preset.width, dbl]);

  const opticDiameterForEye = (monoPd: number) => {
    const decentration = Math.abs(framePd / 2 - monoPd);
    return clamp(preset.width + 2 * decentration + 2, 40, 80);
  };

  const results = useMemo(() => {
    const rightDiameter = opticDiameterForEye(right.pd);
    const leftDiameter = opticDiameterForEye(left.pd);

    return MATERIALS.map((material) => ({
      material,
      rightThickness: computeThickness({
        sphere: right.sph,
        cyl: right.cyl,
        index: material.index,
        diameter: rightDiameter,
        etOrCt: ctEt,
      }),
      leftThickness: computeThickness({
        sphere: left.sph,
        cyl: left.cyl,
        index: material.index,
        diameter: leftDiameter,
        etOrCt: ctEt,
      }),
    }));
  }, [right, left, ctEt, framePd, preset.width]);

  const baseline = results[0];

  return (
    <section className="space-y-6" id="optiedge-widget">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground">Interactive Thickness Estimator</h2>
        <p className="mx-auto mt-2 max-w-3xl text-muted-foreground">
          Enter binocular Rx and frame details to estimate finished thickness and compare how much thinner higher-index
          lenses can be in your selected shape.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rx and Frame Inputs</CardTitle>
          <CardDescription>Monocular PD in millimeters. Inputs are clamped to realistic lab-safe ranges.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Right Eye</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumberField id="right-sph" label="SPH" value={right.sph} step={0.25} onChange={(value) => setRight((prev) => ({ ...prev, sph: clamp(value, -20, 20) }))} />
              <NumberField id="right-cyl" label="CYL" value={right.cyl} step={0.25} onChange={(value) => setRight((prev) => ({ ...prev, cyl: clamp(value, -8, 8) }))} />
              <NumberField id="right-axis" label="AXIS" value={right.axis} step={1} onChange={(value) => setRight((prev) => ({ ...prev, axis: clamp(value, 0, 180) }))} />
              <NumberField id="right-pd" label="PD" value={right.pd} step={0.5} onChange={(value) => setRight((prev) => ({ ...prev, pd: clamp(value, 22, 40) }))} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Left Eye</h3>
            <div className="grid grid-cols-2 gap-3">
              <NumberField id="left-sph" label="SPH" value={left.sph} step={0.25} onChange={(value) => setLeft((prev) => ({ ...prev, sph: clamp(value, -20, 20) }))} />
              <NumberField id="left-cyl" label="CYL" value={left.cyl} step={0.25} onChange={(value) => setLeft((prev) => ({ ...prev, cyl: clamp(value, -8, 8) }))} />
              <NumberField id="left-axis" label="AXIS" value={left.axis} step={1} onChange={(value) => setLeft((prev) => ({ ...prev, axis: clamp(value, 0, 180) }))} />
              <NumberField id="left-pd" label="PD" value={left.pd} step={0.5} onChange={(value) => setLeft((prev) => ({ ...prev, pd: clamp(value, 22, 40) }))} />
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <Separator />
            <h3 className="font-semibold text-foreground">Frame Parameters</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <NumberField id="frame-dbl" label="DBL" value={dbl} step={1} onChange={(value) => setDbl(clamp(value, 10, 26))} />
              <NumberField id="frame-etct" label="ET / CT" value={ctEt} step={0.1} onChange={(value) => setCtEt(clamp(value, 0.8, 3.5))} />
              <div>
                <Label htmlFor="frame-pd">Frame PD (auto)</Label>
                <Input id="frame-pd" value={framePd.toFixed(1)} disabled />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {SHAPE_PRESETS.map((shape) => (
                <Button
                  key={shape.id}
                  type="button"
                  variant={shape.id === presetId ? "default" : "outline"}
                  onClick={() => setPresetId(shape.id)}
                  className="justify-between"
                >
                  <span>{shape.label}</span>
                  <span className="text-xs opacity-80">{shape.width}×{shape.height}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estimated Thickness Comparison</CardTitle>
          <CardDescription>Engineering estimate only — validate final values with your lab's surfacing software.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 text-left">Index</th>
                <th className="py-2 text-right">Right (mm)</th>
                <th className="py-2 text-right">Left (mm)</th>
                <th className="py-2 text-right">Right % Thinner</th>
                <th className="py-2 text-right">Left % Thinner</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => {
                const rightPct = baseline ? ((baseline.rightThickness - row.rightThickness) / baseline.rightThickness) * 100 : 0;
                const leftPct = baseline ? ((baseline.leftThickness - row.leftThickness) / baseline.leftThickness) * 100 : 0;

                return (
                  <tr key={row.material.index} className="border-b border-border">
                    <td className="py-2 font-medium text-foreground">{row.material.label}</td>
                    <td className="py-2 text-right text-muted-foreground">{row.rightThickness.toFixed(2)}</td>
                    <td className="py-2 text-right text-muted-foreground">{row.leftThickness.toFixed(2)}</td>
                    <td className="py-2 text-right text-muted-foreground">{rightPct.toFixed(1)}%</td>
                    <td className="py-2 text-right text-muted-foreground">{leftPct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
};

export default OptiEdgeThicknessWidget;
