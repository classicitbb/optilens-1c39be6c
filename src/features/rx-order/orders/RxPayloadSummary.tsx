// Read-only summary of a saved Rx order payload (cv.rxorder/1): patient, lens, Rx table, frame,
// shape, notes and price lines. Shared by the Saved Drafts preview and the Rx order detail page.

const EYE_LABEL: Record<string, string> = { od: "Right (OD)", os: "Left (OS)" };

const toSentenceCase = (value: string) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.replace(/[A-Za-z][A-Za-z']*/g, (word) => (
    word.length <= 3 && word === word.toUpperCase()
      ? word
      : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
  )) : trimmed;
};

/** Polar radii (+ optional angles) for the right lens → a scaled, centred SVG outline. Mirrors the
 * radiiToXY/scaleOutline maths in rx-order-engine.js, simplified to a single static preview. */
const buildShapeOutline = (shape: any) => {
  const radii: number[] = Array.isArray(shape?.radii?.R) ? shape.radii.R : [];
  if (!radii.length) return null;
  const angles: number[] | undefined = Array.isArray(shape?.angles?.R) ? shape.angles.R : undefined;
  const n = radii.length;
  const points = radii.map((r: number, i: number) => {
    const deg = angles && angles.length === n ? angles[i] : (i * 360) / n;
    const t = (deg * Math.PI) / 180;
    return { x: r * Math.cos(t), y: r * Math.sin(t) };
  });

  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const targetA = Number(shape?.nativeBox?.a) || w;
  const targetB = Number(shape?.nativeBox?.b) || h;
  const sx = targetA / w;
  const sy = targetB / h;

  const path = points
    .map((p, i) => `${i ? "L" : "M"}${((p.x - cx) * sx).toFixed(2)},${(-(p.y - cy) * sy).toFixed(2)}`)
    .join(" ") + " Z";
  const pad = Math.max(targetA, targetB) * 0.12;
  const viewW = targetA + pad * 2;
  const viewH = targetB + pad * 2;

  return {
    path,
    viewBox: `${(-viewW / 2).toFixed(2)} ${(-viewH / 2).toFixed(2)} ${viewW.toFixed(2)} ${viewH.toFixed(2)}`,
    strokeWidth: Math.max(targetA * 0.025, 0.6),
  };
};

export const RxPayloadSummary = ({ payload, patientFallback }: { payload: any; patientFallback: string }) => {
  const patient = [payload.patient?.first, payload.patient?.last].filter(Boolean).join(" ");
  const frame = payload.frame ?? {};
  const shape = payload.shape ?? null;
  const rx = payload.rx ?? {};
  const rxEyes = ["od", "os"].filter((eye) => rx[eye]);
  const quote = payload.quote ?? null;
  const shapeOutline = shape ? buildShapeOutline(shape) : null;

  return (
    <div className="space-y-5">
      <dl className="grid gap-3 rounded-lg border bg-muted/15 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Patient</dt><dd className="font-medium">{patient || patientFallback}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Lens</dt><dd className="font-medium">{[payload.lens?.material, payload.lens?.design, payload.lens?.colour].filter(Boolean).join(" · ") || "Not selected"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Treatments</dt><dd className="font-medium">{Array.isArray(payload.treatments) ? `${payload.treatments.length} selected` : "None selected"}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Order</dt><dd className="font-medium">{payload.job?.scope || "Rx draft"}</dd></div>
      </dl>

      {rxEyes.length ? (
        <div className="rounded-lg border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prescription</p>
          <div className="mt-1 overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead className="text-muted-foreground"><tr><th className="py-1 text-left font-medium">Eye</th><th className="py-1 text-left font-medium">SPH</th><th className="py-1 text-left font-medium">CYL</th><th className="py-1 text-left font-medium">AXIS</th><th className="py-1 text-left font-medium">ADD</th><th className="py-1 text-left font-medium">PRISM</th><th className="py-1 text-left font-medium">PD</th><th className="py-1 text-left font-medium">NPD</th><th className="py-1 text-left font-medium">HT</th></tr></thead>
              <tbody>
                {rxEyes.map((eye) => { const row = rx[eye] ?? {}; return (
                  <tr key={eye} className="border-t"><td className="py-1 font-medium">{EYE_LABEL[eye] ?? eye}</td><td className="py-1">{row.sph ?? "—"}</td><td className="py-1">{row.cyl ?? "—"}</td><td className="py-1">{row.axis ?? "—"}</td><td className="py-1">{row.add ?? "—"}</td><td className="py-1">{row.prism ? `${row.prism} ${row.base ?? ""}`.trim() : "—"}</td><td className="py-1">{row.pd ?? "—"}</td><td className="py-1">{row.npd ?? "—"}</td><td className="py-1">{row.ht ?? "—"}</td></tr>
                ); })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 rounded-lg border bg-background/60 p-4 text-sm sm:grid-cols-2">
        <div className="rounded-lg border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Frame</p>
          <p className="font-medium">{frame.name || "Not entered"}</p>
          <p className="text-xs text-muted-foreground">{[frame.mount, frame.source].filter(Boolean).join(" · ") || "No mount or source recorded"}</p>
        </div>
        <div className="flex items-start gap-3">
          {shapeOutline ? (
            <svg viewBox={shapeOutline.viewBox} className="h-16 w-16 shrink-0 rounded border bg-muted/30 text-foreground/70">
              <path d={shapeOutline.path} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeWidth={shapeOutline.strokeWidth} strokeLinejoin="round" />
            </svg>
          ) : null}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shape</p>
            <p className="font-medium">{shape ? (shape.source === "standard" ? `Standard shape${shape.standardId ? ` · ${shape.standardId}` : ""}` : shape.file ? `Uploaded trace · ${shape.file}` : "Traced shape") : "No shape provided"}</p>
            {shape ? <p className="text-xs text-muted-foreground">{shape.confirmed ? "Confirmed by optician" : "Not yet confirmed"}</p> : null}
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Measurements (mm)</p>
        <dl className="mt-1 grid grid-cols-3 gap-3 text-sm sm:grid-cols-5">
          <div><dt className="text-xs text-muted-foreground">A</dt><dd className="font-medium">{frame.a ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">B</dt><dd className="font-medium">{frame.b ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">ED</dt><dd className="font-medium">{frame.ed ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">DBL</dt><dd className="font-medium">{frame.dbl ?? "—"}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Temple</dt><dd className="font-medium">{frame.temple ?? "—"}</dd></div>
        </dl>
      </div>

      {payload.delivery?.notes ? (
        <div className="rounded-lg border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order notes</p>
          <p className="mt-1 whitespace-pre-wrap text-sm">{payload.delivery.notes}</p>
        </div>
      ) : null}

      {quote ? (
        <div className="rounded-lg border bg-background/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order total</p>
          {quote.hidden ? (
            <p className="mt-1 font-medium">Pricing not shown on this account</p>
          ) : (
            <>
              <div className="mt-2 space-y-3">
                {(["od", "os"] as const).map((eye) => {
                  const eyeLines = (Array.isArray(quote.lines) ? quote.lines : []).filter((line: any) => line.eye === eye);
                  if (!eyeLines.length) return null;
                  return <div key={eye} className="space-y-1.5 rounded-md border border-border/60 bg-muted/20 p-2.5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eye === "od" ? "Right lens (OD)" : "Left lens (OS)"}</p>{eyeLines.map((line: any, index: number) => (
                    <div key={`${eye}-${index}`} className="flex items-baseline justify-between gap-4 text-sm">
                      <span><span className="font-medium">{toSentenceCase(line.label)}</span>{line.detail ? <span className="text-xs text-muted-foreground"> · {toSentenceCase(line.detail)}</span> : null}</span>
                      <span className="shrink-0 font-medium">{quote.symbol ?? ""} {Number(line.amount ?? 0).toFixed(2)}</span>
                    </div>
                  ))}</div>;
                })}
                {(Array.isArray(quote.lines) ? quote.lines : []).filter((line: any) => !line.eye).map((line: any, index: number) => (
                  <div key={index} className="flex items-baseline justify-between gap-4 text-sm">
                    <span>
                      <span className="font-medium">{toSentenceCase(line.label)}</span>
                      {line.detail ? <span className="text-xs text-muted-foreground"> · {toSentenceCase(line.detail)}</span> : null}
                    </span>
                    <span className="shrink-0 font-medium">{quote.symbol ?? ""} {Number(line.amount ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>{quote.symbol ?? ""} {Number(quote.total ?? 0).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

