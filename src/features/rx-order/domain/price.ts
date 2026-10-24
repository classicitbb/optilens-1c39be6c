// Rx order pricing — ported from the engine's price(). Pure: everything it
// needs comes in as data, so the same function can price in the browser and, in
// an edge check, on the server (the two cannot drift because they are one
// module). Surcharge amounts are NOT hard-coded here: they come from the
// rx_surcharge_rules table, with DEFAULT_SURCHARGE_RULES (the seeded values) as
// the fallback when a form runs without them (the dev bench, tests).
//
// Amounts are in BBD; the form converts for display. Money is not rounded here
// — callers round per line when they persist (see persistPayload).
import type { Eye } from "./validate";

export type SurchargeBasis = "flat" | "flat_plus_unit" | "tiered" | "percent" | "multiplier";

export interface SurchargeRule {
  code: string;
  basis: SurchargeBasis;
  amount: number;
  unitAmount: number;
  threshold: number | null;
  tier2Threshold: number | null;
  tier2Amount: number | null;
  perEye: boolean;
  active: boolean;
}

const rule = (
  code: string, basis: SurchargeBasis, amount: number,
  o: Partial<Omit<SurchargeRule, "code" | "basis" | "amount">> = {},
): SurchargeRule => ({
  code, basis, amount, unitAmount: 0, threshold: null, tier2Threshold: null, tier2Amount: null,
  perEye: false, active: true, ...o,
});

/** The values seeded into rx_surcharge_rules (migration 20261001130300). */
export const DEFAULT_SURCHARGE_RULES: readonly SurchargeRule[] = [
  rule("prism", "flat_plus_unit", 16, { unitAmount: 4, threshold: 0 }),
  rule("oversize_blank", "tiered", 22, { threshold: 75, tier2Threshold: 80, tier2Amount: 32, perEye: true }),
  rule("high_power", "flat", 18, { threshold: 6 }),
  rule("glazing_standard", "flat", 17),
  rule("glazing_grooved", "flat", 31),
  rule("glazing_rimless", "flat", 42),
  rule("remote_edge", "flat", 6),
  rule("tint_match", "flat", 9, { perEye: true }),
  rule("priority_service", "percent", 15),
  rule("single_eye", "multiplier", 0.55),
];

/** Map a rx_surcharge_rules row (snake_case) to a SurchargeRule. */
export const surchargeRuleFromRow = (r: Record<string, any>): SurchargeRule => ({
  code: String(r.code),
  basis: r.basis,
  amount: Number(r.amount ?? 0),
  unitAmount: Number(r.unit_amount ?? 0),
  threshold: r.threshold == null ? null : Number(r.threshold),
  tier2Threshold: r.tier2_threshold == null ? null : Number(r.tier2_threshold),
  tier2Amount: r.tier2_amount == null ? null : Number(r.tier2_amount),
  perEye: !!r.per_eye,
  active: r.active !== false,
});

export interface PriceSide {
  /** The lens is fully chosen (material, design and colour). */
  complete: boolean;
  materialName: string;
  designName: string;
  colourName: string;
  /** Material upcharge / design base — used only when no price source answers. */
  materialUp: number;
  designBase: number;
  /** Colour upcharge over Clear. */
  colourUp: number;
  /**
   * What the account's pricelist says for this exact combination. `null` means
   * "not offered on this account" — not free. `undefined` means there is no
   * price source at all (the standalone prototype), so base + upcharge applies.
   */
  quoted: number | null | undefined;
  /** A price source exists (an adapter answered, even with null). */
  hasPriceSource: boolean;
}

export interface PriceTreatment {
  id: string;
  name: string;
  /** Category shown as the line detail. */
  category: string;
  price: number;
  /** A tint (id starts "tn-"): its detail is the tint configuration. */
  isTint: boolean;
  isGradientTint: boolean;
}

export interface TintConfig {
  colour: string;
  density: number;
  gradTop: number;
  gradBottom: number;
  match: boolean;
}

export interface PriceInput {
  eyes: "pair" | "od" | "os";
  split: boolean;
  /** Side "a" is the right / shared lens; "b" exists only on a split pair. */
  sides: { a: PriceSide; b?: PriceSide };
  treatments: PriceTreatment[];
  tint: TintConfig | null;
  rx: Partial<Record<Eye, { sph: number | null; prism: number | null }>>;
  diameter: number;
  scope: "uncut" | "remote" | "glaze";
  mount: string;
  service: string;
  rules?: readonly SurchargeRule[];
}

export interface QuoteLine {
  /** Label. */
  n: string;
  /** Detail. */
  i: string;
  /** Value in BBD. */
  v: number;
  unpriced?: boolean;
  eye?: Eye;
  /** The lens itself — not removable from the quote. */
  lens?: boolean;
  /** Which treatment a line belongs to, so the form can offer to remove it. */
  treatmentId?: string;
  /** The surcharge rule a line came from. */
  surcharge?: string;
}

export interface PriceResult {
  lines: QuoteLine[];
  sub: number;
  ready: boolean;
  unpriced: boolean;
}

const eyeLabel = (e: Eye) => (e === "od" ? "OD" : "OS");

export function priceOrder(input: PriceInput): PriceResult {
  const rules = new Map((input.rules ?? DEFAULT_SURCHARGE_RULES).map((r) => [r.code, r]));
  const amountOf = (code: string, fallback: number) => {
    const r = rules.get(code);
    return r && r.active ? r.amount : fallback;
  };
  const ruleOf = (code: string) => {
    const r = rules.get(code);
    return r && r.active ? r : null;
  };

  const lines: QuoteLine[] = [];
  const sides = input.split && input.sides.b ? [input.sides.a, input.sides.b] : [input.sides.a];
  if (!sides.every((s) => s.complete)) return { lines, sub: 0, ready: false, unpriced: false };

  const activeEyes: Eye[] = input.eyes === "pair" ? ["od", "os"] : [input.eyes];
  const split = input.split && input.eyes === "pair";
  let unpriced = false;

  // A split pair is two half-pairs: each side is charged half of ITS OWN pair
  // price (ratified 2026-08-25), so a split of two identical lenses costs the
  // same as the unsplit pair.
  sides.forEach((side, idx) => {
    const quoted = side.quoted;
    const sideUnpriced = side.hasPriceSource && quoted == null;
    if (sideUnpriced) unpriced = true;
    const pricedEyes: Eye[] = split ? [idx === 0 ? "od" : "os"] : input.eyes === "pair" ? ["od", "os"] : [activeEyes[0]];
    const share = split || pricedEyes.length === 2 ? 0.5 : 1;
    for (const eye of pricedEyes) {
      const label = eyeLabel(eye);
      lines.push({
        n: `${label} ${side.designName}`,
        i: `${label} · ${side.materialName} · ${side.colourName}`,
        v: sideUnpriced ? 0 : (quoted ?? side.designBase + side.materialUp) * share,
        unpriced: sideUnpriced,
        eye,
        lens: true,
      });
      if (side.colourUp) {
        lines.push({
          n: `${label} ${side.colourName}`,
          i: "Extra over Clear · same material & design",
          v: side.colourUp * share,
          eye,
        });
      }
    }
  });

  // Coatings, tints and the oversize blank apply to each physical lens — one
  // line per eye at half the pair price, so the total is unchanged.
  const eyesForAddon: Eye[] = input.eyes === "pair" ? ["od", "os"] : [activeEyes[0]];
  const addonShare = eyesForAddon.length === 2 ? 0.5 : 1;
  const tintMatch = amountOf("tint_match", 9);
  for (const t of input.treatments) {
    let detail = t.category;
    if (t.isTint && input.tint) {
      detail = input.tint.colour + (t.isGradientTint
        ? ` · ${input.tint.gradTop}→${input.tint.gradBottom}%`
        : ` · ${input.tint.density}%`);
    }
    const value = (t.price + (t.isTint && input.tint?.match ? tintMatch : 0)) * addonShare;
    for (const eye of eyesForAddon) {
      lines.push({ n: `${eyeLabel(eye)} ${t.name}`, i: detail, v: value, eye, treatmentId: t.id });
    }
  }

  const prism = Math.max(...activeEyes.map((e) => input.rx[e]?.prism || 0), 0);
  const prismRule = ruleOf("prism");
  if (prism > 0 && prismRule) {
    lines.push({
      n: "Prism", i: `${prism.toFixed(2)}Δ ground in`,
      v: prismRule.amount + prism * prismRule.unitAmount, surcharge: "prism",
    });
  }

  const oversize = ruleOf("oversize_blank");
  if (oversize && oversize.threshold !== null && input.diameter >= oversize.threshold) {
    const tier2 = oversize.tier2Threshold !== null && input.diameter >= oversize.tier2Threshold;
    const blank = (tier2 ? oversize.tier2Amount ?? oversize.amount : oversize.amount) * addonShare;
    for (const eye of eyesForAddon) {
      lines.push({ n: `${eyeLabel(eye)} Oversize blank`, i: `${input.diameter} mm`, v: blank, eye, surcharge: "oversize_blank" });
    }
  }

  const highest = Math.max(...activeEyes.map((e) => Math.abs(input.rx[e]?.sph || 0)), 0);
  const highPower = ruleOf("high_power");
  if (highPower && highest > (highPower.threshold ?? 6)) {
    lines.push({ n: "High-power surfacing", i: "beyond ±6.00", v: highPower.amount, surcharge: "high_power" });
  }

  if (input.scope !== "uncut") {
    const mountCode = input.mount === "rimless" ? "glazing_rimless" : input.mount === "grooved" ? "glazing_grooved" : "glazing_standard";
    const base = amountOf(mountCode, input.mount === "rimless" ? 42 : input.mount === "grooved" ? 31 : 17);
    const remote = input.scope === "remote";
    lines.push({
      n: remote ? "Remote edge to trace" : "Glazing & mounting",
      i: input.mount === "rimless" ? "Rimless drill mount"
        : input.mount === "grooved" ? "Grooved / nylon"
        : input.mount === "metal" ? "Metal" : "Plastic",
      v: remote ? base + amountOf("remote_edge", 6) : base,
      surcharge: remote ? "remote_edge" : mountCode,
    });
  }

  let sub = lines.reduce((a, l) => a + l.v, 0);
  // A one-eye job is charged a share of the pair.
  const singleEye = ruleOf("single_eye");
  if (input.eyes !== "pair" && singleEye) {
    const factor = singleEye.amount;
    sub *= factor;
    lines.forEach((l) => { l.v *= factor; });
  }
  const priority = ruleOf("priority_service");
  if (input.service === "pri" && priority) {
    const fee = sub * (priority.amount / 100);
    lines.push({ n: "Priority service", i: "3 working days", v: fee, surcharge: "priority_service" });
    sub += fee;
  }
  return { lines, sub, ready: true, unpriced };
}
