// Shared prescription (Rx) formatting and parsing helpers.
// Used by the thickness estimator and office-range calculator forms so that
// power entry behaves consistently: 0.25 D steps, explicit +/- sign, 2 decimals,
// and no native number-spinner buttons (fields are rendered as type="text").

export const roundToQuarter = (value: number): number => Math.round(value * 4) / 4;

export const roundToStep = (value: number, step: number): number =>
  step > 0 ? Math.round(value / step) * step : value;

export const clampNumber = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// Always renders an explicit sign and two decimals: +2.50, -0.75, +0.00.
export const formatSignedPower = (value: number): string => {
  const safe = Number.isFinite(value) ? value : 0;
  // Guard against "-0.00".
  const normalized = safe === 0 ? 0 : safe;
  return `${normalized >= 0 ? "+" : "-"}${Math.abs(normalized).toFixed(2)}`;
};

// Renders an unsigned numeric value with a fixed number of decimals (axis, PD, etc.).
export const formatPlain = (value: number, decimals = 0): string =>
  Number.isFinite(value) ? value.toFixed(decimals) : "";

type ParsePowerOptions = {
  min: number;
  max: number;
  step?: number;
  allowNegative?: boolean;
};

// Parse a typed signed-power string ("+2.5", "-0.75", "1.25", ".5", "-").
// Returns null when the value is not yet a finite number so callers can keep the
// raw draft while the user is mid-edit. ADD fields pass allowNegative=false so a
// typed negative is folded to its positive magnitude (ADD is plus-only).
export const parseRxPower = (
  raw: string,
  { min, max, step = 0.25, allowNegative = true }: ParsePowerOptions,
): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "+" || trimmed === "-" || trimmed === ".") {
    return null;
  }

  // Fast optical entry: when no decimal point is typed, the digits are read as
  // hundredths of a dioptre (the implied two-decimal convention). So "075" -> 0.75,
  // "275" -> 2.75, "-225" -> -2.25, "200" -> 2.00. A typed decimal point ("2.5",
  // "-0.75") is parsed literally.
  let parsed: number;
  const digitsOnly = trimmed.match(/^([+-]?)(\d+)$/);
  if (digitsOnly) {
    const sign = digitsOnly[1] === "-" ? -1 : 1;
    parsed = (sign * Number.parseInt(digitsOnly[2], 10)) / 100;
  } else {
    parsed = Number.parseFloat(trimmed);
    if (!Number.isFinite(parsed)) return null;
  }

  let next = allowNegative ? parsed : Math.abs(parsed);
  next = roundToStep(next, step); // snap to nearest 0.25 D step
  next = clampNumber(next, min, max);
  return next === 0 ? 0 : next; // avoid -0
};

type ParsePlainOptions = {
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
  // When set, the value wraps modulo this period into the range (0, period]
  // instead of being clamped. Used by AXIS so 190 -> 10, 360 -> 180.
  wrapModulo?: number;
};

// Parse a typed unsigned numeric string (axis, PD, frame dimensions).
export const parsePlainNumber = (
  raw: string,
  { min, max, step, integer = false, wrapModulo }: ParsePlainOptions,
): number | null => {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;

  let next = parsed;
  if (integer) {
    next = Math.round(next);
  } else if (step && step > 0) {
    next = roundToStep(next, step);
  }

  if (wrapModulo && wrapModulo > 0) {
    // Map into (0, wrapModulo]: e.g. 190 -> 10, 180 -> 180, 360 -> 180, -10 -> 170.
    next = next % wrapModulo;
    if (next <= 0) next += wrapModulo;
  } else {
    next = clampNumber(next, min, max);
  }
  return next === 0 ? 0 : next; // avoid -0
};

// -- Validators (pure, for tests and form-level checks) ----------------------

const isQuarterStep = (value: number): boolean =>
  Math.abs(Math.round(value * 100) % 25) < 1e-6;

// SPH / CYL: any sign, 0.25 steps, within [min, max] (defaults +/-30 D).
export const isValidSphCyl = (value: number, min = -30, max = 30): boolean =>
  Number.isFinite(value) && value >= min && value <= max && isQuarterStep(value);

// ADD: plus-only, 0.25 steps, within [0, max] (default +4.00 D).
export const isValidAdd = (value: number, max = 4): boolean =>
  Number.isFinite(value) && value >= 0 && value <= max && isQuarterStep(value);

// AXIS: integer 0-180.
export const isValidAxis = (value: number): boolean =>
  Number.isFinite(value) && Number.isInteger(value) && value >= 0 && value <= 180;

// PD: per-eye (mono) 20-40 mm, or binocular 40-85 mm.
export const isValidMonoPd = (value: number): boolean =>
  Number.isFinite(value) && value >= 20 && value <= 40;

export const isValidBinocularPd = (value: number): boolean =>
  Number.isFinite(value) && value >= 40 && value <= 85;
