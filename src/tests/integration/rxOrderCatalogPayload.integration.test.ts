// Phase 1a: the lens combination graph (domain/catalog.ts) and the v1 <-> v2
// payload bridge (domain/payload.ts), both checked against the real engine.
import { beforeEach, describe, expect, it } from "vitest";
import { COLOURS, DESIGNS, MATERIALS, RX_TEST_DATA, mountRxOrder } from "@/tests/support/rxOrderHarness";
import {
  comboOptions, repairTriple, splitLensesDuplicate, tripleComplete, type LensCatalog,
} from "@/features/rx-order/domain/catalog";
import { upgradeV1 } from "@/features/rx-order/domain/schema";
import { downgradeToV1 } from "@/features/rx-order/domain/payload";

const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SEED = 20261003;
const rng = mulberry32(SEED);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

const catalog: LensCatalog = {
  combos: RX_TEST_DATA.combos,
  designs: RX_TEST_DATA.designs.map((d) => ({ id: d.id, v: d.v as "sv" | "mf" })),
};

describe("catalog (matches the engine's repair)", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("repairs 30 seeded picks exactly as the engine does", () => {
    const mismatches: string[] = [];
    const mats = [...Object.values(MATERIALS), ""];
    const designs = [...Object.values(DESIGNS), ""];
    const cols = [...Object.values(COLOURS), ""];
    for (let n = 1; n <= 30; n++) {
      const vision = pick(["sv", "mf"] as const);
      const t = { m: pick(mats), d: pick(designs), c: pick(cols) };
      const h = mountRxOrder();
      h.segment("visionSeg", "vision", vision);
      h.state.m = t.m; h.state.d = t.d; h.state.c = t.c;
      h.engine.refreshData(); // runs the engine's repair()
      const engine = { m: h.state.m, d: h.state.d, c: h.state.c };
      const domain = repairTriple(catalog, vision, t).triple;
      if (JSON.stringify(engine) !== JSON.stringify(domain)) {
        mismatches.push(`#${n} ${vision} ${JSON.stringify(t)} engine ${JSON.stringify(engine)} domain ${JSON.stringify(domain)}`);
      }
      h.destroy();
    }
    expect(mismatches, `seed ${SEED}\n${mismatches.join("\n")}`).toEqual([]);
  }, 120_000);

  it("narrows each axis by the other two and names what a repair cleared", () => {
    // photochromic exists only on plastic/poly; with poly + progressive chosen, colours are clear/photo
    const o = comboOptions(catalog, "mf", { m: MATERIALS.poly, d: DESIGNS.prog, c: "" });
    expect(o.cols.sort()).toEqual([COLOURS.clear, COLOURS.photo].sort());
    expect(o.designs).toEqual([DESIGNS.prog]);
    // hi-index has no photochromic: colour is the oldest pick, so it is what goes
    const r = repairTriple(catalog, "mf", { m: MATERIALS.hi167, d: DESIGNS.prog, c: COLOURS.photo });
    expect(r).toEqual({ triple: { m: MATERIALS.hi167, d: DESIGNS.prog, c: "" }, cleared: "colour" });
    // a single-vision design is not valid on a multifocal job
    expect(repairTriple(catalog, "mf", { m: "", d: DESIGNS.sv, c: "" }).cleared).toBe("design");
    // nothing salvageable → everything cleared
    expect(repairTriple(catalog, "sv", { m: "nope", d: "nope", c: "nope" })).toEqual({
      triple: { m: "", d: "", c: "" }, cleared: "all",
    });
  });

  it("knows when a side is complete and when a split is a duplicate", () => {
    const a = { m: MATERIALS.plastic, d: DESIGNS.sv, c: COLOURS.clear };
    expect(tripleComplete(a)).toBe(true);
    expect(tripleComplete({ ...a, c: "" })).toBe(false);
    expect(splitLensesDuplicate(a, { ...a })).toBe(true);
    expect(splitLensesDuplicate(a, { ...a, m: MATERIALS.poly })).toBe(false);
    expect(splitLensesDuplicate(a, { ...a, c: "" })).toBe(false);
  });
});

describe("payload bridge (v1 -> v2 -> v1)", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  const KEYS = ["schema", "orderNo", "account", "reference", "patient", "job", "frame", "split", "lensOs", "treatments", "assistance", "delivery"] as const;

  it("round-trips real engine payloads and the engine can replay the result", () => {
    const failures: string[] = [];
    for (let n = 1; n <= 6; n++) {
      const eyes = pick(["pair", "pair", "od", "os"] as const);
      const vision = pick(["sv", "mf"] as const);
      const split = eyes === "pair" && vision === "sv" && rng() < 0.5;
      const h = mountRxOrder();
      h.segment("eyeSeg", "eyes", eyes);
      h.segment("visionSeg", "vision", vision);
      if (split) h.setSplit(true);
      h.fillValidOrder({
        lens: { m: MATERIALS.plastic, d: vision === "mf" ? DESIGNS.prog : DESIGNS.sv, c: COLOURS.clear },
        rx: Object.fromEntries((eyes === "pair" ? ["od", "os"] : [eyes]).map((e) => [e, vision === "mf" ? { add: "2", ht: "20", prism: "1.5", base: "IN" } : { prism: "2", base: "OUT" }])) as any,
      });
      if (split) h.selectLensOs({ m: MATERIALS.poly, d: DESIGNS.sv, c: COLOURS.clear });
      const v1 = h.engine.getPayload();
      h.destroy(); // the harness cannot hold two mounted engines at once
      const tag = `#${n} ${eyes}/${vision}${split ? "/split" : ""}`;

      const v2 = upgradeV1(v1);
      const back = downgradeToV1(v2) as any;

      for (const k of KEYS) {
        if (JSON.stringify(back[k]) !== JSON.stringify(v1[k] ?? null)) {
          failures.push(`${tag} ${k}: v1 ${JSON.stringify(v1[k])} back ${JSON.stringify(back[k])}`);
        }
      }
      // lens triple, advanced fields and every Rx cell survive
      if (JSON.stringify(back.lens) !== JSON.stringify({ ...v1.lens, diameter: v1.lens.diameter })) {
        failures.push(`${tag} lens: v1 ${JSON.stringify(v1.lens)} back ${JSON.stringify(back.lens)}`);
      }
      // Compare Rx cell by cell: the engine's own rows also carry a stray
      // "undefined" key (an input with no data-f), which v2 rightly drops.
      const CELLS = ["sph", "cyl", "axis", "add", "prism", "base", "pd", "npd", "ht"];
      for (const eye of ["od", "os"]) {
        const a = v1.rx[eye], b = back.rx[eye];
        if (!!a !== !!b) { failures.push(`${tag} rx.${eye} presence`); continue; }
        for (const cell of CELLS) if (a && a[cell] !== b[cell]) failures.push(`${tag} rx.${eye}.${cell}: ${a[cell]} -> ${b[cell]}`);
      }

      // and the engine accepts it back
      const h2 = mountRxOrder();
      h2.engine.restorePayload(back);
      const again = h2.engine.getPayload();
      if (JSON.stringify(again.rx) !== JSON.stringify(v1.rx) || JSON.stringify(again.lens) !== JSON.stringify(v1.lens)) {
        failures.push(`${tag} engine replay differs`);
      }
      h2.destroy();
    }
    expect(failures, `seed ${SEED}\n${failures.join("\n")}`).toEqual([]);
  }, 120_000);
});
