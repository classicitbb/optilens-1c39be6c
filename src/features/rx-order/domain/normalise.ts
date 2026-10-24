// What a prescription field becomes once the person leaves it — ported from the
// engine's normalise() and syncPlusCylToMain(). Pure: the form decides when to
// call this (on blur) and where to write the result.
import { parseNum, roundQuarter, signed, SHORTHAND_FIELDS } from "./parse";

export type RxField = "sph" | "cyl" | "axis" | "add" | "prism" | "pd" | "npd" | "ht";

export const SPH_MIN = -25;
export const SPH_MAX = 18;
export const ADD_MIN = 0.25;
export const ADD_MAX = 4.5;

export interface NormalisedField {
  /** The text to show in the field. */
  value: string;
  /**
   * A binocular PD (45 mm or more) was entered: both eyes take this half-PD
   * instead, and the person is told. Only set for pd / npd.
   */
  splitBoth?: { binocular: number; half: string };
}

/** Axis folded into 1–180 (0 is written 180). */
export const normaliseAxis = (v: number): number => {
  let a = Math.round(v);
  a = ((a % 180) + 180) % 180;
  return a === 0 ? 180 : a;
};

/**
 * Normalise what was typed into one field.
 *
 * Returns null when the field was empty (nothing to do — the engine leaves it
 * alone) and `{ value: "" }` when the text held nothing usable (the field is
 * cleared). Sphere is clamped to the producible range and stepped to a quarter;
 * cylinder is always written minus; add is written as a positive, clamped
 * +0.25…+4.50; PDs and heights go to the nearest half millimetre.
 */
export function normaliseRxField(field: RxField | "base", raw: string): NormalisedField | null {
  if (field === "base") return null;
  if (raw.trim() === "") return null;
  const v = parseNum(raw, SHORTHAND_FIELDS.includes(field));
  if (v === null) return { value: "" };

  switch (field) {
    case "sph":
      return { value: signed(roundQuarter(Math.max(SPH_MIN, Math.min(SPH_MAX, v)))) };
    case "cyl":
      return { value: signed(-Math.abs(roundQuarter(v))) };
    case "add":
      return { value: signed(Math.min(ADD_MAX, Math.max(ADD_MIN, roundQuarter(Math.abs(v))))) };
    case "axis":
      return { value: String(normaliseAxis(v)) };
    case "prism":
      return { value: Math.abs(roundQuarter(v)).toFixed(2) };
    case "pd":
    case "npd": {
      const pd = Math.abs(v);
      if (pd >= 45) {
        const half = (Math.round(pd) / 2).toFixed(1);
        return { value: half, splitBoth: { binocular: pd, half } };
      }
      return { value: (Math.round(pd * 2) / 2).toFixed(1) };
    }
    case "ht":
      return { value: (Math.round(Math.abs(v) * 2) / 2).toFixed(1) };
    default:
      return null;
  }
}

/**
 * Plus-cylinder → minus-cylinder transposition for a prescriber who wrote in
 * plus form: sph' = sph + cyl, cyl' = -cyl, axis' = axis ± 90 (folded to 1–180).
 * Returns null unless all three are present.
 */
export function transposePlusCyl(
  sph: number | null,
  cyl: number | null,
  axis: number | null,
): { sph: string; cyl: string; axis: string } | null {
  if (sph === null || cyl === null || axis === null) return null;
  return {
    sph: signed(roundQuarter(sph + cyl)),
    cyl: signed(-Math.abs(roundQuarter(cyl))),
    axis: String(normaliseAxis(Math.round(axis) + 90)),
  };
}
