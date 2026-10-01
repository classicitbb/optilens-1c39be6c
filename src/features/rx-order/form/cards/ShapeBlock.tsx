// The frame shape: standard-shape tiles, the trace drop zone, and the
// verification panel with the live outline. Drawing is plain SVG from the pure
// geometry in domain/shape.ts (no innerHTML).
import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { outlinePath, radiiToXY, scaleOutline, TRACE_FILE, type ShapeData, type ShapeGeometry } from "../../domain/shape";
import { STD_SHAPES } from "../../domain/standardShapes";
import { standardShape } from "../../domain/standardLibrary";
import { Callout } from "../ui";
import type { CardProps } from "./types";

/** A small outline, drawn at a fixed box regardless of the frame's real size. */
export function ShapeThumb({ data, size = 46, label }: { data: ShapeData | null; size?: number; label?: string }) {
  if (!data) {
    return (
      <svg width={size} height={size * 0.7} viewBox="0 0 100 70" role="img" aria-label={label ?? "Shape not loaded"}>
        <rect x="6" y="10" width="88" height="50" rx="14" fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" strokeDasharray="5 5" />
      </svg>
    );
  }
  const pts = scaleOutline(radiiToXY(data.points.R, data.angles.R), 92, 62);
  return (
    <svg width={size} height={size * 0.7} viewBox="-50 -35 100 70" role="img" aria-label={label ?? "Frame shape"} className="text-foreground">
      <path d={outlinePath(pts)} fill="currentColor" fillOpacity=".06" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

const DIM = "hsl(188 62% 32%)";

/** Both lenses at the typed A × B, dispenser's view (right lens on the left), with dimensions. */
export function OutlinePreview({ geometry }: { geometry: ShapeGeometry }) {
  const { a, b, dbl, ptsR, ptsL, mirrorL, ghost } = geometry;
  const shift = a / 2 + dbl / 2;
  const padX = 16, padTop = 20, padBot = 9;
  const totalW = a * 2 + dbl + padX * 2;
  const totalH = b + padTop + padBot;
  const minX = -totalW / 2, minY = -b / 2 - padTop;
  const half = b / 2;
  // all type is sized in user units (mm), never CSS px
  const fs = Math.max(2.3, a * 0.058);
  const fsL = Math.max(3.2, a * 0.085);
  const tick = fs * 0.8;
  const yA = -half - fs * 1.5;
  const sw = (k: number) => (a * k).toFixed(2);
  const eye = (path: string, x: number, key: string) => (
    <g key={key} transform={`translate(${x.toFixed(2)}, 0)`}>
      <path d={path} fill="hsl(213 66% 13% / .04)" stroke="currentColor" strokeWidth={sw(0.022)} strokeLinejoin="round" />
      <line x1={-fs} y1={0} x2={fs} y2={0} stroke="currentColor" strokeOpacity=".4" strokeWidth={sw(0.012)} />
      <line x1={0} y1={-fs} x2={0} y2={fs} stroke="currentColor" strokeOpacity=".4" strokeWidth={sw(0.012)} />
      <line x1={-a / 2} y1={yA} x2={a / 2} y2={yA} stroke={DIM} strokeOpacity=".55" strokeWidth={sw(0.008)} />
      <line x1={-a / 2} y1={yA - tick / 2} x2={-a / 2} y2={yA + tick / 2} stroke={DIM} strokeOpacity=".55" strokeWidth={sw(0.008)} />
      <line x1={a / 2} y1={yA - tick / 2} x2={a / 2} y2={yA + tick / 2} stroke={DIM} strokeOpacity=".55" strokeWidth={sw(0.008)} />
      <text x={0} y={yA - fs * 0.6} textAnchor="middle" fill={DIM} fontSize={fs} fontWeight={600}>A {a.toFixed(2)}</text>
    </g>
  );
  return (
    <svg
      viewBox={`${minX.toFixed(2)} ${minY.toFixed(2)} ${totalW.toFixed(2)} ${totalH.toFixed(2)}`}
      preserveAspectRatio="xMidYMid meet" className="block w-full text-foreground" role="img"
      aria-label={`Frame shape, A ${a.toFixed(2)} by B ${b.toFixed(2)}`}
    >
      <defs>
        <pattern id="rx-shape-grid" width="5" height="5" patternUnits="userSpaceOnUse">
          <path d="M 5 0 L 0 0 0 5" fill="none" stroke="hsl(188 50% 80%)" strokeOpacity=".5" strokeWidth=".35" />
        </pattern>
      </defs>
      <rect x={minX} y={minY} width={totalW} height={totalH} fill="url(#rx-shape-grid)" />
      {eye(outlinePath(ptsR, false), -shift, "r")}
      {eye(outlinePath(ptsL, mirrorL), shift, "l")}
      <line x1={-dbl / 2} y1={yA} x2={dbl / 2} y2={yA} stroke={DIM} strokeOpacity=".55" strokeWidth={sw(0.008)} />
      <text x={0} y={yA - fs * 0.6} textAnchor="middle" fill={DIM} fontSize={fs} fontWeight={600}>DBL {dbl.toFixed(2)}</text>
      <text
        x={-shift - a / 2 - fs * 0.7} y={0} textAnchor="middle" fill={DIM} fontSize={fs} fontWeight={600}
        transform={`rotate(-90 ${(-shift - a / 2 - fs * 0.7).toFixed(2)} 0)`}
      >B {b.toFixed(2)}</text>
      <text x={minX + fsL * 0.5} y={minY + fsL * 1.05} fill="currentColor" fillOpacity=".6" fontSize={fsL} fontWeight={800}>R</text>
      <text x={minX + totalW - fsL * 0.5} y={minY + fsL * 1.05} textAnchor="end" fill="currentColor" fillOpacity=".6" fontSize={fsL} fontWeight={800}>L</text>
      {ghost && (
        <text x={0} y={half + padBot * 0.7} textAnchor="middle" fill={DIM} fillOpacity=".75" fontSize={fs * 0.85}>placeholder scale — enter A and B</text>
      )}
    </svg>
  );
}

/** The four standard shapes. */
export function StandardShapePicker({ api, notify }: Pick<CardProps, "api" | "notify">) {
  const { values } = api;
  const choose = (id: string) => {
    if (values.shape.source === "trace" && !window.confirm("Replace the uploaded trace with the standard shape?")) return;
    const note = api.pickStandardShape(id);
    notify(note ?? `${STD_SHAPES.find((s) => s.id === id)?.n} selected — resize it by typing A and B`);
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Standard shape">
        {STD_SHAPES.map((s) => {
          const on = values.shape.source === "standard" && values.shape.standardId === s.id;
          return (
            <button
              key={s.id} type="button" onClick={() => choose(s.id)} aria-pressed={on} title={s.file}
              className={cn("flex w-24 flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors hover:bg-muted/50", on && "border-primary bg-primary/5")}
            >
              <ShapeThumb data={standardShape(s.id)} label={s.n} />
              <span className="font-medium">{s.n}</span>
            </button>
          );
        })}
        {values.shape.source === "standard" && (
          <button type="button" onClick={() => { api.clearShape(); notify("Shape cleared"); }}
            className="flex w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed p-2 text-xs text-muted-foreground hover:bg-muted/50">
            <span className="text-lg opacity-60">✕</span>Clear
          </button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground">Real traced outlines. The preview and the ED rescale live to the A, B and DBL you type.</p>
    </div>
  );
}

/** Drop or choose the frame trace (.oma / .tr / .vca). */
export function TraceDrop({ api, notify }: Pick<CardProps, "api" | "notify">) {
  const { values } = api;
  const input = useRef<HTMLInputElement>(null);
  const [hot, setHot] = useState(false);

  const take = (file: File | undefined) => {
    if (!file) return;
    if (!TRACE_FILE.test(file.name)) { notify("Trace files only — .oma, .tr or .vca"); return; }
    const reader = new FileReader();
    reader.onload = () => notify(api.loadTrace(String(reader.result ?? ""), file.name, file.size));
    reader.readAsText(file);
  };

  if (values.shape.fileName) {
    const read = values.shape.source === "trace";
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/20 p-3 text-xs">
        <span className="rounded bg-foreground px-1.5 py-1 text-[10px] font-bold text-background">{values.shape.fileName.split(".").pop()?.toUpperCase()}</span>
        <div className="min-w-0">
          <b className="block truncate font-medium">{values.shape.fileName}</b>
          <span className="text-muted-foreground">
            {values.shape.fileSize != null ? `${(values.shape.fileSize / 1024).toFixed(1)} KB · ` : ""}{read ? "trace points parsed" : "trace attached"}
          </span>
        </div>
        <div className="ml-auto flex gap-1">
          <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => input.current?.click()}>Upload new</Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { api.removeTrace(); notify("Trace removed"); }}>Remove trace</Button>
        </div>
        <input ref={input} type="file" accept=".oma,.tr,.vca" className="hidden" aria-label="Frame trace file"
          onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setHot(true); }}
        onDragLeave={() => setHot(false)}
        onDrop={(e) => { e.preventDefault(); setHot(false); take(e.dataTransfer.files[0]); }}
        className={cn("flex w-full flex-col items-center gap-1 rounded-lg border-2 border-dashed p-6 text-center text-xs transition-colors hover:bg-muted/40", hot && "border-primary bg-primary/5")}
      >
        <Upload className="h-5 w-5 text-muted-foreground" />
        <b className="font-medium">Drop your trace file here, or click to browse</b>
        <span className="text-muted-foreground">.oma · .tr · .vca — exported from your tracer</span>
      </button>
      <input ref={input} type="file" accept=".oma,.tr,.vca" className="hidden" aria-label="Frame trace file"
        onChange={(e) => { take(e.target.files?.[0]); e.target.value = ""; }} />
    </div>
  );
}

/** The live outline, its measurements, and the "this is the right shape" confirmation. */
export function ShapePreview({ api, remote }: { api: CardProps["api"]; remote: boolean }) {
  const { values, derived } = api;
  const g = derived.frame.geometry;
  const [expanded, setExpanded] = useState(false);
  const sh = values.shape.data;

  // A file was attached but nothing could be read from it: say so rather than show nothing.
  if (remote && values.shape.fileName && !sh) {
    return (
      <Callout tone="warn">
        <b>{values.shape.fileName}</b> attached, but no trace points could be read from it. The lab can still work from the box measures —
        or re-export the trace and upload again.
      </Callout>
    );
  }
  // Verification is only meaningful when the lab cuts to a trace.
  if (!remote || !sh || !g) return null;
  const m = g.metrics;

  if (values.shape.confirmed && !expanded) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-50/50 p-3 text-xs dark:bg-emerald-950/20">
        <ShapeThumb data={sh} size={40} />
        <div className="min-w-0">
          <b className="block font-medium">✓ Shape verified{sh.job ? ` — ${sh.job}` : ""}</b>
          <span className="text-muted-foreground">A {g.a.toFixed(2)} · B {g.b.toFixed(2)} · ED {m.ed.toFixed(2)} · DBL {g.dbl.toFixed(2)} mm</span>
        </div>
        <Button type="button" variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={() => setExpanded(true)}>Change</Button>
      </div>
    );
  }
  const src = values.shape.source === "standard"
    ? `${STD_SHAPES.find((s) => s.id === values.shape.standardId)?.n} — standard shape`
    : `Traced file${sh.job ? ` · ${sh.job}` : ""}`;
  const stats: [string, string][] = [
    ["A width", `${g.a.toFixed(2)} mm`], ["B height", `${g.b.toFixed(2)} mm`], ["Effective dia", `${m.ed.toFixed(2)} mm`],
    ["ED axis", `${m.edAxis.toFixed(1)}°`], ["DBL gap", `${g.dbl.toFixed(2)} mm`], ["Circumference", `${m.circ.toFixed(1)} mm`],
  ];
  return (
    <div className="space-y-3 rounded-lg border p-3" aria-label="Shape verification">
      <div className="flex items-start gap-2 text-xs">
        <div className="min-w-0">
          <b className="block font-semibold">Shape verification{sh.job ? ` — ${sh.job}` : ""}</b>
          <span className="text-muted-foreground">{src}{sh.mirroredL ? " · one side supplied, other side mirrored" : " · both sides from the trace"}</span>
        </div>
        <span className="ml-auto rounded border px-2 py-0.5 text-[11px] text-muted-foreground">{sh.points.R.length} points</span>
      </div>
      {values.shape.source !== "standard" && <div className={cn("rounded-md border bg-card p-2", g.ghost && "opacity-80")}><OutlinePreview geometry={g} /></div>}
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-md bg-muted/40 px-2 py-1.5"><dt className="text-[11px] text-muted-foreground">{k}</dt><dd className="font-semibold tabular-nums">{v}</dd></div>
        ))}
      </dl>
      <button
        type="button" aria-pressed={values.shape.confirmed} disabled={!derived.frame.boxComplete}
        onClick={() => { api.setShapeConfirmed(!values.shape.confirmed); setExpanded(false); }}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-50",
          values.shape.confirmed && "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30",
        )}
      >
        <span className={cn("flex h-4 w-4 items-center justify-center rounded border", values.shape.confirmed && "border-emerald-600 bg-emerald-600 text-white")}>{values.shape.confirmed && "✓"}</span>
        This is the correct shape for the frame in hand
      </button>
      <p className="text-[11px] text-muted-foreground">
        {derived.frame.boxComplete
          ? "Right lens shown left, as you face the patient. ED is measured from the boxing centre of the outline at the current A and B, so it is the field's source of truth and can't be typed over. Confirm it to collapse this panel."
          : "Enter A, B, ED and DBL above before confirming — the shape is measured against that box, so confirming it first would verify the outline against numbers that aren't there yet."}
      </p>
    </div>
  );
}
