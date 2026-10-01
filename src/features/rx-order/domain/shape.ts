// Frame trace files and shapes — ported from the engine's OMA parser and shape
// geometry (rx-order-engine.js: parseOMA, radiiToXY, scaleOutline, shapeMetrics,
// shapeGeometry, compactShape). Pure: text and numbers in, numbers out; drawing
// belongs to the React preview component. A characterisation test drives the
// engine with the same files and asserts these agree.
//
// Vocabulary: a trace gives the outline as polar radii around the boxing centre
// (hundredths of a mm, one block per lens side); the form rescales the outline to
// the A × B actually typed, so the preview and the effective diameter (ED) follow
// the form live.

export interface ShapeData {
  job: string;
  hbox: number | null;
  vbox: number | null;
  dbl: number | null;
  ed: number | null;
  circ: number | null;
  edAxis: { R: number | null; L: number | null };
  /**
   * The left outline was invented from the right, so the renderer must flip it.
   * When the file supplies a genuine left side it is ALREADY mirrored
   * (r_L(θ) = r_R(180°−θ)) and flipping it again would make both eyes identical.
   */
  mirroredL: boolean;
  sourceSide?: "L";
  /** Radii in mm, per side. */
  points: { R: number[]; L: number[] };
  /** Angles in degrees, per side (empty = evenly spaced). */
  angles: { R: number[]; L: number[] };
}

export interface Pt { x: number; y: number }

const num = (v: string): number => parseFloat(v);

/** First usable number of a "left;right" pair. */
const first = (val: string): number | null => {
  const p = val.split(";").map(num);
  return p[0] || p[1] || null;
};

/**
 * Parse raw OMA text (.oma / .tr / .vca) into header values and polar points.
 * Returns null for empty text. A file with no usable outline still parses (its
 * header values are kept) — callers check `points.R.length`.
 */
export function parseOma(text: string): ShapeData | null {
  if (!text) return null;
  const data: ShapeData = {
    job: "", hbox: null, vbox: null, dbl: null, ed: null, circ: null,
    edAxis: { R: null, L: null }, mirroredL: false,
    points: { R: [], L: [] }, angles: { R: [], L: [] },
  };
  let side: "R" | "L" = "R";

  for (let line of text.split(/\r?\n/)) {
    line = line.trim();
    if (!line || !line.includes("=")) continue;
    const parts = line.split("=");
    const key = parts[0].trim().toUpperCase();
    const val = parts.slice(1).join("=").trim();

    if (key === "JOB" || key === "FNAM") {
      if (!data.job) data.job = val.replace(/^"|"$/g, "");
    } else if (key === "HBOX") data.hbox = first(val);
    else if (key === "VBOX") data.vbox = first(val);
    else if (key === "DBL") data.dbl = num(val) || null;
    else if (key === "CIRC") data.circ = first(val);
    else if (key === "FED" || key === ".ED") data.ed = first(val);
    else if (key === "FEDAX" || key === ".AX") {
      const p = val.split(";").map(num);
      if (!Number.isNaN(p[0])) data.edAxis.R = p[0];
      if (!Number.isNaN(p[1])) data.edAxis.L = p[1];
    } else if (key === "TRCFMT") {
      // TRCFMT=1;1000;U;R;F — field 3 is the side this block describes
      const fmt = val.split(";");
      if (fmt.length >= 4) side = ((fmt[3] || "R").toUpperCase() as "R" | "L");
      if (side !== "R" && side !== "L") side = "R";
    } else if (key === "R") {
      val.split(";").map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v)).forEach((r) => data.points[side].push(r / 100));
    } else if (key === "A") {
      val.split(";").map((v) => parseInt(v, 10)).filter((v) => !Number.isNaN(v)).forEach((a) => data.angles[side].push(a / 100));
    }
  }

  // only synthesise a side when the file genuinely lacks it
  if (data.points.R.length && !data.points.L.length) {
    data.points.L = data.points.R.slice();
    data.angles.L = data.angles.R.slice();
    data.mirroredL = true;
  } else if (data.points.L.length && !data.points.R.length) {
    data.points.R = data.points.L.slice();
    data.angles.R = data.angles.L.slice();
    data.mirroredL = true;
    data.sourceSide = "L";
  }
  return data;
}

/** True when the parsed file holds a drawable outline. */
export const hasOutline = (s: ShapeData | null | undefined): s is ShapeData => !!s && s.points.R.length > 0;

// ── geometry ─────────────────────────────────────────────────────────────────

/** Polar radii (+ optional explicit angles) → cartesian outline, boxing centre at 0,0, y up. */
export function radiiToXY(radii: number[], angles?: number[]): Pt[] {
  const n = radii.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const deg = angles && angles.length === n ? angles[i] : (i * 360) / n;
    const t = (deg * Math.PI) / 180;
    out.push({ x: radii[i] * Math.cos(t), y: radii[i] * Math.sin(t) });
  }
  return out;
}

export function outlineBox(pts: Pt[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY, w: maxX - minX, h: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/** Rescale an outline so its bounding box is exactly A × B, recentred on the boxing centre. */
export function scaleOutline(pts: Pt[], A: number, B: number): Pt[] {
  const b = outlineBox(pts);
  if (!b.w || !b.h) return pts.slice();
  const sx = A / b.w, sy = B / b.h;
  return pts.map((p) => ({ x: (p.x - b.cx) * sx, y: (p.y - b.cy) * sy }));
}

export interface ShapeMetrics { ed: number; edAxis: number; circ: number }

/** True ED (2 × the longest radius from the boxing centre), its axis, and the circumference. */
export function shapeMetrics(pts: Pt[]): ShapeMetrics {
  let maxR = 0, axis = 0, circ = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const r = Math.hypot(p.x, p.y);
    if (r > maxR) { maxR = r; axis = (Math.atan2(p.y, p.x) * 180) / Math.PI; }
    const q = pts[(i + 1) % pts.length];
    circ += Math.hypot(q.x - p.x, q.y - p.y);
  }
  axis = ((axis % 180) + 180) % 180;
  return { ed: maxR * 2, edAxis: axis, circ };
}

/** Outline → SVG path data (screen coordinates: y flipped, optional horizontal mirror). */
export function outlinePath(pts: Pt[], mirror = false): string {
  return pts.map((p, i) => `${i ? "L" : "M"}${(mirror ? -p.x : p.x).toFixed(2)},${(-p.y).toFixed(2)}`).join(" ") + " Z";
}

export interface ShapeGeometry {
  a: number;
  b: number;
  dbl: number;
  ptsR: Pt[];
  ptsL: Pt[];
  mirrorL: boolean;
  /** A and B are not typed yet: the preview is drawn at the file's own size. */
  ghost: boolean;
  metrics: ShapeMetrics;
}

/**
 * "What shape are we drawing, at what size": the stored outline rescaled to the
 * A / B / DBL currently typed (falling back to the file's own box, then 52 × 38 / 17).
 */
export function shapeGeometry(
  shape: ShapeData | null | undefined,
  typed: { a: number | null; b: number | null; dbl: number | null },
): ShapeGeometry | null {
  if (!shape || !shape.points.R.length) return null;
  const ghost = typed.a === null || typed.b === null;
  const a = typed.a !== null ? typed.a : shape.hbox || 52;
  const b = typed.b !== null ? typed.b : shape.vbox || 38;
  const dbl = typed.dbl !== null ? typed.dbl : shape.dbl || 17;
  const rawR = radiiToXY(shape.points.R, shape.angles.R);
  const rawL = radiiToXY(shape.points.L.length ? shape.points.L : shape.points.R, shape.angles.L.length ? shape.angles.L : shape.angles.R);
  const ptsR = scaleOutline(rawR, a, b);
  const ptsL = scaleOutline(rawL, a, b);
  return { a, b, dbl, ptsR, ptsL, mirrorL: shape.mirroredL, ghost, metrics: shapeMetrics(ptsR) };
}

/** Shrink a 1000-point trace to `n` points — smooth on screen, small enough to store and ship. */
export function compactShape(oma: ShapeData, n = 240): ShapeData {
  const N = oma.points.R.length;
  const idx: number[] = [];
  for (let i = 0; i < n; i++) idx.push(Math.round((i * N) / n) % N);
  const pick = (arr: number[]) => (arr && arr.length === N ? idx.map((i) => +arr[i].toFixed(2)) : []);
  return {
    job: oma.job, hbox: oma.hbox, vbox: oma.vbox, dbl: oma.dbl, ed: oma.ed, circ: oma.circ,
    edAxis: oma.edAxis, mirroredL: oma.mirroredL,
    points: { R: pick(oma.points.R), L: pick(oma.points.L) },
    angles: { R: pick(oma.angles.R), L: pick(oma.angles.L) },
  };
}

// ── what travels with the order ──────────────────────────────────────────────

/** Where the shape in play came from. */
export type ShapeSource = "standard" | "trace";

export interface ShapePayload {
  source: ShapeSource;
  standardId: string | null;
  file: string | null;
  job: string | null;
  mirroredFrom: "right" | null;
  pointCount: number;
  nativeBox: { a: number | null; b: number | null; dbl: number | null; ed: number | null };
  computed: { ed: number; edAxis: number; circ: number };
  confirmed: boolean;
  radii: { R: number[]; L: number[] };
  angles: { R: number[]; L: number[] };
}

/** The `shape` object of the order payload (cv.rxorder/1 and /2). */
export function shapeToPayload(
  shape: ShapeData,
  geometry: ShapeGeometry,
  o: { source: ShapeSource; standardId: string | null; fileName: string | null; confirmed: boolean },
): ShapePayload {
  const m = geometry.metrics;
  return {
    source: o.source,
    standardId: o.standardId,
    file: o.fileName,
    job: shape.job || null,
    mirroredFrom: shape.mirroredL ? "right" : null,
    pointCount: shape.points.R.length,
    nativeBox: { a: shape.hbox, b: shape.vbox, dbl: shape.dbl, ed: shape.ed },
    computed: { ed: +m.ed.toFixed(2), edAxis: +m.edAxis.toFixed(2), circ: +m.circ.toFixed(2) },
    confirmed: o.confirmed,
    radii: { R: shape.points.R, L: shape.points.L },
    angles: { R: shape.angles.R, L: shape.angles.L },
  };
}

/** Rebuild the shape from a saved payload (so a saved order reopens with its outline). */
export function shapeFromPayload(p: unknown): { shape: ShapeData; source: ShapeSource; standardId: string | null; fileName: string | null; confirmed: boolean } | null {
  const s = p as Partial<ShapePayload> | null;
  if (!s || typeof s !== "object" || !s.radii || !Array.isArray(s.radii.R) || !s.radii.R.length) return null;
  const box = s.nativeBox ?? { a: null, b: null, dbl: null, ed: null };
  return {
    shape: {
      job: s.job ?? "", hbox: box.a ?? null, vbox: box.b ?? null, dbl: box.dbl ?? null, ed: box.ed ?? null, circ: null,
      edAxis: { R: null, L: null }, mirroredL: !!s.mirroredFrom,
      points: { R: s.radii.R, L: s.radii.L ?? [] }, angles: { R: s.angles?.R ?? [], L: s.angles?.L ?? [] },
    },
    source: s.source === "standard" ? "standard" : "trace",
    standardId: s.standardId ?? null,
    fileName: s.file ?? null,
    confirmed: !!s.confirmed,
  };
}

/** The accepted trace file types. */
export const TRACE_FILE = /\.(oma|tr|vca)$/i;
