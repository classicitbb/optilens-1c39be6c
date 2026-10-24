// What the read-only Rx summary shows, worked out from a saved payload. Pure: no DOM, no network.
//
// Reads a cv.rxorder/1 payload (drafts, quotes — `rx.<eye>.ht`, `lens` + `lensOs` + `split`), a
// cv.rxorder/2 payload (`rx.<eye>.height`, `lens.od` / `lens.os`) and the older Lens Assistant draft
// (`right` / `left`, no lens or coatings yet), so one preview serves every kind of saved Rx.
import { clipParts, normaliseSavedClip, stripChemNotes } from "../domain/chemistrie";

const MINUS = "−";
const NONE = "—";

export type EyeKey = "od" | "os";
export const EYE_NAME: Record<EyeKey, { code: string; side: string }> = {
  od: { code: "OD", side: "Right" },
  os: { code: "OS", side: "Left" },
};

const SCOPE_LABELS: Record<string, string> = { uncut: "Uncut", remote: "Remote edge", glaze: "Full glaze" };
const PURPOSE_LABELS: Record<string, string> = { dist: "Distance", read: "Reading", inter: "Intermediate" };
const MOUNT_LABELS: Record<string, string> = { plastic: "Plastic", metal: "Metal", grooved: "Grooved / nylon", rimless: "Rimless — drill mount" };
const BIFOCAL = /bifocal|trifocal|flat.?top|executive|d.?seg|round seg/i;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};
const rec = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {});
const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** A signed power with a true minus and two decimals: −2.25, +1.50. Zero sphere reads "Plano". */
export const formatPower = (v: unknown, opts: { plano?: boolean } = {}): string => {
  const n = num(v);
  if (n === null) return NONE;
  if (n === 0) return opts.plano ? "Plano" : NONE;
  return `${n < 0 ? MINUS : "+"}${Math.abs(n).toFixed(2)}`;
};
export const formatMm = (v: unknown, dp = 1): string => {
  const n = num(v);
  return n === null ? NONE : n.toFixed(dp);
};

export interface SummaryRow { eye: EyeKey; cells: string[] }
export interface SummaryField { label: string; value: string }
export interface SummaryLens { heading: string | null; fields: SummaryField[] }
export interface SummaryFlag { field: string; reason: string }

export interface RxSummaryModel {
  /** "assistant" = a Lens Assistant recommendation: prescription and frame only, no lens or coatings yet. */
  kind: "order" | "assistant";
  patient: string;
  reference: string;
  orderNo: string;
  /** Short badges: job type, vision, eyes supplied, service. */
  facts: string[];
  columns: string[];
  rows: SummaryRow[];
  lenses: SummaryLens[];
  lensExtras: SummaryField[];
  treatmentIds: string[];
  tint: string;
  clips: string[];
  frameName: string;
  frameDetail: string;
  measurements: SummaryField[];
  notes: string;
  flags: SummaryFlag[];
}

const FLAG_FIELDS: Record<string, string> = {
  sph: "sphere", cyl: "cylinder", axis: "axis", add: "add", prism: "prism", base: "prism base", pd: "distance PD", npd: "near PD", ht: "height", height: "height",
};
const flagField = (path: string): string => {
  const m = /^rx\.(od|os)\.(\w+)$/.exec(path);
  return m ? `${EYE_NAME[m[1] as EyeKey].side} ${FLAG_FIELDS[m[2]] ?? m[2]}` : path;
};

const titleCase = (s: string) => s.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function eyeRows(payload: Record<string, any>, assistant: boolean) {
  const eyesJob = rec(payload.job).eyes;
  const out: { eye: EyeKey; sph: unknown; cyl: unknown; axis: unknown; add: unknown; prism: unknown; base: string; pd: unknown; npd: unknown; ht: unknown }[] = [];
  for (const eye of ["od", "os"] as const) {
    if (eyesJob === "od" && eye === "os") continue;
    if (eyesJob === "os" && eye === "od") continue;
    if (assistant) {
      const r = rec(payload[eye === "od" ? "right" : "left"]);
      if (!Object.keys(r).length) continue;
      out.push({ eye, sph: r.sphere, cyl: r.cylinder, axis: r.axis, add: r.add, prism: r.prism, base: text(r.prismBase).toUpperCase(), pd: null, npd: null, ht: null });
    } else {
      const r = rec(payload.rx)[eye];
      if (!r || typeof r !== "object") continue;
      out.push({ eye, sph: r.sph, cyl: r.cyl, axis: r.axis, add: r.add, prism: r.prism, base: text(r.base).toUpperCase(), pd: r.pd, npd: r.npd, ht: r.ht ?? r.height });
    }
  }
  return out;
}

function lensTriple(l: Record<string, any>): SummaryField[] {
  return [
    { label: "Material", value: text(l.material) || NONE },
    { label: "Design", value: text(l.design) || NONE },
    { label: "Colour", value: text(l.colour) || NONE },
  ];
}

export function buildRxSummary(payload: unknown, patientFallback = ""): RxSummaryModel {
  const p = rec(payload);
  const assistant = !p.rx && (p.right !== undefined || p.left !== undefined);
  const job = rec(p.job);
  const frame = rec(p.frame);
  const lens = rec(p.lens);
  const delivery = rec(p.delivery);
  const vision: "sv" | "mf" = job.vision === "mf" ? "mf" : "sv";

  // ── prescription ──
  const eyes = eyeRows(p, assistant);
  const any = (pick: (e: (typeof eyes)[number]) => unknown, test: (n: number) => boolean = (n) => n !== 0) => eyes.some((e) => { const n = num(pick(e)); return n !== null && test(n); });
  const design = text(lens.design) || text(rec(lens.od).design);
  const heightLabel = vision === "sv" ? "OC height" : BIFOCAL.test(design) ? "Segment height" : "Fitting height";
  const showAdd = (!assistant && vision === "mf") || any((e) => e.add);
  const showNear = any((e) => e.npd);
  const showPrism = any((e) => e.prism);
  const cols: { label: string; show: boolean; cell: (e: (typeof eyes)[number]) => string }[] = [
    { label: "Sphere", show: true, cell: (e) => formatPower(e.sph, { plano: true }) },
    { label: "Cylinder", show: true, cell: (e) => formatPower(e.cyl) },
    { label: "Axis", show: true, cell: (e) => { const a = num(e.axis); return a === null || !num(e.cyl) ? NONE : `${Math.round(a)}°`; } },
    { label: "Add", show: showAdd, cell: (e) => formatPower(e.add) },
    { label: "Distance PD", show: !assistant, cell: (e) => formatMm(e.pd) },
    { label: "Near PD", show: showNear, cell: (e) => formatMm(e.npd) },
    { label: heightLabel, show: !assistant, cell: (e) => formatMm(e.ht) },
    { label: "Prism", show: showPrism, cell: (e) => { const n = num(e.prism); return n ? `${n.toFixed(2)}Δ${e.base ? ` ${e.base}` : ""}` : NONE; } },
  ];
  const shown = cols.filter((c) => c.show);

  // ── lens ──
  const lenses: SummaryLens[] = [];
  const lensExtras: SummaryField[] = [];
  if (!assistant) {
    const v2 = p.lens && ("od" in lens || "os" in lens);
    const sides: { eye: EyeKey; l: Record<string, any> }[] = [];
    if (v2) {
      if (lens.od) sides.push({ eye: "od", l: rec(lens.od) });
      if (lens.os) sides.push({ eye: "os", l: rec(lens.os) });
    } else {
      sides.push({ eye: "od", l: lens });
      if (p.split && p.lensOs) sides.push({ eye: "os", l: rec(p.lensOs) });
    }
    const differ = sides.length === 2 && ["material", "design", "colour"].some((k) => text(sides[0].l[k]) !== text(sides[1].l[k]));
    if (differ) {
      sides.forEach(({ eye, l }) => lenses.push({ heading: `${EYE_NAME[eye].side} (${EYE_NAME[eye].code})`, fields: lensTriple(l) }));
    } else if (sides.length) {
      const one = job.eyes === "od" || job.eyes === "os" ? (job.eyes as EyeKey) : null;
      lenses.push({ heading: one ? `${EYE_NAME[one].side} lens only` : null, fields: lensTriple(sides[0].l) });
    }
    const adv = v2 ? rec(lens.advanced) : lens;
    const diameter = num(adv.diameter);
    if (diameter) lensExtras.push({ label: "Blank size", value: `${diameter} mm` });
    if (text(adv.corridor)) lensExtras.push({ label: "Corridor", value: text(adv.corridor) });
    if (text(adv.baseCurve)) lensExtras.push({ label: "Base curve", value: text(adv.baseCurve) });
  }

  // ── tint & clips ──
  const t = rec(p.tintConfig);
  let tint = "";
  if (t.treatment || t.colour) {
    const gradient = num(t.gradTop) || num(t.gradBottom);
    const strength = gradient ? `${num(t.gradTop) ?? 0}% → ${num(t.gradBottom) ?? 0}%` : num(t.density) ? `${num(t.density)}%` : "";
    tint = [text(t.colour), strength, text(t.finish), t.match ? "match to sample" : ""].filter(Boolean).join(" · ");
  }
  const clips = (Array.isArray(p.chemistrie) ? p.chemistrie : []).map((c: unknown, i: number) => `Clip ${i + 1}: ${clipParts(normaliseSavedClip(c)).join(" · ")}`);

  // ── frame ──
  const mount = MOUNT_LABELS[text(frame.mount)] ?? text(frame.mount);
  const measurements: SummaryField[] = assistant
    ? [{ label: "A", value: formatMm(p.frameA) }, { label: "B", value: formatMm(p.frameB) }, { label: "DBL", value: formatMm(p.frameDbl) }]
    : [
        { label: "A", value: formatMm(frame.a) }, { label: "B", value: formatMm(frame.b) },
        { label: "ED", value: num(frame.ed) === null ? NONE : String(+Number(frame.ed).toFixed(2)) }, { label: "DBL", value: formatMm(frame.dbl) },
        ...(num(frame.temple) ? [{ label: "Temple", value: formatMm(frame.temple, 0) }] : []),
      ];

  // ── facts ──
  const eyesJob = job.eyes === "od" ? "Right lens only" : job.eyes === "os" ? "Left lens only" : eyes.length ? "Pair" : "";
  const facts = assistant
    ? [text(p.frameType) && titleCase(p.frameType), text(p.primaryUse) && `${titleCase(p.primaryUse)} use`].filter(Boolean) as string[]
    : [
        SCOPE_LABELS[text(job.scope)],
        vision === "mf" ? "Multifocal / progressive" : ["Single vision", PURPOSE_LABELS[text(job.purpose)]].filter(Boolean).join(" · "),
        eyesJob,
        delivery.service === "pri" ? "Priority service" : delivery.service ? "Standard service" : "",
      ].filter(Boolean) as string[];

  const patient = assistant ? text(p.patientReference) : [text(rec(p.patient).first), text(rec(p.patient).last)].filter(Boolean).join(" ");
  const method = text(delivery.method);

  return {
    kind: assistant ? "assistant" : "order",
    patient: patient || patientFallback,
    reference: text(p.reference),
    orderNo: p.orderNo == null ? "" : String(p.orderNo).trim(),
    facts,
    columns: shown.map((c) => c.label),
    rows: eyes.map((e) => ({ eye: e.eye, cells: shown.map((c) => c.cell(e)) })),
    lenses,
    lensExtras,
    treatmentIds: Array.isArray(p.treatments) ? p.treatments.map(String) : [],
    tint,
    clips,
    frameName: text(frame.name),
    frameDetail: [mount, text(frame.source), method && `Delivery: ${method}`].filter(Boolean).join(" · "),
    measurements,
    notes: stripChemNotes(delivery.notes),
    flags: (Array.isArray(p.flags) ? p.flags : []).flatMap((f: unknown) => { const r = rec(f); return text(r.reason) ? [{ field: flagField(text(r.path)), reason: text(r.reason) }] : []; }),
  };
}
