// Characterisation of domain/price.ts against the engine's price(): the same
// seeded orders are entered through the real engine and priced by the pure
// module; every quote line (label, detail, amount, eye) must match, and so must
// the total. Surcharge values come from DEFAULT_SURCHARGE_RULES, the same
// numbers seeded into rx_surcharge_rules — so a rule change that moves the form
// price is a deliberate edit to the table, not a code change.
import { beforeEach, describe, expect, it } from "vitest";
import {
  COLOURS, DESIGNS, MATERIALS, RX_TEST_DATA, TREATMENTS, mountRxOrder, testLensPrice,
} from "@/tests/support/rxOrderHarness";
import {
  DEFAULT_SURCHARGE_RULES, priceOrder, surchargeRuleFromRow, type PriceInput, type PriceSide,
} from "@/features/rx-order/domain/price";

const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SEED = 20261002;
const rng = mulberry32(SEED);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

const sideFor = (m: string, d: string, c: string): PriceSide => {
  const mat = RX_TEST_DATA.materials.find((x) => x.id === m);
  const des = RX_TEST_DATA.designs.find((x) => x.id === d);
  const col = RX_TEST_DATA.colours.find((x) => x.id === c);
  return {
    // A side the engine could not resolve (a repaired-away pick) is incomplete.
    complete: !!(mat && des && col),
    materialName: mat?.n ?? "", designName: des?.n ?? "", colourName: col?.n ?? "",
    materialUp: mat?.up ?? 0, designBase: des?.base ?? 0, colourUp: col?.up ?? 0,
    quoted: testLensPrice(m, d, c),
    hasPriceSource: true,
  };
};

describe("priceOrder (matches the engine's price())", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("14 seeded orders price line for line the same", () => {
    const mismatches: string[] = [];
    let ready = 0;
    let withSurcharge = 0;
    for (let n = 1; n <= 14; n++) {
      const eyes = pick(["pair", "pair", "od", "os"] as const);
      const vision = pick(["sv", "sv", "mf"] as const);
      const split = eyes === "pair" && vision === "sv" && rng() < 0.4;
      const design = vision === "mf" ? DESIGNS.prog : DESIGNS.sv;
      const lens = { m: pick(Object.values(MATERIALS)), d: design, c: pick([COLOURS.clear, COLOURS.clear, COLOURS.photo, COLOURS.amber]) };
      const lensOs = split ? { m: pick(Object.values(MATERIALS)), d: design, c: COLOURS.clear } : null;
      const treatments = pick([[], [TREATMENTS.superAr], [TREATMENTS.hardCoat, TREATMENTS.tintSolid], [TREATMENTS.superAr, TREATMENTS.tintSolid]]);
      const scope = pick(["uncut", "remote", "glaze"] as const);
      const mount = pick(["plastic", "metal", "grooved", "rimless"] as const);
      const service = pick(["std", "pri"] as const);
      const prism = pick(["", "", "2.5", "1"]);
      const sph = pick(["-2.00", "+7.25", "-6.50", "+1.00"]);
      const diam = pick(["auto", "75", "80", "70"]);

      const h = mountRxOrder();
      h.segment("eyeSeg", "eyes", eyes);
      h.segment("visionSeg", "vision", vision);
      h.segment("scopeSeg", "scope", scope);
      h.set("#mount", mount);
      h.set("#service", service);
      h.set("#diam", diam);
      if (split) h.setSplit(true);
      h.selectLens(lens);
      if (lensOs) h.selectLensOs(lensOs);
      for (const e of eyes === "pair" ? (["od", "os"] as const) : [eyes]) {
        h.setRx(e, { sph, pd: "31", ...(vision === "mf" ? { add: "2", ht: "20" } : {}), ...(prism ? { prism, base: "OUT" } : {}) });
      }
      for (const t of treatments) h.toggleTreatment(t);
      if (treatments.includes(TREATMENTS.tintSolid) && rng() < 0.5) h.state.tintCfg.match = true;
      h.engine.refreshData();

      const payload = h.engine.getPayload();
      const rate = payload.quote.rate;
      const tag = `#${n} ${eyes}/${vision}${split ? "/split" : ""} ${scope}/${mount} ${service} ${diam}`;

      const input: PriceInput = {
        eyes: payload.job.eyes,
        split: !!payload.split,
        sides: { a: sideFor(payload.lens.material, payload.lens.design, payload.lens.colour),
          ...(payload.lensOs ? { b: sideFor(payload.lensOs.material, payload.lensOs.design, payload.lensOs.colour) } : {}) },
        treatments: (payload.treatments as string[]).map((id) => {
          const t = RX_TEST_DATA.treatments.find((x) => x.id === id)!;
          return { id, name: t.n, category: t.c, price: t.p, isTint: /^tn-/.test(id), isGradientTint: /grad/.test(id) };
        }),
        tint: payload.tintConfig ? { colour: payload.tintConfig.colour, density: payload.tintConfig.density,
          gradTop: payload.tintConfig.gradTop, gradBottom: payload.tintConfig.gradBottom, match: !!payload.tintConfig.match } : null,
        rx: Object.fromEntries(Object.entries(payload.rx).map(([e, r]: [string, any]) => [e, { sph: r.sph, prism: r.prism }])),
        diameter: payload.lens.diameter,
        scope: payload.job.scope,
        mount: payload.frame.mount,
        service: payload.delivery.service,
      };
      const domain = priceOrder(input);
      if (domain.ready) ready++;
      if (domain.lines.some((l) => l.surcharge)) withSurcharge++;

      const engineLines = (payload.quote.lines as any[]).map((l) => `${l.label} | ${l.detail} | ${l.amount} | ${l.eye ?? ""}`);
      const domainLines = domain.lines.map((l) => `${l.n} | ${l.i} | ${+(l.v * rate).toFixed(2)} | ${l.eye ?? ""}`);
      if (JSON.stringify(engineLines) !== JSON.stringify(domainLines)) {
        mismatches.push(`${tag} LINES\n  engine: ${engineLines.join(" ; ")}\n  domain: ${domainLines.join(" ; ")}`);
      }
      const engineTotal = payload.quote.total;
      const domainTotal = +(domain.sub * rate).toFixed(2);
      if (Math.abs(engineTotal - domainTotal) > 0.011) mismatches.push(`${tag} TOTAL engine ${engineTotal} domain ${domainTotal}`);
      h.destroy();
    }
    expect(mismatches, `seed ${SEED}\n${mismatches.join("\n")}`).toEqual([]);
    // the comparison is only meaningful if the batch really priced orders
    expect(ready).toBeGreaterThanOrEqual(9);
    expect(withSurcharge).toBeGreaterThanOrEqual(4);
  }, 120_000);
});

describe("priceOrder is driven by the surcharge rules", () => {
  const base = (over: Partial<PriceInput> = {}): PriceInput => ({
    eyes: "pair", split: false,
    sides: { a: sideFor(MATERIALS.plastic, DESIGNS.sv, COLOURS.clear) },
    treatments: [], tint: null,
    rx: { od: { sph: -2, prism: 3 }, os: { sph: -2, prism: null } },
    diameter: 70, scope: "uncut", mount: "plastic", service: "std",
    ...over,
  });

  it("charges prism at the rule's base plus per-diopter", () => {
    const out = priceOrder(base());
    expect(out.lines.find((l) => l.n === "Prism")?.v).toBe(16 + 3 * 4);
  });

  it("follows an edited rule and drops an inactive one", () => {
    const edited = DEFAULT_SURCHARGE_RULES.map((r) => (r.code === "prism" ? { ...r, amount: 20, unitAmount: 5 } : r));
    expect(priceOrder(base({ rules: edited })).lines.find((l) => l.n === "Prism")?.v).toBe(35);
    const off = DEFAULT_SURCHARGE_RULES.map((r) => (r.code === "prism" ? { ...r, active: false } : r));
    expect(priceOrder(base({ rules: off })).lines.some((l) => l.n === "Prism")).toBe(false);
  });

  it("builds a rule from a database row", () => {
    expect(surchargeRuleFromRow({ code: "high_power", basis: "flat", amount: "18", unit_amount: "0", threshold: "6", per_eye: false, active: true }))
      .toMatchObject({ code: "high_power", amount: 18, threshold: 6, active: true });
  });

  it("charges a single-eye job a share of the pair and adds priority on top of that", () => {
    const out = priceOrder(base({ eyes: "od", service: "pri", rx: { od: { sph: -2, prism: null } } }));
    const lens = out.lines.find((l) => l.lens)!;
    expect(lens.v).toBeCloseTo(278.25 * 0.55, 6);
    expect(out.lines.at(-1)!.n).toBe("Priority service");
    expect(out.sub).toBeCloseTo(278.25 * 0.55 * 1.15, 6);
  });

  it("is not ready until every lens is chosen, and flags an unpriced lens as unpriced, not free", () => {
    const incomplete = { ...sideFor(MATERIALS.plastic, DESIGNS.sv, COLOURS.clear), complete: false };
    expect(priceOrder(base({ sides: { a: incomplete } })).ready).toBe(false);
    const amber = priceOrder(base({ sides: { a: sideFor(MATERIALS.plastic, DESIGNS.sv, COLOURS.amber) } }));
    expect(amber.unpriced).toBe(true);
    expect(amber.lines.find((l) => l.lens)).toMatchObject({ v: 0, unpriced: true });
  });
});
