// domain/shape.ts against the engine's own shape handling. The engine loads each
// standard shape (a click on its tile) and the sample trace (through its file
// input, exactly as a customer would drop it); the pure module must produce the
// same outline, the same ED / axis / circumference at the typed A × B, and the
// same payload shape.
import { beforeEach, describe, expect, it } from "vitest";
import { mountRxOrder } from "@/tests/support/rxOrderHarness";
import {
  compactShape, hasOutline, parseOma, rejectTraceFile, shapeFromPayload, shapeGeometry, shapeToPayload,
} from "@/features/rx-order/domain/shape";
import { SAMPLE_OMA_1471, STD_SHAPES } from "@/features/rx-order/domain/standardShapes";

const near = (a: number, b: number, tol = 0.011) => Math.abs(a - b) <= tol;

describe("parseOma", () => {
  it("reads the header, both-sided blocks and angles from a real trace", () => {
    const s = parseOma(SAMPLE_OMA_1471)!;
    expect(hasOutline(s)).toBe(true);
    expect(s.job).toBeTruthy();
    expect(s.hbox).toBeGreaterThan(30);
    expect(s.vbox).toBeGreaterThan(20);
    expect(s.points.R.length).toBeGreaterThan(100);
    // this trace carries no explicit angles: they are evenly spaced around the box
    expect(s.angles.R.length === 0 || s.angles.R.length === s.points.R.length).toBe(true);
  });

  it("synthesises the missing side and marks it mirrored; keeps a genuine side as is", () => {
    const one = parseOma("TRCFMT=1;4;E;R;F\nR=3000;2000;3000;2000\n")!;
    expect(one.mirroredL).toBe(true);
    expect(one.points.L).toEqual(one.points.R);
    const left = parseOma("TRCFMT=1;4;E;L;F\nR=3000;2000;3000;2000\n")!;
    expect(left.sourceSide).toBe("L");
    const both = parseOma("TRCFMT=1;2;E;R;F\nR=3000;2000\nTRCFMT=1;2;E;L;F\nR=2900;2100\n")!;
    expect(both.mirroredL).toBe(false);
    expect(both.points.L).toEqual([29, 21]);
  });

  it("copes with empty and outline-less input", () => {
    expect(parseOma("")).toBeNull();
    expect(hasOutline(parseOma("JOB=x\nHBOX=50;50\n"))).toBe(false);
  });
});

describe("rejectTraceFile (decided from name and size, before anything is read)", () => {
  it("accepts a trace and refuses everything else", () => {
    expect(rejectTraceFile({ name: "1471.oma", size: 8681 })).toBeNull();
    expect(rejectTraceFile({ name: "FRAME.TR", size: 100 })).toBeNull();
    expect(rejectTraceFile({ name: "x.vca", size: 100 })).toBeNull();
    expect(rejectTraceFile({ name: "photo.jpg", size: 100 })).toMatch(/isn't a trace file/);
    expect(rejectTraceFile({ name: "trace.oma.exe", size: 100 })).toMatch(/isn't a trace file/);
    expect(rejectTraceFile({ name: "a.oma", size: 0 })).toMatch(/empty/);
    expect(rejectTraceFile({ name: "a.oma", size: 3 * 1024 * 1024 })).toMatch(/too large/);
  });
});

describe("shape handling matches the engine", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  const TYPED = { a: 52, b: 38, dbl: 18 };

  const setBox = (h: ReturnType<typeof mountRxOrder>) => {
    h.set("#fa", "52"); h.set("#fb", "38"); h.set("#fdbl", "18");
  };

  it.each(STD_SHAPES.map((s) => [s.id, s.raw] as const))("the %s standard shape: outline, metrics and payload", (id, raw) => {
    const h = mountRxOrder();
    setBox(h);
    h.field<HTMLElement>(`#shapePick [data-sid="${id}"]`)!.click();
    const engine = h.engine.getPayload().shape;

    // the library stores a 240-point version of the traced outline
    const domain = compactShape(parseOma(raw)!);
    const g = shapeGeometry(domain, TYPED)!;
    const payload = shapeToPayload(domain, g, { source: "standard", standardId: id, fileName: null, confirmed: false });

    expect(engine.source).toBe("standard");
    expect(engine.standardId).toBe(id);
    expect(engine.pointCount).toBe(payload.pointCount);
    expect(engine.nativeBox).toEqual(payload.nativeBox);
    expect(near(engine.computed.ed, payload.computed.ed)).toBe(true);
    expect(near(engine.computed.edAxis, payload.computed.edAxis)).toBe(true);
    expect(near(engine.computed.circ, payload.computed.circ)).toBe(true);
    expect(engine.radii.R).toEqual(payload.radii.R);
    expect(engine.angles.R).toEqual(payload.angles.R);
    expect(engine.mirroredFrom).toBe(payload.mirroredFrom);
    // and the form's ED field locks to the outline's measured ED
    expect(Number(h.field<HTMLInputElement>("#fed")!.value)).toBeCloseTo(payload.computed.ed, 1);
    h.destroy();
  });

  it("a dropped trace file: parsed outline, A/B filled from the file, ED locked to the outline", async () => {
    const h = mountRxOrder();
    h.segment("scopeSeg", "scope", "remote");
    const input = h.field<HTMLInputElement>("#fileInput")!;
    const file = new File([SAMPLE_OMA_1471], "1471.oma", { type: "text/plain" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 150)); // FileReader

    const domain = parseOma(SAMPLE_OMA_1471)!;
    // the engine fills A and B from the file (and leaves DBL to the person)
    expect(Number(h.field<HTMLInputElement>("#fa")!.value)).toBeCloseTo(domain.hbox!, 2);
    expect(Number(h.field<HTMLInputElement>("#fb")!.value)).toBeCloseTo(domain.vbox!, 2);
    expect(h.field<HTMLInputElement>("#fdbl")!.value).toBe("");
    expect(h.field<HTMLInputElement>("#fname")!.value).toBe(domain.job);

    const engine = h.engine.getPayload().shape;
    const g = shapeGeometry(domain, { a: domain.hbox, b: domain.vbox, dbl: null })!;
    const payload = shapeToPayload(domain, g, { source: "trace", standardId: null, fileName: "1471.oma", confirmed: false });
    expect(engine.source).toBe("trace");
    expect(engine.file).toBe("1471.oma");
    expect(engine.pointCount).toBe(payload.pointCount);
    expect(engine.radii.R).toEqual(payload.radii.R);
    expect(engine.radii.L).toEqual(payload.radii.L);
    expect(near(engine.computed.ed, payload.computed.ed)).toBe(true);
    expect(near(engine.computed.circ, payload.computed.circ)).toBe(true);
    expect(Number(h.field<HTMLInputElement>("#fed")!.value)).toBeCloseTo(payload.computed.ed, 1);
    h.destroy();
  });

  it("retyping A and B rescales the outline and the ED follows", () => {
    const domain = compactShape(parseOma(STD_SHAPES[0].raw)!);
    const small = shapeGeometry(domain, { a: 48, b: 34, dbl: 18 })!;
    const big = shapeGeometry(domain, { a: 56, b: 40, dbl: 18 })!;
    expect(big.metrics.ed).toBeGreaterThan(small.metrics.ed);
    // untyped A/B: drawn at the file's own size, flagged as a placeholder
    const ghost = shapeGeometry(domain, { a: null, b: null, dbl: null })!;
    expect(ghost.ghost).toBe(true);
    expect(ghost.a).toBe(domain.hbox);
  });

  it("a saved shape payload reopens to the same outline", () => {
    const domain = compactShape(parseOma(STD_SHAPES[2].raw)!);
    const g = shapeGeometry(domain, TYPED)!;
    const payload = shapeToPayload(domain, g, { source: "standard", standardId: "aviator", fileName: null, confirmed: true });
    const back = shapeFromPayload(payload)!;
    expect(back.source).toBe("standard");
    expect(back.standardId).toBe("aviator");
    expect(back.confirmed).toBe(true);
    expect(back.shape.points.R).toEqual(domain.points.R);
    expect(shapeGeometry(back.shape, TYPED)!.metrics.ed).toBeCloseTo(g.metrics.ed, 6);
    expect(shapeFromPayload(null)).toBeNull();
    expect(shapeFromPayload({ radii: { R: [] } })).toBeNull();
  });
});
