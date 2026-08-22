// Currencies for the Rx order form.
//
// docs/rx-order-innovations-catalogue.md §2.8:
//   transactional quoting  BBD and USD only
//   other currencies       display only, indicative, at quote time
//   cart totals & payment  USD
//   payload to Innovations BBD
//
// ── The inversion ──────────────────────────────────────────────────────────
// The two sides store the SAME rate in opposite directions:
//
//   pricing_settings.fx_rates   BBD per unit of foreign   USD: 2
//   the engine's CUR table      foreign per 1 BBD         USD: 0.5
//
// Wiring one to the other unconverted puts every foreign quote out by the
// square of the rate — 4× for USD — and looks plausible enough to ship. The
// conversion happens in `engineRateFor` and nowhere else, so there is exactly
// one place to get it wrong and one test holding it.
//
// `fx_risk_buffer` is deliberately NOT applied here. It pads supplier COST
// conversion; adding it to a customer-facing sell price would quietly mark
// foreign quotes up by the buffer.

export interface EngineCurrency {
  sym: string;
  rate: number;
  n: string;
  /** Display only — never a cart total, a payment, or the submission price check. */
  indicative?: boolean;
}

/** Currencies we will actually transact in. */
export const TRANSACTIONAL_CURRENCIES = ["BBD", "USD"] as const;

export const isTransactional = (code: string) =>
  (TRANSACTIONAL_CURRENCIES as readonly string[]).includes(code);

const SYMBOLS: Record<string, { sym: string; n: string }> = {
  BBD: { sym: "BBD $", n: "Barbados dollar" },
  USD: { sym: "USD $", n: "US dollar" },
  EUR: { sym: "EUR €", n: "Euro" },
  TTD: { sym: "TTD $", n: "Trinidad & Tobago dollar" },
  JMD: { sym: "JMD $", n: "Jamaican dollar" },
  XCD: { sym: "XCD $", n: "East Caribbean dollar" },
};

/**
 * Rates for the display-only currencies. There is no authoritative source for
 * these — `pricing_settings.fx_rates` carries BBD and USD only — so they are
 * carried here, expressed in the same BBD-per-unit direction as the settings
 * table, and flagged indicative wherever they surface.
 */
export const INDICATIVE_BBD_PER_UNIT: Record<string, number> = {
  EUR: 2.17,
  TTD: 0.29,
  JMD: 0.013,
  XCD: 0.74,
};

/**
 * BBD-per-unit → the engine's foreign-per-BBD. THE inversion; see the header.
 * Returns null for a rate that cannot be inverted rather than yielding Infinity.
 */
export const engineRateFor = (bbdPerUnit: number | null | undefined): number | null => {
  if (bbdPerUnit == null || !Number.isFinite(bbdPerUnit) || bbdPerUnit <= 0) return null;
  return 1 / bbdPerUnit;
};

/**
 * Build the engine's CUR table from the active pricing settings.
 *
 * Transactional currencies come from `fx_rates`; anything missing there is
 * dropped rather than guessed. The indicative currencies are appended so a
 * customer can still see an approximate figure at quote time.
 */
export const buildEngineCurrencies = (
  fxRates: Record<string, number> | null | undefined,
): Record<string, EngineCurrency> => {
  const out: Record<string, EngineCurrency> = {};

  for (const code of TRANSACTIONAL_CURRENCIES) {
    const rate = engineRateFor(fxRates?.[code]);
    if (rate == null) continue;
    out[code] = { sym: SYMBOLS[code].sym, rate, n: SYMBOLS[code].n };
  }

  for (const [code, bbdPerUnit] of Object.entries(INDICATIVE_BBD_PER_UNIT)) {
    const rate = engineRateFor(bbdPerUnit);
    if (rate == null) continue;
    out[code] = { sym: SYMBOLS[code].sym, rate, n: `${SYMBOLS[code].n} (indicative)`, indicative: true };
  }

  return out;
};
