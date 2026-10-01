// Number entry for the Rx form — ported from rx-order-engine.js (parseNum, q4,
// isStep, sgn). Pure: no DOM, no state. The engine stays the reference until the
// cutover; a characterisation test (rxOrderDomain.integration.test.ts) drives the
// real engine and asserts these functions agree with it.

/** True when `v` sits on a quarter-dioptre step. */
export const isQuarterStep = (v: number): boolean => Math.abs(v * 4 - Math.round(v * 4)) < 1e-9;

/** Round to the nearest quarter. */
export const roundQuarter = (n: number): number => Math.round(n * 4) / 4;

/** "+1.25" / "-0.50": explicit sign, fixed decimals. Zero is written "+0.00". */
export const signed = (n: number, dp = 2): string => (n < 0 ? "-" : "+") + Math.abs(n).toFixed(dp);

/**
 * Shorthand-aware numeric parse of what a person typed.
 *
 * Accepts a leading or trailing minus, an optional leading plus, and ignores
 * stray characters. With `shorthand` (sphere, cylinder and add), an integer of
 * two or more digits is read as hundredths when that lands on a quarter step
 * within ±25: "125" → 1.25, "-250" → -2.5. Anything with a decimal point is
 * taken literally. Returns null for nothing usable.
 */
export function parseNum(raw: unknown, shorthand = false): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  let neg = false;
  if (/-\s*$/.test(s)) { neg = true; s = s.replace(/-\s*$/, ""); }
  if (/^\s*-/.test(s)) { neg = true; s = s.replace(/^\s*-/, ""); }
  const hadDot = s.includes(".");
  s = s.replace(/^\s*\+/, "").replace(/[^0-9.]/g, "");
  if (s === "") return null;
  let n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  if (shorthand && !hadDot && /^\d+$/.test(s) && s.length >= 2) {
    const v = n / 100;
    if (isQuarterStep(v) && Math.abs(v) <= 25) n = v;
  }
  return neg ? -n : n;
}

/** Fields that accept the shorthand above. */
export const SHORTHAND_FIELDS: readonly string[] = ["sph", "cyl", "add"];
