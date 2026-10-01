// Characterisation of the Phase 1a domain modules against the engine they were
// ported from. The engine (rx-order-engine.js) stays the reference until the
// React form replaces it; every case here drives the REAL engine through the
// harness and asserts the pure functions in features/rx-order/domain agree —
// normalised values, validation errors, warnings and prompts, compared as the
// exact strings a person would read.
//
// Inputs are seeded random, including deliberate junk ("abc", "1.25-", "99"),
// so a divergence reproduces exactly from the seed in the failure message.
import { beforeEach, describe, expect, it } from "vitest";
import { COLOURS, DESIGNS, MATERIALS, mountRxOrder, type Eye } from "@/tests/support/rxOrderHarness";
import { parseNum, roundQuarter, signed } from "@/features/rx-order/domain/parse";
import { normaliseRxField, transposePlusCyl, type RxField } from "@/features/rx-order/domain/normalise";
import {
  frameLimitErrors,
  rxErrors,
  rxPrompts,
  rxRules,
  rxSectionComplete,
  rxWarnings,
  type RxEyeValues,
} from "@/features/rx-order/domain/validate";

const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SEED = 20261001;
const rng = mulberry32(SEED);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];

describe("parse (reads like the engine)", () => {
  it.each([
    ["125", true, 1.25], ["-250", true, -2.5], ["+1.5", true, 1.5], ["1.25-", true, -1.25],
    ["- 0.5", true, -0.5], ["99", true, 99], ["125", false, 125], ["2.37", true, 2.37],
    ["abc", true, null], ["", true, null], ["  ", false, null], ["0", true, 0], ["2600", true, 2600],
  ])("parseNum(%j, shorthand=%j) → %j", (raw, shorthand, expected) => {
    expect(parseNum(raw, shorthand as boolean)).toBe(expected);
  });

  it("steps and signs", () => {
    expect(roundQuarter(1.12)).toBe(1);
    expect(roundQuarter(1.13)).toBe(1.25);
    expect(signed(0)).toBe("+0.00");
    expect(signed(-0.5)).toBe("-0.50");
  });
});

describe("normalise (matches the engine field by field)", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  const RAW: Record<Exclude<RxField, never>, string[]> = {
    sph: ["-2", "125", "-250", "+1.37", "abc", "-30", "20", "0", "1.25-", "99", "-2.62"],
    cyl: ["-0.75", "+0.75", "75", "3.1", "abc", "-8.5", "0"],
    axis: ["90", "0", "181", "270", "-10", "1.6", "abc", "180"],
    add: ["2", "0.1", "5", "225", "-1.5", "abc", "4.5"],
    prism: ["2", "0.3", "-1", "abc", "12.6"],
    pd: ["31", "31.2", "62", "63", "64.4", "46", "44.9", "abc", "-31"],
    npd: ["29", "28.7", "58", "abc"],
    ht: ["18", "17.6", "22.2", "-20", "abc"],
  };

  it("every field × raw value agrees with the engine", () => {
    const h = mountRxOrder();
    const mismatches: string[] = [];
    for (const [field, raws] of Object.entries(RAW) as [RxField, string[]][]) {
      for (const raw of raws) {
        for (const eye of ["od", "os"] as Eye[]) h.rxCell(eye, field)!.value = "";
        h.setRx("od", { [field]: raw });
        // The engine normalises when the field loses focus (a capturing document listener).
        h.rxCell("od", field)!.dispatchEvent(new Event("blur"));
        const engineOd = h.rxCell("od", field)!.value;
        const engineOs = h.rxCell("os", field)!.value;

        const domain = normaliseRxField(field, raw);
        const wantOd = domain === null ? raw : domain.value;
        const wantOs = domain?.splitBoth ? domain.splitBoth.half : "";
        if (engineOd !== wantOd || engineOs !== wantOs) {
          mismatches.push(`${field} "${raw}": engine od="${engineOd}" os="${engineOs}", domain od="${wantOd}" os="${wantOs}"`);
        }
      }
    }
    h.destroy();
    expect(mismatches, `seed ${SEED}\n${mismatches.join("\n")}`).toEqual([]);
  }, 120_000);

  it("plus-cylinder transposition", () => {
    expect(transposePlusCyl(-2, 1, 90)).toEqual({ sph: "-1.00", cyl: "-1.00", axis: "180" });
    expect(transposePlusCyl(1.25, 0.75, 45)).toEqual({ sph: "+2.00", cyl: "-0.75", axis: "135" });
    expect(transposePlusCyl(0, 1, 100)).toEqual({ sph: "+1.00", cyl: "-1.00", axis: "10" });
    expect(transposePlusCyl(null, 1, 90)).toBeNull();
  });
});

describe("validate (matches the engine's errors, warnings and prompts)", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  const POOL: Record<RxField, string[]> = {
    sph: ["-2.00", "+1.25", "-26", "19", "", "+3.00", "-3.50"],
    cyl: ["", "-0.75", "-9", "-1.50", "0"],
    axis: ["", "90", "181", "45", "0"],
    add: ["", "+2.00", "+0.25", "5", "0.1"],
    prism: ["", "2", "11", "0"],
    pd: ["", "32", "19", "46", "30.5"],
    npd: ["", "29", "17", "31", "28"],
    ht: ["", "18", "13", "36", "40", "11"],
  };
  const BASES = ["", "IN", "OUT", "UP"];
  const FRAME_B = ["38", "20", "17", "45"];

  const rowsOf = (payloadRx: Record<string, any>): Partial<Record<Eye, RxEyeValues>> =>
    Object.fromEntries(Object.entries(payloadRx).map(([eye, r]: [string, any]) => [eye, {
      sph: r.sph ?? null, cyl: r.cyl ?? null, axis: r.axis ?? null, add: r.add ?? null,
      prism: r.prism ?? null, base: r.base ?? "", pd: r.pd ?? null, npd: r.npd ?? null, ht: r.ht ?? null,
    }])) as any;

  it("16 seeded scenarios, junk included, produce identical verdicts", () => {
    const mismatches: string[] = [];
    for (let n = 1; n <= 16; n++) {
      const eyes = pick(["pair", "pair", "od", "os"] as const);
      const vision = pick(["sv", "sv", "mf"] as const);
      const purpose = vision === "sv" ? pick(["dist", "dist", "read", "inter"] as const) : "dist";
      const fb = pick(FRAME_B);
      const h = mountRxOrder();
      h.segment("eyeSeg", "eyes", eyes);
      h.segment("visionSeg", "vision", vision);
      if (vision === "sv") h.segment("purposeSeg", "purpose", purpose);
      h.set("#fb", fb);
      h.selectLens({ m: MATERIALS.plastic, d: vision === "mf" ? DESIGNS.prog : DESIGNS.sv, c: COLOURS.clear });
      const active: Eye[] = eyes === "pair" ? ["od", "os"] : [eyes];
      for (const e of active) {
        const values: Partial<Record<RxField, string>> = {};
        (Object.keys(POOL) as RxField[]).forEach((f) => { values[f] = pick(POOL[f]); });
        h.setRx(e, { ...values, base: pick(BASES) });
      }

      const payload = h.engine.getPayload();
      const rows = rowsOf(payload.rx);
      const rules = rxRules({
        eyes: payload.job.eyes, vision: payload.job.vision, purpose: payload.job.purpose,
        isProg: vision === "mf", frameB: payload.frame.b,
      });
      const tag = `#${n} ${eyes}/${vision}/${purpose} B=${fb}`;

      const engineErrors = h.rxErrors();
      const domainErrors = rxErrors(rows, rules).map((i) => i.text);
      if (JSON.stringify(engineErrors) !== JSON.stringify(domainErrors)) {
        mismatches.push(`${tag} ERRORS\n  engine: ${JSON.stringify(engineErrors)}\n  domain: ${JSON.stringify(domainErrors)}`);
      }

      const engineWarnings = h.rxWarnings();
      const domainWarnings = rxWarnings(rows, rules).map((w) => w.text);
      if (JSON.stringify(engineWarnings) !== JSON.stringify(domainWarnings)) {
        mismatches.push(`${tag} WARNINGS\n  engine: ${JSON.stringify(engineWarnings)}\n  domain: ${JSON.stringify(domainWarnings)}`);
      }

      const enginePrompts = Array.from(h.host.querySelectorAll("#rxPrompts .prompt span:nth-child(2)")).map((s) => s.textContent?.trim());
      const domainPrompts = rxPrompts(rows, rules).map((p) => p.text);
      if (JSON.stringify(enginePrompts) !== JSON.stringify(domainPrompts)) {
        mismatches.push(`${tag} PROMPTS\n  engine: ${JSON.stringify(enginePrompts)}\n  domain: ${JSON.stringify(domainPrompts)}`);
      }

      // The card is only "complete" when nothing blocks it.
      if (rxSectionComplete(rows, rules) && domainErrors.length) mismatches.push(`${tag} complete despite errors`);
      h.destroy();
    }
    expect(mismatches, `seed ${SEED}\n${mismatches.join("\n")}`).toEqual([]);
  }, 120_000);

  it("a complete single-vision prescription is complete; a missing PD is not", () => {
    const eye = (o: Partial<RxEyeValues> = {}): RxEyeValues => ({
      sph: -2, cyl: -0.75, axis: 90, add: null, prism: null, base: "", pd: 32, npd: null, ht: 22, ...o,
    });
    const rules = rxRules({ eyes: "pair", vision: "sv", purpose: "dist" });
    expect(rxSectionComplete({ od: eye(), os: eye() }, rules)).toBe(true);
    expect(rxSectionComplete({ od: eye(), os: eye({ pd: null }) }, rules)).toBe(false);
    expect(rxSectionComplete({ od: eye() }, rules)).toBe(false); // OS missing on a pair
    expect(rxSectionComplete({ od: eye() }, rxRules({ eyes: "od", vision: "sv", purpose: "dist" }))).toBe(true);
  });

  it("the height range depends on the lens: 12 for a bifocal, 14 for a progressive", () => {
    const eye = (ht: number): RxEyeValues => ({ sph: -1, cyl: null, axis: null, add: 2, prism: null, base: "", pd: 31, npd: null, ht });
    const bifocal = rxRules({ eyes: "od", vision: "mf", purpose: "dist", isProg: false });
    const prog = rxRules({ eyes: "od", vision: "mf", purpose: "dist", isProg: true });
    expect(rxErrors({ od: eye(13) }, bifocal)).toEqual([]);
    expect(rxErrors({ od: eye(13) }, prog).map((i) => i.text)).toEqual(["OD fitting height must be 14–35 mm."]);
    expect(rxErrors({ od: eye(11) }, bifocal).map((i) => i.text)).toEqual(["OD segment height must be 12–35 mm."]);
  });
});

describe("frame limits", () => {
  it("flags oversize and non-positive measurements and an ED smaller than the box", () => {
    expect(frameLimitErrors({ a: 52, b: 38, ed: 55, dbl: 18 })).toEqual([]);
    expect(frameLimitErrors({ a: 80, b: 38, ed: 90, dbl: 18 }).map((i) => i.text)).toEqual([
      "A is 80.00 mm — the maximum we can cut is 78 mm.",
      "ED is 90.00 mm — the maximum we can cut is 88 mm.",
    ]);
    expect(frameLimitErrors({ a: 52, b: 38, ed: 0, dbl: 18 }).map((i) => i.text)).toContain("ED must be greater than zero.");
    expect(frameLimitErrors({ a: 52, b: 38, ed: 50, dbl: 18 }).map((i) => i.text)).toEqual([
      "ED 50.00 mm is smaller than the box — it can't be less than the larger of A and B.",
    ]);
    expect(frameLimitErrors({ a: null, b: null, ed: null, dbl: null })).toEqual([]);
  });
});
