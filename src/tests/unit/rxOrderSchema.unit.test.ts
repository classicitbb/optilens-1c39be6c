import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RX_ORDER_SCHEMA_V2, rxOrderV2Schema, upgradeV1 } from "@/features/rx-order/domain/schema";

const v1 = (over: Record<string, any> = {}) => ({
  schema: "cv.rxorder/1",
  orderNo: "80000012",
  createdAt: "2026-10-01T10:00:00.000Z",
  account: { id: 776, name: "Retail", currency: "BBD", pricesVisible: true },
  reference: "PO-9",
  patient: { first: "Ann", last: "Lee" },
  job: { scope: "glaze", eyes: "pair", vision: "mf", purpose: "dist" },
  frame: { name: "Ray", mount: "plastic", source: "supplied", a: 52, b: 40, ed: 55, dbl: 18 },
  shape: null,
  lens: { material: "m1", design: "d1", colour: "c1", diameter: 70, corridor: "14", baseCurve: "" },
  split: false,
  lensOs: null,
  rx: {
    od: { sph: "-1.25", cyl: -0.5, axis: "90", add: 2, prism: 2, base: "out", pd: 31, npd: null, ht: "18" },
    os: { sph: -1.5, cyl: null, axis: null, add: 2, prism: null, base: "", pd: 31, npd: null, ht: 19 },
  },
  treatments: ["t1"],
  assistance: [],
  delivery: { service: "std", method: "Courier", notes: "n" },
  quote: { currency: "BBD", total: 10 },
  ...over,
});

describe("cv.rxorder/2 upgradeV1", () => {
  it("maps a v1 pair order forward, coercing form strings to numbers", () => {
    const o = upgradeV1(v1());
    expect(o.schema).toBe(RX_ORDER_SCHEMA_V2);
    expect(o.account).toMatchObject({ id: "776", name: "Retail" });
    expect(o.rx.od).toMatchObject({ sph: -1.25, axis: 90, prism: 2, base: "OUT", height: 18 });
    expect(o.rx.os?.height).toBe(19);
    // an unsplit pair repeats the lens on both sides
    expect(o.lens.od).toEqual(o.lens.os);
    expect(o.lens.advanced).toEqual({ diameter: 70, corridor: "14", baseCurve: "" });
  });

  it("keeps a split order's left lens", () => {
    const o = upgradeV1(v1({ split: true, lensOs: { material: "m2", design: "d1", colour: "c1" } }));
    expect(o.lens.od?.material).toBe("m1");
    expect(o.lens.os?.material).toBe("m2");
  });

  it("leaves the unordered eye out of a single-eye order", () => {
    const o = upgradeV1(v1({ job: { scope: "glaze", eyes: "os", vision: "sv", purpose: "dist" } }));
    expect(o.lens.od).toBeNull();
    expect(o.lens.os).not.toBeNull();
    expect(o.rx.od).toBeUndefined();
    expect(o.rx.os).toBeDefined();
  });

  it("is idempotent and round-trips through the schema", () => {
    const once = upgradeV1(v1(), { source: "portal" });
    expect(once.source).toBe("portal");
    expect(upgradeV1(once)).toEqual(once);
    expect(rxOrderV2Schema.safeParse(once).success).toBe(true);
  });

  it("rejects data that cannot be a valid order", () => {
    expect(() => upgradeV1(v1({ patient: undefined, job: { eyes: "pair" }, rx: { od: { sph: "abc" } } }))).not.toThrow();
    expect(rxOrderV2Schema.safeParse({ schema: "cv.rxorder/2" }).success).toBe(false);
  });

  it("is mirrored for edge functions, differing only in the zod import", () => {
    const strip = (s: string) => s.replace(/^import \{ z \} from .*$/m, "").replace(/\r\n/g, "\n");
    const web = readFileSync("src/features/rx-order/domain/schema.ts", "utf8");
    const edge = readFileSync("supabase/functions/_shared/rx-order/schema.ts", "utf8");
    expect(edge).toContain('import { z } from "npm:zod@^4.4.3";');
    expect(strip(edge)).toBe(strip(web));
  });
});
