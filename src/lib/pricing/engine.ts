/**
 * engine.ts — the money logic (pure, testable, UI-free).
 *
 * Ported from C:\DEV\pricelist-automation\pricing-engine.js (BS1-05).
 *
 * - Standard price anchored on the most expensive AVAILABLE approved supplier
 *   (scope = approved & available; excluded labs drop out of the anchor).
 * - Floor margin applied to whichever lab is the anchor (default 15%).
 *   Guarantee: sourcing from ANY available lab yields margin >= floorMargin.
 * - Per-pricelist supplier priority shapes the *preferred/displayed* source,
 *   never the safety floor.
 * - Zero-/low-margin manual override -> finds the supplier(s) that make the
 *   entered price acceptable and returns them for the user to CONFIRM
 *   (nothing auto-applied); on confirm the line is source-constrained.
 * - $10 wholesale floor + clean upward rounding (never breaches the floor).
 * - Retail = separate list derived from wholesale via a configurable markup.
 */

export const DEFAULT_PRIORITY = ["TOG Rx Lab", "Vision Rx Lab", "Optex Laboratories", "SkyLab"];

export interface CostModel {
  freightPct?: Record<string, number> & { default?: number };
  dutyPct?: number;
  leviesPct?: number;
  clearancePct?: number;
  brokeragePerPair?: number;
}

export interface Combo {
  key: string;
  treatment?: string;
  tier?: string;
  material?: string;
  suppliers: Record<string, number>;
  _raw?: Record<string, number>;
}

export interface Markup {
  type: "pct" | "flat";
  value: number;
}

export interface EngineOptions {
  floorMargin?: number;
  minMargin?: number;
  rounding?: number;
  wholesaleFloor?: number;
  priority?: string[];
  excluded?: string[];
  costModel?: CostModel | null;
  markup?: Markup;
  smooth?: boolean;
}

export const DEFAULTS: Required<Pick<EngineOptions, "floorMargin" | "minMargin" | "rounding" | "wholesaleFloor" | "priority" | "excluded" | "costModel">> = {
  floorMargin: 0.15,     // thin minimum margin on the anchor (worst case)
  minMargin: 0.15,       // lowest acceptable margin for override sourcing
  rounding: 0.5,         // round standard prices up to nearest this increment
  wholesaleFloor: 10,    // $10 USD minimum (wholesale only)
  priority: DEFAULT_PRIORITY,
  excluded: [],          // supplier names excluded for this pricelist
  costModel: null,       // null => landed cost == supplier price (see landedCostFor)
};

function withDefaults(opts?: EngineOptions) {
  return { ...DEFAULTS, ...opts };
}

// ── Landed cost (§2.7) ──────────────────────────────────────────────────
// True cost to land an uncut lens in Barbados, per supplier, per pair:
//   CIF    = FOB supplier price × (1 + freight/insurance%)   [origin-specific]
//   landed = CIF × (1 + duty% + environmental levy% + clearance%) + brokerage/pair
// VAT is NOT included — for a VAT-registered reseller it is a recoverable input
// credit, so baking it into cost would overprice you. Edging is excluded (separate page).
export function landedCostFor(price: number, supplier: string, cm: CostModel | null | undefined): number {
  if (!cm) return price;
  const freight = (cm.freightPct && (cm.freightPct[supplier] != null ? cm.freightPct[supplier] : cm.freightPct.default)) || 0;
  const cif = price * (1 + freight);
  const uplift = (cm.dutyPct || 0) + (cm.leviesPct || 0) + (cm.clearancePct || 0);
  return round2(cif * (1 + uplift) + (cm.brokeragePerPair || 0));
}

// Return a combo clone whose supplier costs are LANDED costs (raw kept on _raw).
export function landCombo(combo: Combo, cm: CostModel | null | undefined): Combo {
  if (!cm) return combo;
  const landed: Record<string, number> = {};
  for (const [s, c] of Object.entries(combo.suppliers || {})) landed[s] = landedCostFor(Number(c), s, cm);
  return { ...combo, suppliers: landed, _raw: combo.suppliers };
}

// ── helpers ───────────────────────────────────────────────────────────
function ceilTo(value: number, inc: number): number {
  if (!inc || inc <= 0) return value;
  return Math.ceil((value - 1e-9) / inc) * inc;
}

export function marginAt(price: number, cost: number): number {
  if (!(price > 0)) return -Infinity;
  return (price - cost) / price;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface SupplierCost {
  supplier: string;
  cost: number;
}

// suppliers that actually offer this combo, minus excluded labs
export function availableSuppliers(combo: Combo, excluded?: string[]): SupplierCost[] {
  const ex = new Set(excluded || []);
  return Object.entries(combo.suppliers || {})
    .filter(([s]) => !ex.has(s))
    .map(([s, c]) => ({ supplier: s, cost: Number(c) }))
    .filter((s) => Number.isFinite(s.cost) && s.cost > 0);
}

// the anchor = most expensive available (the worst case you could be forced to)
export function anchorOf(combo: Combo, excluded?: string[]): SupplierCost | null {
  const av = availableSuppliers(combo, excluded);
  if (!av.length) return null;
  return av.reduce((a, b) => (b.cost > a.cost ? b : a));
}

// preferred = first supplier in priority order that is available
export function preferredOf(combo: Combo, excluded?: string[], priority?: string[]): SupplierCost | null {
  const av = availableSuppliers(combo, excluded);
  if (!av.length) return null;
  const order = priority || DEFAULT_PRIORITY;
  for (const name of order) {
    const hit = av.find((s) => s.supplier === name);
    if (hit) return hit;
  }
  // any supplier not in the priority list -> fall back to cheapest available
  return av.reduce((a, b) => (b.cost < a.cost ? b : a));
}

export interface StandardPriceResult {
  available: boolean;
  reason?: string;
  combo?: string;
  key?: string;
  priceUSD?: number;
  anchorSupplier?: string;
  anchorCost?: number;
  anchorSupplierPrice?: number | null;
  floorMargin?: number;
  preferredSupplier?: string;
  preferredCost?: number;
  preferredSupplierPrice?: number | null;
  preferredMargin?: number;
  minMarginAcrossSuppliers?: number;
  supplierCount?: number;
  safe?: boolean;
}

/**
 * Standard (wholesale) price for one combo.
 * Returns { available: false } when no supplier can fill it (a true gap).
 */
export function standardPrice(combo: Combo, opts?: EngineOptions): StandardPriceResult {
  const o = withDefaults(opts);
  const lc = landCombo(combo, o.costModel); // operate on LANDED costs
  const anchor = anchorOf(lc, o.excluded);
  if (!anchor) {
    return { available: false, reason: "no available supplier", combo: combo.key };
  }
  // price off the anchor at the floor margin, round UP so we never breach it
  let price = anchor.cost / (1 - o.floorMargin);
  price = ceilTo(price, o.rounding);
  if (o.wholesaleFloor) price = Math.max(price, o.wholesaleFloor);

  const preferred = preferredOf(lc, o.excluded, o.priority)!;
  const av = availableSuppliers(lc, o.excluded);
  // worst-case margin (on the anchor) and best expected (on preferred source)
  const floorMarginActual = marginAt(price, anchor.cost);
  const preferredMargin = marginAt(price, preferred.cost);
  // guarantee check: every available supplier must clear the floor
  const minMarginAcrossSuppliers = Math.min(...av.map((s) => marginAt(price, s.cost)));
  const raw = lc._raw || combo.suppliers || {};

  return {
    available: true,
    key: combo.key,
    priceUSD: round2(price),
    anchorSupplier: anchor.supplier,
    anchorCost: round2(anchor.cost), // LANDED cost of the anchor
    anchorSupplierPrice: raw[anchor.supplier] != null ? round2(Number(raw[anchor.supplier])) : null,
    floorMargin: round2(floorMarginActual),
    preferredSupplier: preferred.supplier,
    preferredCost: round2(preferred.cost), // LANDED cost of preferred source
    preferredSupplierPrice: raw[preferred.supplier] != null ? round2(Number(raw[preferred.supplier])) : null,
    preferredMargin: round2(preferredMargin),
    minMarginAcrossSuppliers: round2(minMarginAcrossSuppliers),
    supplierCount: av.length,
    safe: minMarginAcrossSuppliers >= o.floorMargin - 1e-9,
  };
}

export interface OverrideConstraint {
  supplier: string;
  cost: number;
  margin: number;
}

export interface EvaluateOverrideResult {
  available?: boolean;
  ok?: boolean;
  needsConfirmation?: boolean;
  anchorMargin?: number;
  constraint?: OverrideConstraint | null;
  acceptableSuppliers?: OverrideConstraint[];
  message?: string;
}

/**
 * Evaluate a manual price the user typed against the anchor.
 * If it clears the floor on the anchor -> ok, no constraint.
 * If not -> return the supplier(s) that make it acceptable, for the user to
 * CONFIRM. The cheapest acceptable supplier becomes the proposed constraint.
 */
export function evaluateOverride(combo: Combo, enteredPriceUSD: number, opts?: EngineOptions): EvaluateOverrideResult {
  const o = withDefaults(opts);
  const lc = landCombo(combo, o.costModel); // compare against LANDED costs
  const anchor = anchorOf(lc, o.excluded);
  if (!anchor) return { available: false };
  const av = availableSuppliers(lc, o.excluded);
  const anchorMargin = marginAt(enteredPriceUSD, anchor.cost);

  if (anchorMargin >= o.minMargin - 1e-9) {
    return { ok: true, needsConfirmation: false, anchorMargin: round2(anchorMargin) };
  }
  // entered price too low for the anchor — who CAN we source from acceptably?
  const acceptable = av
    .filter((s) => marginAt(enteredPriceUSD, s.cost) >= o.minMargin - 1e-9)
    .sort((a, b) => a.cost - b.cost);
  return {
    ok: false,
    needsConfirmation: acceptable.length > 0,
    anchorMargin: round2(anchorMargin),
    // propose the cheapest acceptable lab as the sourcing constraint
    constraint: acceptable.length
      ? { supplier: acceptable[0].supplier, cost: round2(acceptable[0].cost), margin: round2(marginAt(enteredPriceUSD, acceptable[0].cost)) }
      : null,
    acceptableSuppliers: acceptable.map((s) => ({ supplier: s.supplier, cost: round2(s.cost), margin: round2(marginAt(enteredPriceUSD, s.cost)) })),
    message: acceptable.length
      ? `At $${enteredPriceUSD}, source only from ${acceptable[0].supplier} (or cheaper). Confirm?`
      : `At $${enteredPriceUSD} no approved supplier clears ${Math.round(o.minMargin * 100)}% margin — price is a loss.`,
  };
}

// Retail price derived from a wholesale price. markup: {type:'pct'|'flat', value}
export function retailFrom(wholesaleUSD: number, markup?: Markup | null): number {
  if (!markup) return wholesaleUSD;
  if (markup.type === "flat") return round2(wholesaleUSD + markup.value);
  // default percentage markup (value 100 => +100% => 2x)
  return round2(wholesaleUSD * (1 + (markup.value || 0) / 100));
}

export interface LadderRung {
  key: string;
  priceUSD: number | null;
}

/**
 * Gap-smoothing across an ordered ladder of prices (e.g. one treatment column
 * ordered worst->best tier, or one tier across material indices).
 * Enforces non-decreasing order (better never cheaper than lesser) and tidy
 * rounding. Operates on an array of {key, priceUSD}; returns adjusted copy.
 * Adjustments only ever raise a price (never below its own floor).
 */
export function smoothLadder(rungs: LadderRung[], opts?: EngineOptions): LadderRung[] {
  const o = withDefaults(opts);
  const out = rungs.map((r) => ({ ...r }));
  let prev = -Infinity;
  for (const r of out) {
    if (r.priceUSD == null) continue;
    let p = r.priceUSD;
    if (p < prev) p = prev; // no inversion: never cheaper than a lesser lens
    p = ceilTo(p, o.rounding);
    r.priceUSD = round2(p);
    prev = r.priceUSD;
  }
  return out;
}

// ── Matrix-wide pricing pass ────────────────────────────────────────────
// Ported from pricelist-automation/pricing-api.js's pricedMatrix(). Prices
// every combo, then within each treatment+tier group (sorted by material
// index order) re-applies smoothLadder so a better material is never
// cheaper than a lesser one. Per-item supplier exclusion (BS1-02) is
// expected to already be baked into each combo's `suppliers` map by
// whoever builds the Combo list (combos.ts) — unlike the local tool, there
// is no separate `disabled` overrides layer here.
const MATERIAL_ORDER = ["1.50", "1.56", "TRIVEX", "POLY", "1.60", "1.67", "1.74", "1.59", "GLASS"];
function materialIndex(m: string | undefined): number {
  const i = MATERIAL_ORDER.indexOf(m || "");
  return i < 0 ? 99 : i;
}

export type PricedRow = StandardPriceResult & {
  treatment?: string;
  tier?: string;
  material?: string;
  retailUSD?: number;
  smoothed?: boolean;
};

export function pricedMatrix(combos: Combo[], settings?: EngineOptions): PricedRow[] {
  const s = settings || {};

  const priced: PricedRow[] = combos.map((c) => {
    const sp = standardPrice(c, s);
    if (!sp.available) return { key: c.key, treatment: c.treatment, tier: c.tier, material: c.material, available: false };
    const retailUSD = retailFrom(sp.priceUSD!, s.markup);
    return { key: c.key, treatment: c.treatment, tier: c.tier, material: c.material, ...sp, retailUSD };
  });

  if (s.smooth === false) return priced;

  const groups: Record<string, PricedRow[]> = {};
  for (const p of priced) {
    if (!p.available) continue;
    const g = `${p.treatment}||${p.tier}`;
    (groups[g] = groups[g] || []).push(p);
  }
  for (const g of Object.values(groups)) {
    g.sort((a, b) => materialIndex(a.material) - materialIndex(b.material));
    const smoothed = smoothLadder(g.map((p) => ({ key: p.key!, priceUSD: p.priceUSD ?? null })), s);
    const byKey = Object.fromEntries(smoothed.map((r) => [r.key, r.priceUSD]));
    for (const p of g) {
      const newPrice = byKey[p.key!];
      if (newPrice != null && newPrice !== p.priceUSD) {
        p.priceUSD = newPrice;
        p.smoothed = true;
        p.floorMargin = marginAt(p.priceUSD, p.anchorCost!);
        p.preferredMargin = marginAt(p.priceUSD, p.preferredCost!);
        p.retailUSD = retailFrom(p.priceUSD, s.markup);
      }
    }
  }
  return priced;
}
