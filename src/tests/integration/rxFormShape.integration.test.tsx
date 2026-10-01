// The shape / trace picker in the React form: the model's rules (remote edge needs
// a confirmed trace, the outline locks ED), the hook's actions, the saved order,
// and the real component with a trace dropped into it.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { downgradeToV1 } from "@/features/rx-order/domain/payload";
import { parseOma } from "@/features/rx-order/domain/shape";
import { SAMPLE_OMA_1471 } from "@/features/rx-order/domain/standardShapes";
import { buildOrder, derive, valuesFromOrder } from "@/features/rx-order/form/model";
import { defaultValues, type RxCatalog, type RxFormValues } from "@/features/rx-order/form/types";
import { useRxOrderForm } from "@/features/rx-order/form/useRxOrderForm";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), toast: vi.fn() }));
vi.mock("@/features/rx-order/embed/rx-order-adapter", () => ({
  persistPayload: mocks.persist, syntheticCartProductId: () => -1, savedRxPayload: () => null,
}));
vi.mock("@/hooks/useCart", () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
vi.mock("@/hooks/useCartDrafts", () => ({ useCartDrafts: () => ({ drafts: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/lens-assistant/api", () => ({
  useRxDrafts: () => ({ data: [] }), useSaveEmbeddedRxOrderDraft: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: "d" }) }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

import RxForm from "@/features/rx-order/form/RxForm";

const catalog: RxCatalog = {
  materials: [{ id: "plastic", n: "Plastic 1.50", up: 0 }],
  designs: [{ id: "sv", n: "Single Vision", v: "sv", base: 0 }],
  colours: [{ id: "clear", n: "Clear", up: 0 }],
  combos: [{ m: "plastic", d: "sv", c: "clear" }],
  treatments: [], clashes: [],
  lensPrice: () => 100, hasPriceSource: true, blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES, accountCountry: "BB", pricesVisible: true,
};
const accounts = [{ id: 776, name: "Retail", account_number: "RETAIL" }];

const remoteValues = (): RxFormValues => {
  const v = defaultValues(776);
  v.patient = { first: "Ann", last: "Lee" };
  v.job.scope = "remote";
  v.frame = { ...v.frame, name: "Ray", mount: "plastic", dbl: "18" };
  v.lens.od = { m: "plastic", d: "sv", c: "clear" };
  v.lens.diameter = "70";
  for (const e of ["od", "os"] as const) v.rx[e] = { ...v.rx[e], sph: "-2.00", cyl: "-0.75", axis: "90", pd: "32.0" };
  return v;
};

const hook = () => renderHook(() => useRxOrderForm({ catalog, accountId: 776, initialValues: remoteValues() }));

describe("shape rules in the model", () => {
  it("remote edge needs a trace; a standard shape alone is not one", () => {
    const { result } = hook();
    expect(result.current.derived.sections.frame).toBe(false);
    expect(result.current.derived.frame.shapeIssues[0]).toMatch(/needs your frame trace file/);
    act(() => { result.current.pickStandardShape("rect"); });
    expect(result.current.derived.frame.shapeIssues[0]).toMatch(/needs your frame trace file/);
    expect(result.current.derived.sections.frame).toBe(false);
  });

  it("a trace fills A, B and the frame name, locks ED to the outline, and needs confirming", () => {
    const { result } = hook();
    let note = "";
    act(() => { note = result.current.loadTrace(SAMPLE_OMA_1471, "1471.oma", 8681); });
    const shape = parseOma(SAMPLE_OMA_1471)!;
    expect(note).toMatch(/Trace loaded/);
    expect(Number(result.current.values.frame.a)).toBeCloseTo(shape.hbox!, 2);
    expect(Number(result.current.values.frame.b)).toBeCloseTo(shape.vbox!, 2);
    expect(result.current.values.frame.name).toBe(shape.job);
    expect(result.current.values.frame.dbl).toBe("18"); // DBL waits for the person
    const d = result.current.derived;
    expect(d.frame.edLocked).toBe(true);
    expect(d.frame.ed).toBeCloseTo(d.frame.geometry!.metrics.ed, 6);
    expect(d.frame.shapeIssues[0]).toMatch(/Confirm the shape/);
    expect(d.sections.frame).toBe(false);

    act(() => { result.current.setShapeConfirmed(true); });
    expect(result.current.derived.sections.frame).toBe(true);
    // a typed ED cannot override the outline
    act(() => { result.current.setFrame("ed", "99"); });
    expect(result.current.derived.frame.ed).toBeCloseTo(d.frame.ed!, 6);
  });

  it("withdraws the confirmation when a box measurement is cleared", () => {
    const { result } = hook();
    act(() => { result.current.loadTrace(SAMPLE_OMA_1471, "1471.oma", 1); result.current.setShapeConfirmed(true); });
    expect(result.current.values.shape.confirmed).toBe(true);
    act(() => { result.current.setFrame("dbl", ""); });
    expect(result.current.values.shape.confirmed).toBe(false);
  });

  it("a file with no readable outline is attached but says so", () => {
    const { result } = hook();
    act(() => { result.current.loadTrace("JOB=x\nHBOX=50;50\n", "bad.oma", 10); });
    expect(result.current.values.shape.fileName).toBe("bad.oma");
    expect(result.current.values.shape.data).toBeNull();
    expect(result.current.derived.frame.shapeIssues[0]).toMatch(/No trace points could be read/);
  });

  it("removing the trace, or clearing the section, empties the shape", () => {
    const { result } = hook();
    act(() => { result.current.loadTrace(SAMPLE_OMA_1471, "1471.oma", 1); });
    act(() => { result.current.removeTrace(); });
    expect(result.current.values.shape.data).toBeNull();
    act(() => { result.current.pickStandardShape("round"); });
    expect(result.current.values.shape.standardId).toBe("round");
    act(() => { result.current.clearSection("frame"); });
    expect(result.current.values.shape.source).toBeNull();
    expect(result.current.values.job.scope).toBe("uncut");
  });

  it("an uncut job may use a standard shape for a true ED, with nothing to confirm", () => {
    const { result } = hook();
    act(() => {
      result.current.setJob("scope", "uncut");
      result.current.setFrame("a", "52"); result.current.setFrame("b", "38");
      result.current.pickStandardShape("aviator");
    });
    const d = result.current.derived;
    expect(d.frame.edLocked).toBe(true);
    expect(d.sections.frame).toBe(true);
  });
});

describe("the order carries the shape", () => {
  it("builds the shape payload and reopens with its outline", () => {
    const { result } = hook();
    act(() => { result.current.loadTrace(SAMPLE_OMA_1471, "1471.oma", 8681); result.current.setShapeConfirmed(true); });
    const v = result.current.values;
    const d = result.current.derived;
    const order = buildOrder(v, d, catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    const shape = order.shape as any;
    expect(shape).toMatchObject({ source: "trace", file: "1471.oma", confirmed: true });
    expect(shape.computed.ed).toBeCloseTo(d.frame.ed!, 1);

    // v1 shape for the existing save path (which stores job scope and trace geometry)
    const v1 = downgradeToV1(order) as any;
    expect(v1.job.scope).toBe("remote");
    expect(v1.shape.radii.R.length).toBeGreaterThan(100);

    const back = valuesFromOrder(order, catalog);
    expect(back.shape.source).toBe("trace");
    expect(back.shape.fileName).toBe("1471.oma");
    expect(back.shape.confirmed).toBe(true);
    expect(back.job.scope).toBe("remote");
    expect(derive(back, catalog).frame.ed).toBeCloseTo(d.frame.ed!, 4);
  });
});

describe("the frame card with a trace dropped in", () => {
  beforeEach(() => { mocks.persist.mockReset().mockResolvedValue({ totalBBD: 100, quoteId: "q", quoteNumber: "Q-1", rxOrderNumber: 1, created: true }); });

  const renderRemote = () => {
    const v = remoteValues();
    const order = buildOrder(v, derive(v, catalog), catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    return render(<MemoryRouter><RxForm quoteId={null} surface="admin" lockedAccountId={776} prefill={order} fixture={{ catalog, accounts }} /></MemoryRouter>);
  };

  it("asks for a trace, reads the dropped file, previews the outline and takes the confirmation", async () => {
    renderRemote();
    expect(screen.getByText(/Drop your trace file here/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Frame trace file")).toBeInTheDocument();

    const file = new File([SAMPLE_OMA_1471], "1471.oma", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Frame trace file"), { target: { files: [file] } });
    expect(await screen.findByText("1471.oma")).toBeInTheDocument();
    expect(screen.getByText(/trace points parsed/)).toBeInTheDocument();

    // preview + verification appear; A and B were filled from the file
    expect(screen.getByRole("img", { name: /Frame shape, A / })).toBeInTheDocument();
    const shape = parseOma(SAMPLE_OMA_1471)!;
    expect((screen.getByLabelText(/^A\b/) as HTMLInputElement).value).toBe(shape.hbox!.toFixed(2));
    // ED is locked to the outline
    const ed = screen.getByLabelText(/^ED\b/) as HTMLInputElement;
    expect(ed.readOnly).toBe(true);
    expect(screen.getByText(/locked/)).toBeInTheDocument();

    // not confirmed yet → the frame is incomplete and submit is blocked
    expect(screen.getAllByRole("button", { name: "Submit to cart" })[0]).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /This is the correct shape/ }));
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Submit to cart" })[0]).toBeEnabled());
    // confirmed and complete: the card folds into its summary, which names the shape
    expect(screen.getByText(/Shape: 1471\.oma/)).toBeInTheDocument();
  });

  it("refuses a file that is not a trace", async () => {
    renderRemote();
    const bad = new File(["x"], "notes.txt", { type: "text/plain" });
    fireEvent.change(screen.getByLabelText("Frame trace file"), { target: { files: [bad] } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ description: "Trace files only — .oma, .tr or .vca" }));
    expect(screen.getByText(/Drop your trace file here/)).toBeInTheDocument();
  });

  it("offers a standard shape as a fallback on remote edge, behind a button", () => {
    renderRemote();
    expect(screen.queryByRole("group", { name: "Standard shape" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Use a standard shape instead/ }));
    expect(screen.getByRole("group", { name: "Standard shape" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aviator/ })).toBeInTheDocument();
  });
});
