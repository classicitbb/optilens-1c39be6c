import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RxNumberInput, RxPowerInput } from "@/components/lenses/RxInputs";

type EyeInput = {
  sph: number;
  cyl: number;
  axis: number;
  pd: number;
};

type PdMode = "mono" | "binocular";

// Lab-safe input ranges.
const SPH_RANGE = { min: -20, max: 20 };
const CYL_RANGE = { min: -8, max: 8 };
const AXIS_RANGE = { min: 0, max: 180 };
const MONO_PD_RANGE = { min: 20, max: 40 };
const BINOCULAR_PD_RANGE = { min: 40, max: 85 };
const DBL_RANGE = { min: 10, max: 26 };
const CTET_RANGE = { min: 0.8, max: 3.5 };

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

const OptiEdgeThicknessWidget = () => {
  const [right, setRight] = useState<EyeInput>({ sph: -2.5, cyl: -0.75, axis: 90, pd: 31 });
  const [left, setLeft] = useState<EyeInput>({ sph: -2.0, cyl: -1.0, axis: 85, pd: 31 });
  const [pdMode, setPdMode] = useState<PdMode>("mono");
  const [binocularPd, setBinocularPd] = useState(62);
  const [dbl, setDbl] = useState(18);
  const [ctEt, setCtEt] = useState(1.1);
  const [presetId, setPresetId] = useState(SHAPE_PRESETS[0].id);

  const preset = useMemo(() => SHAPE_PRESETS.find((shape) => shape.id === presetId) ?? SHAPE_PRESETS[0], [presetId]);
  const framePd = useMemo(() => preset.width + dbl, [preset.width, dbl]);

  // Effective monocular PD used by the decentration calc. In binocular mode the
  // single binocular PD is split evenly across the two eyes.
  const rightMonoPd = pdMode === "binocular" ? binocularPd / 2 : right.pd;
  const leftMonoPd = pdMode === "binocular" ? binocularPd / 2 : left.pd;

  const opticDiameterForEye = (monoPd: number) => {
    const decentration = Math.abs(framePd / 2 - monoPd);
    return clamp(preset.width + 2 * decentration + 2, 40, 80);
  };

  const results = useMemo(() => {
    const rightDiameter = opticDiameterForEye(rightMonoPd);
    const leftDiameter = opticDiameterForEye(leftMonoPd);

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
  }, [right.sph, right.cyl, left.sph, left.cyl, rightMonoPd, leftMonoPd, ctEt, framePd, preset.width]);

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
            <div className="grid grid-cols-3 gap-3">
              <RxPowerInput id="right-sph" label="SPH" value={right.sph} {...SPH_RANGE} onChange={(value) => setRight((prev) => ({ ...prev, sph: value }))} />
              <RxPowerInput id="right-cyl" label="CYL" value={right.cyl} {...CYL_RANGE} onChange={(value) => setRight((prev) => ({ ...prev, cyl: value }))} />
              <RxNumberInput id="right-axis" label="AXIS" value={right.axis} integer wrapModulo={180} {...AXIS_RANGE} onChange={(value) => setRight((prev) => ({ ...prev, axis: value }))} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Left Eye</h3>
            <div className="grid grid-cols-3 gap-3">
              <RxPowerInput id="left-sph" label="SPH" value={left.sph} {...SPH_RANGE} onChange={(value) => setLeft((prev) => ({ ...prev, sph: value }))} />
              <RxPowerInput id="left-cyl" label="CYL" value={left.cyl} {...CYL_RANGE} onChange={(value) => setLeft((prev) => ({ ...prev, cyl: value }))} />
              <RxNumberInput id="left-axis" label="AXIS" value={left.axis} integer wrapModulo={180} {...AXIS_RANGE} onChange={(value) => setLeft((prev) => ({ ...prev, axis: value }))} />
            </div>
          </div>

          <div className="space-y-4 lg:col-span-2">
            <Separator />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-foreground">Pupillary Distance</h3>
              <div className="inline-flex rounded-md border border-border p-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant={pdMode === "mono" ? "default" : "ghost"}
                  onClick={() => setPdMode("mono")}
                >
                  Monocular
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={pdMode === "binocular" ? "default" : "ghost"}
                  onClick={() => setPdMode("binocular")}
                >
                  Binocular
                </Button>
              </div>
            </div>
            {pdMode === "mono" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <RxNumberInput id="right-pd" label="Right PD (mm)" value={right.pd} step={0.5} decimals={1} {...MONO_PD_RANGE} onChange={(value) => setRight((prev) => ({ ...prev, pd: value }))} />
                <RxNumberInput id="left-pd" label="Left PD (mm)" value={left.pd} step={0.5} decimals={1} {...MONO_PD_RANGE} onChange={(value) => setLeft((prev) => ({ ...prev, pd: value }))} />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <RxNumberInput id="binocular-pd" label="Binocular PD (mm)" value={binocularPd} step={0.5} decimals={1} {...BINOCULAR_PD_RANGE} onChange={(value) => setBinocularPd(value)} />
                <div>
                  <Label htmlFor="binocular-pd-split">Per eye (auto)</Label>
                  <Input id="binocular-pd-split" value={(binocularPd / 2).toFixed(1)} disabled />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-2">
            <Separator />
            <h3 className="font-semibold text-foreground">Frame Parameters</h3>
            <div className="grid gap-3 md:grid-cols-3">
              <RxNumberInput id="frame-dbl" label="DBL" value={dbl} integer {...DBL_RANGE} onChange={(value) => setDbl(value)} />
              <RxNumberInput id="frame-etct" label="ET / CT" value={ctEt} step={0.1} decimals={1} {...CTET_RANGE} onChange={(value) => setCtEt(value)} />
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
