// Chemistrie clips in the React form: the hook's rules, what the order carries
// (structured clips + the lab-notes block, and NO quote line), reopening a saved
// order, and the real component.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { downgradeToV1 } from "@/features/rx-order/domain/payload";
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
  treatments: [{ id: "ar1", c: "Anti-reflective", n: "Super AR", d: "", p: 48, grp: "ar", pop: true }],
  clashes: [], lensPrice: () => 100, hasPriceSource: true, blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES, accountCountry: "BB", pricesVisible: true,
};
const accounts = [{ id: 776, name: "Retail", account_number: "RETAIL" }];

const valid = (): RxFormValues => {
  const v = defaultValues(776);
  v.patient = { first: "Ann", last: "Lee" };
  v.frame = { ...v.frame, name: "Ray", mount: "plastic", a: "52", b: "38", dbl: "18" };
  v.lens.od = { m: "plastic", d: "sv", c: "clear" };
  v.lens.diameter = "70";
  for (const e of ["od", "os"] as const) v.rx[e] = { ...v.rx[e], sph: "-2.00", cyl: "-0.75", axis: "90", pd: "32.0" };
  return v;
};

const hook = () => renderHook(() => useRxOrderForm({ catalog, accountId: 776, initialValues: valid() }));

describe("chemistrie in the form model", () => {
  it("switching it on adds one starter clip that blocks submit until it is complete", () => {
    const { result } = hook();
    expect(result.current.derived.canSubmit).toBe(true);
    act(() => { result.current.toggleChemistrie(true); });
    expect(result.current.values.chemClips).toHaveLength(1);
    const d = result.current.derived;
    expect(d.treat.chemIssues).toEqual(["Chemistrie clip 1 is not complete."]);
    expect(d.sections.treat).toBe(false);
    expect(d.checklist.map((c) => c.id)).toContain("treat");
    expect(d.canSubmit).toBe(false);

    act(() => { result.current.setChemField(result.current.values.chemClips[0].id, "colour", "Grey"); });
    expect(result.current.derived.canSubmit).toBe(true);
    act(() => { result.current.toggleChemistrie(false); });
    expect(result.current.values.chemClips).toHaveLength(0);
  });

  it("allows three clips, not four, and removing one keeps the others", () => {
    const { result } = hook();
    act(() => { result.current.toggleChemistrie(true); });
    act(() => { result.current.addChemClip(); });
    let note: string | null = "";
    act(() => { note = result.current.addChemClip(); });
    expect(note).toMatch(/Clip 3 added/);
    expect(result.current.values.chemClips.map((c) => c.type)).toEqual(["sun", "blue", "readers"]);
    act(() => { note = result.current.addChemClip(); });
    expect(note).toBeNull();
    expect(result.current.values.chemClips).toHaveLength(3);
    const middle = result.current.values.chemClips[1].id;
    act(() => { result.current.removeChemClip(middle); });
    expect(result.current.values.chemClips.map((c) => c.type)).toEqual(["sun", "readers"]);
  });

  it("solid, mirror and gradient are mutually exclusive, and two identical clips are flagged", () => {
    const { result } = hook();
    act(() => { result.current.toggleChemistrie(true); });
    const id = result.current.values.chemClips[0].id;
    act(() => { result.current.setChemField(id, "mirror", "gold"); });
    act(() => { result.current.setChemField(id, "colour", "Brown"); });
    expect(result.current.values.chemClips[0]).toMatchObject({ colour: "Brown", mirror: "", gradient: "" });

    act(() => { result.current.addChemClip(); });
    const second = result.current.values.chemClips[1].id;
    act(() => { result.current.setChemType(second, "sun"); result.current.setChemField(second, "colour", "Brown"); });
    expect(result.current.derived.treat.chemIssues[0]).toMatch(/identical/);
    expect(result.current.derived.canSubmit).toBe(false);
  });

  it("clearing the coatings section clears the clips too", () => {
    const { result } = hook();
    act(() => { result.current.toggleChemistrie(true); result.current.toggleCoating("ar1"); });
    act(() => { result.current.clearSection("treat"); });
    expect(result.current.values.chemClips).toEqual([]);
    expect(result.current.values.treatments).toEqual([]);
  });
});

describe("the order carries the clips as instructions, not charges", () => {
  const withClips = () => {
    const { result } = hook();
    act(() => { result.current.toggleChemistrie(true); result.current.set("delivery.notes", "Rush please"); });
    const id = result.current.values.chemClips[0].id;
    act(() => { result.current.setChemField(id, "colour", "Grey"); result.current.addChemClip(); });
    const id2 = result.current.values.chemClips[1].id;
    act(() => { result.current.setChemType(id2, "readers"); result.current.setChemField(id2, "add", "1.25"); });
    return result.current;
  };

  it("adds the structured clips and the lab-notes block, and changes no price", () => {
    const api = withClips();
    const base = derive({ ...api.values, chemClips: [] }, catalog);
    const order = buildOrder(api.values, api.derived, catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    expect(order.chemistrie).toHaveLength(2);
    expect(order.delivery.notes.startsWith("Rush please")).toBe(true);
    expect(order.delivery.notes).toContain("Chemistrie clip 2 — Chemistrie Readers · Reader power: +1.25");
    expect(api.derived.price.sub).toBe(base.price.sub);
    expect((order.quote as any).lines.some((l: any) => /chemistrie/i.test(l.label))).toBe(false);
    // v1 (the save path) carries the same
    const v1 = downgradeToV1(order) as any;
    expect(v1.chemistrie).toHaveLength(2);
    expect(v1.delivery.notes).toBe(order.delivery.notes);
  });

  it("a saved order reopens with its clips and the person's own notes, with no accumulating block", () => {
    const api = withClips();
    const order = buildOrder(api.values, api.derived, catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    const back = valuesFromOrder(order, catalog);
    expect(back.chemClips).toHaveLength(2);
    expect(back.chemClips[1]).toMatchObject({ type: "readers", add: "1.25" });
    expect(back.delivery.notes).toBe("Rush please");
    // saving it again regenerates exactly the same block
    const again = buildOrder(back, derive(back, catalog), catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    expect(again.delivery.notes).toBe(order.delivery.notes);
    expect(derive(back, catalog).sections.treat).toBe(true);
  });
});

describe("the coatings card with Chemistrie", () => {
  beforeEach(() => { mocks.persist.mockReset().mockResolvedValue({ totalBBD: 100, quoteId: "q", quoteNumber: "Q-1", rxOrderNumber: 1, created: true }); });

  const renderSaved = (v = valid()) => {
    const order = buildOrder(v, derive(v, catalog), catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
    return render(<MemoryRouter><RxForm quoteId={null} surface="admin" lockedAccountId={776} prefill={order} fixture={{ catalog, accounts }} /></MemoryRouter>);
  };
  const submit = () => screen.getAllByRole("button", { name: "Submit to cart" })[0];

  it("switching it on shows a clip that must be completed, switching it off clears it", () => {
    renderSaved();
    fireEvent.click(screen.getByRole("button", { name: "Edit Coatings & treatments" }));
    expect(screen.queryByLabelText("Chemistrie clip 1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Add a Chemistrie layer"));
    const clip = screen.getByLabelText("Chemistrie clip 1");
    expect(within(clip).getByText(/Complete this clip before leaving the section/)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
    // the four layer types are offered
    for (const name of ["Chemistrie Sun", "Chemistrie Blue", "Chemistrie Readers", "Chemistrie Drive"]) {
      expect(within(clip).getByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
    }
    // Drive needs nothing more: choosing it completes the clip
    fireEvent.click(within(clip).getByRole("button", { name: /Chemistrie Drive/ }));
    expect(within(screen.getByLabelText("Chemistrie clip 1")).queryByText(/Complete this clip/)).not.toBeInTheDocument();
    expect(screen.getByText(/fixed, non-polarised rose tint/)).toBeInTheDocument();
    expect(submit()).toBeEnabled();

    fireEvent.click(screen.getByLabelText("Add a Chemistrie layer"));
    expect(screen.queryByLabelText("Chemistrie clip 1")).not.toBeInTheDocument();
  });

  it("adds and removes clips up to the limit of three", () => {
    renderSaved();
    fireEvent.click(screen.getByRole("button", { name: "Edit Coatings & treatments" }));
    fireEvent.click(screen.getByLabelText("Add a Chemistrie layer"));
    fireEvent.click(screen.getByRole("button", { name: /Add another clip/ }));
    fireEvent.click(screen.getByRole("button", { name: /Add another clip/ }));
    expect(screen.getByText("3 / 3 clips")).toBeInTheDocument();
    expect(screen.getByText(/Maximum of 3 clips per order/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add another clip/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove clip 2" }));
    expect(screen.getByText("2 / 3 clips")).toBeInTheDocument();
  });

  it("a saved order with clips folds into a summary that lists them as lab instructions", () => {
    const v = valid();
    v.chemClips = [{ id: "a", type: "drive", colour: "", mirror: "", gradient: "", polarised: false, add: "", magnet: "Silver", bridge: "Black", crystal: "none" }];
    renderSaved(v);
    expect(screen.getByText("Chemistrie (lab instructions)")).toBeInTheDocument();
    expect(screen.getByText(/Clip 1: Chemistrie Drive/)).toBeInTheDocument();
  });
});
