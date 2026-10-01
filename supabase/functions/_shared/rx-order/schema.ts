// cv.rxorder/2 — the typed contract for one Rx order.
//
// A superset of cv.rxorder/1 (what the prototype engine emits today). It adds:
//   · per-eye lens (`lens.od` / `lens.os`) instead of lens + lensOs + split
//   · `lens.advanced` (diameter, corridor, base curve) as structured fields
//   · `source`  — where the order came from (typed, portal, photo capture…)
//   · `flags`   — fields that need a human look, with the reason (capture and
//                 prefill raise these; the form highlights them)
//   · one height per eye (`rx.<eye>.height`): OC height on single vision,
//     segment height on a bifocal, fitting height on a progressive
//
// Every cv.rxorder/1 payload still loads: `upgradeV1()` maps it forward, so
// existing drafts, quotes.rx_payload rows and old notes_internal blobs stay
// usable. The edge-function mirror of this file lives at
// supabase/functions/_shared/rx-order/schema.ts and is kept identical (apart
// from the zod import) by a test.
import { z } from "npm:zod@^4.4.3";

export const RX_ORDER_SCHEMA_V2 = "cv.rxorder/2" as const;

export const RX_ORDER_SOURCES = ["form", "portal", "capture", "local_capture", "assistant"] as const;
export type RxOrderSource = (typeof RX_ORDER_SOURCES)[number];

const finiteOrNull = z.number().finite().nullable();

const lensTriple = z.object({
  material: z.string(),
  design: z.string(),
  colour: z.string(),
});

const eyeRx = z.object({
  sph: finiteOrNull,
  cyl: finiteOrNull,
  axis: finiteOrNull,
  add: finiteOrNull,
  prism: finiteOrNull,
  base: z.enum(["IN", "OUT", "UP", "DOWN", ""]),
  pd: finiteOrNull,
  npd: finiteOrNull,
  /** OC height (single vision) / segment height (bifocal) / fitting height (progressive). */
  height: finiteOrNull,
});

export const rxFlagSchema = z.object({
  /** Dotted path of the field, e.g. "rx.od.sph". */
  path: z.string().min(1),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export const rxOrderV2Schema = z.object({
  schema: z.literal(RX_ORDER_SCHEMA_V2),
  orderNo: z.string().nullable(),
  source: z.enum(RX_ORDER_SOURCES),
  rebuiltFrom: z.string().nullable().default(null),
  createdAt: z.string(),
  account: z
    .object({ id: z.union([z.string(), z.number()]).transform(String), name: z.string() })
    .passthrough()
    .nullable(),
  reference: z.string().nullable(),
  patient: z.object({ first: z.string(), last: z.string() }),
  job: z.object({
    scope: z.enum(["uncut", "remote", "glaze"]),
    eyes: z.enum(["pair", "od", "os"]),
    vision: z.enum(["sv", "mf"]),
    purpose: z.enum(["dist", "read", "inter"]),
  }),
  frame: z.object({
    name: z.string(),
    mount: z.string(),
    source: z.string(),
    a: finiteOrNull,
    b: finiteOrNull,
    ed: finiteOrNull,
    dbl: finiteOrNull,
  }),
  /** Trace geometry — opaque here; its own module owns the detail. */
  shape: z.record(z.string(), z.unknown()).nullable(),
  lens: z.object({
    /** A side that is not ordered is null. An unsplit pair repeats the same triple. */
    od: lensTriple.nullable(),
    os: lensTriple.nullable(),
    advanced: z.object({
      diameter: finiteOrNull,
      corridor: z.string(),
      baseCurve: z.string(),
    }),
  }),
  rx: z.object({ od: eyeRx.optional(), os: eyeRx.optional() }),
  treatments: z.array(z.string()),
  tintConfig: z.record(z.string(), z.unknown()).nullable(),
  chemistrie: z.array(z.record(z.string(), z.unknown())).nullable(),
  ownerReview: z.boolean().default(false),
  assistance: z.array(z.string()),
  delivery: z.object({ service: z.string(), method: z.string(), notes: z.string() }),
  quote: z.record(z.string(), z.unknown()).nullable(),
  flags: z.array(rxFlagSchema).default([]),
});

export type RxOrderV2 = z.infer<typeof rxOrderV2Schema>;
export type RxFlag = z.infer<typeof rxFlagSchema>;

// ── upgrade from cv.rxorder/1 ────────────────────────────────────────────────

/** Form values arrive as numbers or numeric strings; anything else is "not entered". */
const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
};

const asRecord = (v: unknown): Record<string, any> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {};

const BASES = new Set(["IN", "OUT", "UP", "DOWN"]);

/**
 * Map a cv.rxorder/1 payload (the engine's current output, a saved draft, or a
 * quotes.notes_internal blob) to cv.rxorder/2. Throws a ZodError if the result
 * is not a valid v2 order, so callers learn about unusable data at the door.
 * Idempotent: a payload that is already v2 is validated and returned.
 */
export function upgradeV1(input: unknown, opts: { source?: RxOrderSource } = {}): RxOrderV2 {
  const p = asRecord(input);
  if (p.schema === RX_ORDER_SCHEMA_V2) return rxOrderV2Schema.parse(p);

  const job = asRecord(p.job);
  const eyes: "pair" | "od" | "os" = job.eyes === "od" || job.eyes === "os" ? job.eyes : "pair";
  const lens = asRecord(p.lens);
  const triple = (l: Record<string, any>) => ({
    material: String(l.material ?? ""),
    design: String(l.design ?? ""),
    colour: String(l.colour ?? ""),
  });
  const od = triple(lens);
  const split = !!p.split && !!p.lensOs;
  const os = split ? triple(asRecord(p.lensOs)) : od;

  const eyeRx = (e: Record<string, any>) => {
    const base = String(e.base ?? "").toUpperCase();
    return {
      sph: toNum(e.sph),
      cyl: toNum(e.cyl),
      axis: toNum(e.axis),
      add: toNum(e.add),
      prism: toNum(e.prism),
      base: (BASES.has(base) ? base : "") as "IN" | "OUT" | "UP" | "DOWN" | "",
      pd: toNum(e.pd),
      npd: toNum(e.npd),
      height: toNum(e.ht ?? e.height),
    };
  };
  const rx = asRecord(p.rx);
  const frame = asRecord(p.frame);
  const delivery = asRecord(p.delivery);
  const patient = asRecord(p.patient);
  const account = p.account && typeof p.account === "object" ? asRecord(p.account) : null;

  return rxOrderV2Schema.parse({
    schema: RX_ORDER_SCHEMA_V2,
    orderNo: p.orderNo == null || p.orderNo === "" ? null : String(p.orderNo),
    source: opts.source ?? "form",
    rebuiltFrom: p.rebuiltFrom ?? null,
    createdAt: String(p.createdAt ?? new Date(0).toISOString()),
    account: account && account.id != null ? { ...account, id: account.id, name: String(account.name ?? "") } : null,
    reference: p.reference == null || p.reference === "" ? null : String(p.reference),
    patient: { first: String(patient.first ?? ""), last: String(patient.last ?? "") },
    job: {
      scope: ["uncut", "remote", "glaze"].includes(job.scope) ? job.scope : "uncut",
      eyes,
      vision: job.vision === "mf" ? "mf" : "sv",
      purpose: ["dist", "read", "inter"].includes(job.purpose) ? job.purpose : "dist",
    },
    frame: {
      name: String(frame.name ?? ""),
      mount: String(frame.mount ?? ""),
      source: String(frame.source ?? ""),
      a: toNum(frame.a),
      b: toNum(frame.b),
      ed: toNum(frame.ed),
      dbl: toNum(frame.dbl),
    },
    shape: p.shape && typeof p.shape === "object" ? p.shape : null,
    lens: {
      od: eyes === "os" ? null : od,
      os: eyes === "od" ? null : os,
      advanced: {
        diameter: toNum(lens.diameter),
        corridor: String(lens.corridor ?? ""),
        baseCurve: String(lens.baseCurve ?? ""),
      },
    },
    rx: {
      ...(rx.od && eyes !== "os" ? { od: eyeRx(asRecord(rx.od)) } : {}),
      ...(rx.os && eyes !== "od" ? { os: eyeRx(asRecord(rx.os)) } : {}),
    },
    treatments: Array.isArray(p.treatments) ? p.treatments.map(String) : [],
    tintConfig: p.tintConfig && typeof p.tintConfig === "object" ? p.tintConfig : null,
    chemistrie: Array.isArray(p.chemistrie) ? p.chemistrie : null,
    ownerReview: !!p.ownerReview,
    assistance: Array.isArray(p.assistance) ? p.assistance.map(String) : [],
    delivery: {
      service: String(delivery.service ?? "std"),
      method: String(delivery.method ?? ""),
      notes: String(delivery.notes ?? ""),
    },
    quote: p.quote && typeof p.quote === "object" ? p.quote : null,
    flags: Array.isArray(p.flags) ? p.flags.flatMap((f: unknown) => { const r = rxFlagSchema.safeParse(f); return r.success ? [r.data] : []; }) : [],
  });
}
