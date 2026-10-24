// Read-only summary of a saved Rx (cv.rxorder/1 or /2 payload, or a Lens Assistant draft): the
// prescription table, lens and coatings, frame and shape, notes, review flags and price lines.
// Shared by the Saved Drafts preview, the Rx order detail page and the Lens Assistant draft page.
// What to show is worked out in rxSummaryModel.ts; this file only lays it out.
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STD_SHAPES } from "../domain/standardShapes";
import { buildRxSummary, EYE_NAME, type EyeKey } from "./rxSummaryModel";

const toSentenceCase = (value: string) => {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed.replace(/[A-Za-z][A-Za-z']*/g, (word) => (
    word.length <= 3 && word === word.toUpperCase()
      ? word
      : `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
  )) : trimmed;
};

/** Quote lines are saved as "OD Super AR" / "OD · Plastic · Clear"; under an eye heading the prefix is noise. */
const stripEye = (value: string) => value.replace(/^(OD|OS)\b\s*[·-]?\s*/, "");

const money = (quote: any, n: unknown) =>
  [quote.symbol, Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })].filter(Boolean).join(" ");

/** Coating names for the ids a payload carries. Withdrawn coatings are not in the public list and read "Unavailable". */
const useCoatingNames = (ids: string[]) =>
  useQuery({
    queryKey: ["rx-coating-names"],
    enabled: ids.length > 0,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_addons_safe");
      if (error) throw error;
      return new Map<string, string>(((data ?? []) as { id: string; name: string }[]).map((a) => [a.id, a.name]));
    },
  }).data;

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

const shapeLabel = (shape: any): string => {
  if (!shape) return "No shape provided";
  if (shape.source === "standard") return `${STD_SHAPES.find((s) => s.id === shape.standardId)?.n ?? "Standard"} — standard shape`;
  return shape.file ? `Uploaded trace · ${shape.file}` : "Traced shape";
};

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="rounded-lg border bg-card p-4">
    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
    <div className="mt-2.5">{children}</div>
  </section>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div className="min-w-0">
    <dt className="text-[11px] text-muted-foreground">{label}</dt>
    <dd className="text-sm font-medium [overflow-wrap:anywhere]">{value}</dd>
  </div>
);

export const RxPayloadSummary = ({ payload, patientFallback }: { payload: any; patientFallback: string }) => {
  const m = buildRxSummary(payload, patientFallback);
  const coatingNames = useCoatingNames(m.treatmentIds);
  const shape = payload?.shape ?? null;
  const shapeOutline = shape ? buildShapeOutline(shape) : null;
  const quote = payload?.quote ?? null;
  const quoteLines: any[] = Array.isArray(quote?.lines) ? quote.lines : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight [overflow-wrap:anywhere]">{m.patient}</p>
          {m.reference || m.orderNo ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{[m.reference && `Your reference: ${m.reference}`, m.orderNo && `Order ${m.orderNo}`].filter(Boolean).join(" · ")}</p>
          ) : null}
        </div>
        {m.facts.length ? <div className="flex flex-wrap gap-1.5">{m.facts.map((f) => <Badge key={f} variant="outline" className="font-normal">{f}</Badge>)}</div> : null}
      </div>

      {m.flags.length ? (
        <div role="note" className="flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Check before sending</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">{m.flags.map((f, i) => <li key={i}><span className="font-medium">{f.field}:</span> {f.reason}</li>)}</ul>
          </div>
        </div>
      ) : null}

      <Section title="Prescription">
        {m.rows.length ? (
          <div className="-mx-1 overflow-x-auto px-1">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="sticky left-0 bg-card py-1.5 pr-3 text-left font-medium"><span className="sr-only">Eye</span></th>
                  {m.columns.map((c) => <th key={c} scope="col" className="px-2 py-1.5 text-center font-medium sm:px-3">{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {m.rows.map((row) => (
                  <tr key={row.eye} className="border-t">
                    <th scope="row" className="sticky left-0 bg-card py-2.5 pr-3 text-left font-normal">
                      <span className="block text-sm font-semibold leading-none">{EYE_NAME[row.eye].code}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{EYE_NAME[row.eye].side}</span>
                    </th>
                    {row.cells.map((cell, i) => <td key={i} className={`whitespace-nowrap px-2 py-2.5 text-center tabular-nums sm:px-3 ${cell === "—" ? "text-muted-foreground" : "font-medium"}`}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-muted-foreground">No prescription entered yet.</p>}
      </Section>

      {m.kind === "order" ? (
        <Section title="Lens & coatings">
          <div className="space-y-4">
            {m.lenses.length ? m.lenses.map((l, i) => (
              <div key={i}>
                {l.heading ? <p className="mb-1.5 text-xs font-semibold">{l.heading}</p> : null}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">{l.fields.map((f) => <Field key={f.label} {...f} />)}</dl>
              </div>
            )) : <p className="text-sm text-muted-foreground">No lens selected yet.</p>}
            {m.lensExtras.length ? <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3">{m.lensExtras.map((f) => <Field key={f.label} {...f} />)}</dl> : null}
            <div>
              <p className="text-[11px] text-muted-foreground">Coatings &amp; treatments</p>
              {m.treatmentIds.length === 0 ? <p className="text-sm font-medium">None selected</p> : coatingNames ? (
                <ul className="mt-1 flex flex-wrap gap-1.5">{m.treatmentIds.map((id) => coatingNames.has(id)
                  ? <li key={id}><Badge variant="secondary" className="font-normal">{coatingNames.get(id)}</Badge></li>
                  : <li key={id}><Badge variant="outline" className="font-normal text-muted-foreground">Coating no longer listed</Badge></li>)}</ul>
              ) : <p className="text-sm font-medium">{m.treatmentIds.length} selected</p>}
            </div>
            {m.tint ? <dl><Field label="Tint" value={m.tint} /></dl> : null}
            {m.clips.length ? <div><p className="text-[11px] text-muted-foreground">Chemistrie clips (lab instructions)</p><ul className="mt-0.5 space-y-0.5 text-sm font-medium">{m.clips.map((c) => <li key={c}>{c}</li>)}</ul></div> : null}
          </div>
        </Section>
      ) : (
        <p className="text-xs text-muted-foreground">Lens and coatings are chosen when you open this in the Rx order form.</p>
      )}

      <Section title="Frame & shape">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
          {shapeOutline ? (
            <svg viewBox={shapeOutline.viewBox} className="h-20 w-24 shrink-0 rounded border bg-muted/30 text-foreground/70" role="img" aria-label={shapeLabel(shape)}>
              <path d={shapeOutline.path} fill="currentColor" fillOpacity={0.08} stroke="currentColor" strokeWidth={shapeOutline.strokeWidth} strokeLinejoin="round" />
            </svg>
          ) : null}
          <div className="min-w-[10rem] flex-1 space-y-3">
            <div>
              <p className="text-sm font-medium">{m.frameName || "Frame not entered"}</p>
              {m.frameDetail ? <p className="text-xs text-muted-foreground">{m.frameDetail}</p> : null}
            </div>
            {m.kind === "order" ? (
              <div>
                <p className="text-sm font-medium">{shapeLabel(shape)}</p>
                {shape ? <p className="text-xs text-muted-foreground">{shape.confirmed ? "Confirmed by the dispenser" : "Not yet confirmed"}</p> : null}
              </div>
            ) : null}
            <div>
              <p className="text-[11px] text-muted-foreground">Measurements (mm)</p>
              <dl className="mt-1 flex flex-wrap gap-2">
                {m.measurements.map((x) => (
                  <div key={x.label} className="min-w-[3.5rem] rounded-md border bg-muted/20 px-2.5 py-1 text-center">
                    <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{x.label}</dt>
                    <dd className={`text-sm tabular-nums ${x.value === "—" ? "text-muted-foreground" : "font-semibold"}`}>{x.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
      </Section>

      {m.notes ? <Section title="Order notes"><p className="whitespace-pre-wrap text-sm">{m.notes}</p></Section> : null}

      {quote ? (
        <Section title="Order total">
          {quote.hidden ? (
            <p className="text-sm font-medium">Pricing not shown on this account</p>
          ) : (
            <>
              <div className="space-y-3">
                {(["od", "os"] as EyeKey[]).map((eye) => {
                  const eyeLines = quoteLines.filter((line) => line.eye === eye);
                  if (!eyeLines.length) return null;
                  return (
                    <div key={eye} className="space-y-1.5 rounded-md border border-border/60 bg-muted/20 p-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{EYE_NAME[eye].side} lens ({EYE_NAME[eye].code})</p>
                      {eyeLines.map((line, index) => <QuoteLine key={`${eye}-${index}`} quote={quote} line={line} stripEyePrefix />)}
                    </div>
                  );
                })}
                {quoteLines.filter((line) => !line.eye).map((line, index) => <QuoteLine key={index} quote={quote} line={line} />)}
              </div>
              <div className="mt-3 flex justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{money(quote, quote.total)}</span>
              </div>
            </>
          )}
        </Section>
      ) : null}
    </div>
  );
};

const QuoteLine = ({ quote, line, stripEyePrefix }: { quote: any; line: any; stripEyePrefix?: boolean }) => {
  const clean = (s: unknown) => toSentenceCase(stripEyePrefix ? stripEye(String(s ?? "")) : String(s ?? ""));
  const detail = clean(line.detail);
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span><span className="font-medium">{clean(line.label)}</span>{detail ? <span className="text-xs text-muted-foreground"> · {detail}</span> : null}</span>
      <span className="shrink-0 font-medium tabular-nums">{money(quote, line.amount)}</span>
    </div>
  );
};
