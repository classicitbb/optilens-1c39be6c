// The one place Rx validation lives. Ported from the engine's errors(),
// warnings(), prompts(), limitErrors() and the Rx part of secValid(); it
// replaces the conflicting copies in the dead RxSection / PrescriptionSection.
// Pure: rows and rules in, issues out. The wording is the engine's, word for
// word, so the characterisation test can compare them as strings.
import { signed } from "./parse";
import { ADD_MAX, ADD_MIN, SPH_MAX, SPH_MIN, type RxField } from "./normalise";

export type Eye = "od" | "os";

export interface RxEyeValues {
  sph: number | null;
  cyl: number | null;
  axis: number | null;
  add: number | null;
  prism: number | null;
  /** Prism base direction, "" when not set. */
  base: string;
  pd: number | null;
  npd: number | null;
  /** OC height (single vision) / segment height (bifocal) / fitting height (progressive). */
  ht: number | null;
}

export interface RxRules {
  /** Which eyes are being ordered. */
  eyes: "pair" | "od" | "os";
  /** Multifocal, or a design that needs an add. */
  needsAdd: boolean;
  /** Single-vision reading / intermediate jobs collect a near PD. */
  needsNearPD: boolean;
  /** Multifocal jobs need a height. */
  needsHt: boolean;
  /** A progressive on either side: the stricter fitting-height rules govern. */
  isProg: boolean;
  /** Frame B in mm, when entered — a fitting height cannot exceed it. */
  frameB: number | null;
}

/** Derive the rule flags the form works from. */
export const rxRules = (o: {
  eyes: "pair" | "od" | "os";
  vision: "sv" | "mf";
  purpose: "dist" | "read" | "inter";
  designNeedsAdd?: boolean;
  isProg?: boolean;
  frameB?: number | null;
}): RxRules => ({
  eyes: o.eyes,
  needsAdd: o.vision === "mf" || !!o.designNeedsAdd,
  needsNearPD: o.vision === "sv" && (o.purpose === "read" || o.purpose === "inter"),
  needsHt: o.vision === "mf",
  isProg: !!o.isProg,
  frameB: o.frameB ?? null,
});

export interface RxIssue {
  /** Text shown beside the field. */
  text: string;
  eye: Eye;
  field: RxField | "base";
}

export const activeEyes = (eyes: RxRules["eyes"]): Eye[] => (eyes === "pair" ? ["od", "os"] : [eyes]);

/** Minimum height: a progressive needs room for the corridor. */
export const minHeight = (isProg: boolean): number => (isProg ? 14 : 12);
export const MAX_HEIGHT = 35;

/** Blocking errors — the order cannot be submitted while any remain. */
export function rxErrors(rows: Partial<Record<Eye, RxEyeValues>>, rules: RxRules): RxIssue[] {
  const out: RxIssue[] = [];
  const eyes = activeEyes(rules.eyes);
  // Nothing is an error until the person has started typing a prescription.
  const anyStarted = eyes.some((e) =>
    Object.entries(rows[e] ?? {}).some(([key, value]) => key !== "base" && value !== null && value !== undefined),
  );
  if (!anyStarted) return out;

  const heightKind = rules.isProg ? "fitting" : "segment";
  for (const e of eyes) {
    const r = rows[e];
    if (!r) continue;
    const E = e.toUpperCase();
    const add = (text: string, field: RxIssue["field"]) => out.push({ text, eye: e, field });

    if (r.sph === null) add(`${E} sphere is required.`, "sph");
    if (r.sph !== null && (r.sph > SPH_MAX || r.sph < SPH_MIN)) add(`${E} sphere is outside the producible range (+18.00 to -25.00).`, "sph");
    if (r.cyl !== null && Math.abs(r.cyl) > 8) add(`${E} cylinder beyond -8.00 needs a lab consult.`, "cyl");
    if (r.cyl && r.axis === null) add(`${E} axis is required when cylinder is entered.`, "axis");
    if (r.axis !== null && (r.axis < 1 || r.axis > 180)) add(`${E} axis must be from 1 to 180.`, "axis");
    if (rules.needsAdd && (r.add === null || r.add < ADD_MIN)) add(`${E} add must be at least +0.25.`, "add");
    if (r.add !== null && r.add > ADD_MAX) add(`${E} add above +4.50 is not producible.`, "add");
    if (r.pd === null || r.pd < 20 || r.pd > 45) add(`${E} distance PD must be 20–45 mm.`, "pd");
    if (rules.needsNearPD && (r.npd === null || r.npd < 18 || r.npd > 45)) add(`${E} near PD must be 18–45 mm.`, "npd");
    if (rules.needsHt && (r.ht === null || r.ht < minHeight(rules.isProg) || r.ht > MAX_HEIGHT)) {
      add(`${E} ${heightKind} height must be ${minHeight(rules.isProg)}–35 mm.`, "ht");
    }
    if (rules.needsHt && rules.frameB !== null && r.ht !== null && r.ht > rules.frameB) {
      add(`${E} fitting height ${r.ht.toFixed(1)} mm exceeds the frame B measurement of ${rules.frameB.toFixed(1)} mm.`, "ht");
    }
    if (r.prism !== null && r.prism > 10) add(`${E} prism cannot exceed 10.00Δ in any base direction.`, "prism");
    if (r.prism && r.prism > 0 && !r.base) add(`${E} prism needs a base direction.`, "base");
    if (rules.needsNearPD && r.npd !== null && r.pd !== null && r.npd > r.pd) {
      add(`${E} near PD is wider than distance PD — check the measurement.`, "npd");
    }
  }
  return out;
}

export interface RxWarning {
  /** Stable id so a dismissal sticks ("ht-od", "sign"). */
  id: string;
  text: string;
}

/** Allowed-but-unusual: shown once, dismissible, never blocks. */
export function rxWarnings(
  rows: Partial<Record<Eye, RxEyeValues>>,
  rules: RxRules,
  dismissed: ReadonlySet<string> = new Set(),
): RxWarning[] {
  const out: RxWarning[] = [];
  const { frameB } = rules;
  if (rules.needsHt && frameB !== null) {
    for (const e of activeEyes(rules.eyes)) {
      const ht = rows[e]?.ht ?? null;
      if (ht !== null && ht <= frameB && ht >= frameB - 3 && !dismissed.has(`ht-${e}`)) {
        out.push({
          id: `ht-${e}`,
          text: `${e.toUpperCase()} fitting height is within 3 mm of frame B (${frameB.toFixed(1)} mm). Check the measurement; this is allowed if intentional.`,
        });
      }
    }
  }
  if (rules.eyes === "pair") {
    const a = rows.od?.sph ?? null;
    const b = rows.os?.sph ?? null;
    if (a !== null && b !== null && a * b < 0 && !dismissed.has("sign")) {
      out.push({
        id: "sign",
        text: `Right eye is ${signed(a)} and left is ${signed(b)} — opposing signs. Unusual but not impossible; dismiss if intended.`,
      });
    }
  }
  return out;
}

/** Gentle "did you mean…" questions. */
export function rxPrompts(rows: Partial<Record<Eye, RxEyeValues>>, rules: Pick<RxRules, "eyes">): { eye: Eye; text: string }[] {
  const out: { eye: Eye; text: string }[] = [];
  for (const e of activeEyes(rules.eyes)) {
    const r = rows[e];
    if (r && r.axis !== null && (!r.cyl || r.cyl === 0)) {
      out.push({ eye: e, text: `${e.toUpperCase()} has an axis but no cylinder — is the cylinder missing?` });
    }
  }
  return out;
}

// ── frame measurements ───────────────────────────────────────────────────────

export const FRAME_LIMITS = {
  a: { max: 78, label: "A" },
  b: { max: 60, label: "B" },
  ed: { max: 88, label: "ED" },
  dbl: { max: 30, label: "DBL" },
} as const;

export interface FrameBox {
  a: number | null;
  b: number | null;
  ed: number | null;
  dbl: number | null;
}

export interface FrameIssue {
  /** Which measurement the message belongs to. */
  field: keyof FrameBox;
  text: string;
}

/** Cutting limits and the ED-vs-box sanity check. */
export function frameLimitErrors(frame: FrameBox): FrameIssue[] {
  const out: FrameIssue[] = [];
  (Object.keys(FRAME_LIMITS) as (keyof typeof FRAME_LIMITS)[]).forEach((field) => {
    const limit = FRAME_LIMITS[field];
    const v = frame[field];
    if (v !== null && v > limit.max) out.push({ field, text: `${limit.label} is ${v.toFixed(2)} mm — the maximum we can cut is ${limit.max} mm.` });
    if (v !== null && v <= 0) out.push({ field, text: `${limit.label} must be greater than zero.` });
  });
  const { ed, a, b } = frame;
  if (ed !== null && a !== null && b !== null && ed < Math.max(a, b)) {
    out.push({ field: "ed", text: `ED ${ed.toFixed(2)} mm is smaller than the box — it can't be less than the larger of A and B.` });
  }
  return out;
}

// ── section completeness ─────────────────────────────────────────────────────

/**
 * Whether the prescription card is complete (the Rx half of the engine's
 * secValid()): every active eye in range, add / near PD / height present where
 * the job needs them, and no blocking error outstanding.
 */
export function rxSectionComplete(rows: Partial<Record<Eye, RxEyeValues>>, rules: RxRules): boolean {
  const eyes = activeEyes(rules.eyes).map((e) => rows[e]);
  if (eyes.some((r) => !r)) return false;
  const rs = eyes as RxEyeValues[];
  return (
    rs.every((r) => r.sph !== null && r.sph >= SPH_MIN && r.sph <= SPH_MAX)
    && rs.every((r) => !r.cyl || r.cyl === 0 || (r.axis !== null && r.axis >= 1 && r.axis <= 180))
    && (!rules.needsAdd || rs.every((r) => r.add !== null && r.add >= ADD_MIN && r.add <= ADD_MAX))
    && rs.every((r) => r.pd !== null && r.pd >= 20 && r.pd <= 45)
    && (!rules.needsNearPD || rs.every((r) => r.npd !== null && r.npd >= 18 && r.npd <= 45))
    && (!rules.needsHt || rs.every((r) =>
      r.ht !== null && r.ht >= minHeight(rules.isProg) && r.ht <= MAX_HEIGHT && r.ht <= (rules.frameB ?? Infinity)))
    && rs.every((r) => r.prism === null || r.prism <= 10)
    && rxErrors(rows, rules).length === 0
  );
}
