import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RxPayloadSummary } from "@/features/rx-order/orders/RxPayloadSummary";
import { buildRxSummary, formatPower } from "@/features/rx-order/orders/rxSummaryModel";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

const v1 = () => ({
  schema: "cv.rxorder/1",
  orderNo: "1042",
  reference: "PO-7",
  patient: { first: "Ann", last: "Lee" },
  job: { scope: "glaze", eyes: "pair", vision: "mf", purpose: "dist" },
  frame: { name: "Ray-Ban 5154", mount: "metal", source: "Customer — shipping to lab", a: "52", b: 38, ed: 55.123, dbl: "18" },
  lens: { material: "Plastic 1.50", design: "Progressive", colour: "Clear", diameter: 70 },
  split: false,
  lensOs: null,
  rx: {
    od: { sph: "-2.5", cyl: -0.75, axis: "90", add: "2", pd: "32", npd: "", ht: "18", prism: "", base: "" },
    os: { sph: 0, cyl: 0, axis: "", add: "2.00", pd: "31.5", npd: "", ht: "18", prism: "1.5", base: "in" },
  },
  treatments: ["ar-1", "gone-9"],
  delivery: { service: "pri", method: "Courier", notes: "Keep it light\n\n[Chemistrie specifications]\nChemistrie clip 1 — Sun\n[/Chemistrie specifications]" },
  flags: [{ path: "rx.od.sph", reason: "Handwriting unclear" }],
  quote: { symbol: "BBD $", total: 1234.5, lines: [{ label: "OD Super AR", detail: "OD · Anti-reflective", amount: 24, eye: "od" }, { label: "Priority service", detail: "3 working days", amount: 6 }] },
});

describe("buildRxSummary", () => {
  it("formats powers with a true minus, two decimals and Plano for a zero sphere", () => {
    expect(formatPower("-2.5")).toBe("−2.50");
    expect(formatPower(1)).toBe("+1.00");
    expect(formatPower(0, { plano: true })).toBe("Plano");
    expect(formatPower("")).toBe("—");
  });

  it("builds a tidy prescription table from a v1 payload", () => {
    const m = buildRxSummary(v1());
    expect(m.columns).toEqual(["Sphere", "Cylinder", "Axis", "Add", "Distance PD", "Fitting height", "Prism"]);
    expect(m.rows[0]).toEqual({ eye: "od", cells: ["−2.50", "−0.75", "90°", "+2.00", "32.0", "18.0", "—"] });
    expect(m.rows[1].cells).toEqual(["Plano", "—", "—", "+2.00", "31.5", "18.0", "1.50Δ IN"]);
  });

  it("drops columns nobody filled in (single vision: no add, near PD or prism)", () => {
    const p = v1();
    p.job.vision = "sv";
    p.rx.od.add = ""; p.rx.os.add = ""; p.rx.os.prism = "";
    expect(buildRxSummary(p).columns).toEqual(["Sphere", "Cylinder", "Axis", "Distance PD", "OC height"]);
  });

  it("reads a v2 payload and shows each side of a split lens", () => {
    const m = buildRxSummary({
      job: { eyes: "pair", vision: "sv" },
      lens: { od: { material: "A", design: "B", colour: "C" }, os: { material: "X", design: "Y", colour: "Z" }, advanced: { diameter: 75, corridor: "", baseCurve: "" } },
      rx: { od: { sph: -1, cyl: null, axis: null, add: null, prism: null, base: "", pd: 30, npd: null, height: 20 } },
    });
    expect(m.lenses.map((l) => l.heading)).toEqual(["Right (OD)", "Left (OS)"]);
    expect(m.lensExtras).toEqual([{ label: "Blank size", value: "75 mm" }]);
    expect(m.rows[0].cells.slice(-1)).toEqual(["20.0"]);
  });

  it("says when only one eye is supplied and keeps only that eye's row", () => {
    const p = v1();
    p.job.eyes = "os";
    const m = buildRxSummary(p);
    expect(m.rows.map((r) => r.eye)).toEqual(["os"]);
    expect(m.lenses[0].heading).toBe("Left lens only");
    expect(m.facts).toContain("Left lens only");
  });

  it("strips the generated Chemistrie block out of the notes and lists human flags", () => {
    const m = buildRxSummary(v1());
    expect(m.notes).toBe("Keep it light");
    expect(m.flags).toEqual([{ field: "Right sphere", reason: "Handwriting unclear" }]);
    expect(m.facts).toEqual(["Full glaze", "Multifocal / progressive", "Pair", "Priority service"]);
    expect(m.frameDetail).toBe("Metal · Customer — shipping to lab · Delivery: Courier");
    expect(m.measurements.map((x) => x.value)).toEqual(["52.0", "38.0", "55.12", "18.0"]);
  });

  it("maps a Lens Assistant draft (right / left) instead of showing an empty table", () => {
    const m = buildRxSummary({
      patientReference: "Mr Smith", frameType: "full-rim", primaryUse: "computer", frameA: 50, frameB: 36, frameDbl: 17,
      right: { sphere: -1.25, cylinder: null, axis: null, add: null, prism: null, prismBase: "" },
      left: { sphere: 1.5, cylinder: -0.5, axis: 10, add: null, prism: null, prismBase: "" },
    });
    expect(m.kind).toBe("assistant");
    expect(m.patient).toBe("Mr Smith");
    expect(m.facts).toEqual(["Full rim", "Computer use"]);
    expect(m.columns).toEqual(["Sphere", "Cylinder", "Axis"]);
    expect(m.rows.map((r) => r.cells)).toEqual([["−1.25", "—", "—"], ["+1.50", "−0.50", "10°"]]);
    expect(m.measurements.map((x) => x.label)).toEqual(["A", "B", "DBL"]);
  });
});

describe("RxPayloadSummary", () => {
  const renderIt = (payload: unknown) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <RxPayloadSummary payload={payload} patientFallback="Draft" />
    </QueryClientProvider>,
  );

  it("names the coatings, marks withdrawn ones, and shows tidy prices without the eye prefix", async () => {
    rpc.mockResolvedValue({ data: [{ id: "ar-1", name: "Super AR" }], error: null });
    renderIt(v1());
    expect(screen.getByText("Ann Lee")).toBeTruthy();
    expect(screen.getByText("−2.50")).toBeTruthy();
    expect(screen.getByText("2 selected")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Super AR", { selector: "li *, li" })).toBeTruthy());
    expect(screen.getByText("Coating no longer listed")).toBeTruthy();
    expect(screen.getByText("BBD $ 1,234.50")).toBeTruthy();
    expect(screen.getByText("Check before sending")).toBeTruthy();
    expect(screen.queryByText(/Chemistrie specifications/)).toBeNull();
  });

  it("still renders when the coating names cannot be loaded", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("nope") });
    renderIt(v1());
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(screen.getByText("2 selected")).toBeTruthy();
  });
});
