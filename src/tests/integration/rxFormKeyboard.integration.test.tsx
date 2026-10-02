// The keyboard flow of the React form: the lens pickers are type-to-search fields
// (click or tab in and type; Enter picks and moves on), and Enter advances
// through every field the way the previous form did.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { buildOrder, derive } from "@/features/rx-order/form/model";
import { defaultValues, type RxCatalog, type RxFormValues } from "@/features/rx-order/form/types";

vi.mock("@/features/rx-order/embed/rx-order-adapter", () => ({
  persistPayload: vi.fn().mockResolvedValue({ totalBBD: 1, quoteId: "q", quoteNumber: "Q", rxOrderNumber: 1, created: true }),
  syntheticCartProductId: () => -1, savedRxPayload: () => null,
}));
vi.mock("@/hooks/useCart", () => ({ useCart: () => ({ addToCart: vi.fn() }) }));
vi.mock("@/hooks/useCartDrafts", () => ({ useCartDrafts: () => ({ drafts: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/features/lens-assistant/api", () => ({
  useRxDrafts: () => ({ data: [] }), useSaveEmbeddedRxOrderDraft: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: "d" }) }),
  useDeleteRxDraft: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined), mutate: vi.fn() }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: vi.fn(), from: vi.fn() } }));

import RxForm from "@/features/rx-order/form/RxForm";

const catalog: RxCatalog = {
  materials: [{ id: "plastic", n: "Plastic 1.50", up: 0 }, { id: "poly", n: "Polycarbonate", up: 0 }, { id: "hi", n: "Hi-Index 1.67", up: 0 }],
  designs: [{ id: "sv", n: "Single Vision · Regular", v: "sv", base: 0 }, { id: "sv2", n: "Single Vision · Aspheric", v: "sv", base: 0 }],
  colours: [{ id: "clear", n: "UNCoated", up: 0 }, { id: "photo", n: "Photochromic Grey", up: 0 }],
  combos: [
    { m: "plastic", d: "sv", c: "clear" }, { m: "plastic", d: "sv2", c: "photo" },
    { m: "poly", d: "sv", c: "clear" }, { m: "hi", d: "sv2", c: "clear" },
  ],
  treatments: [], clashes: [], lensPrice: () => 100, hasPriceSource: true, blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES, accountCountry: "BB", pricesVisible: true,
};
const accounts = [{ id: 776, name: "Retail", account_number: "RETAIL" }];

/** A saved order with the patient, frame and lens still blank, so those cards are open. */
const blankOrder = (over: (v: RxFormValues) => void = () => undefined) => {
  const v = defaultValues(776);
  v.lens.diameter = "70";
  over(v);
  return buildOrder(v, derive(v, catalog), catalog, { orderNo: null, account: { id: 776, name: "Retail" }, source: "form" });
};
const renderForm = (order = blankOrder()) =>
  render(<MemoryRouter><RxForm quoteId={null} surface="admin" lockedAccountId={776} prefill={order} fixture={{ catalog, accounts }} /></MemoryRouter>);

const field = (label: string | RegExp) => screen.getByLabelText(label) as HTMLInputElement;
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const enter = (el: HTMLElement) => fireEvent.keyDown(el, { key: "Enter" });
/** The options of the open picker (not the Rx table's native select options). */
const options = () => within(screen.getByRole("listbox")).getAllByRole("option");

describe("lens pickers are type-to-search fields", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("focusing the field opens the list; typing narrows it; Enter picks the match and moves to the next field", async () => {
    renderForm();
    const material = field("Material / index");
    material.focus();
    fireEvent.focus(material);
    const list = screen.getByRole("listbox", { name: "Material / index options" });
    expect(list.querySelectorAll("[role=option]")).toHaveLength(3);

    type(material, "poly");
    expect(options().map((o) => o.textContent)).toEqual(["Polycarbonate"]);
    enter(material);
    await waitFor(() => expect(document.activeElement).toBe(field("Lens design / type")));
    expect(screen.queryByRole("listbox", { name: "Material / index options" })).not.toBeInTheDocument();
    // the choice is shown in the field once focus has left it
    expect(field("Material / index").value).toBe("Polycarbonate");
  });

  it("the whole lens can be chosen from the keyboard alone, and the lists narrow each other", async () => {
    renderForm();
    const material = field("Material / index");
    material.focus(); fireEvent.focus(material);
    type(material, "plastic"); enter(material);

    const design = await waitFor(() => { const d = field("Lens design / type"); expect(document.activeElement).toBe(d); return d; });
    fireEvent.focus(design);
    // plastic only comes in two designs; hi-index's aspheric is not offered with it
    expect(options().map((o) => o.textContent)).toEqual(["Single Vision · Regular", "Single Vision · Aspheric"]);
    type(design, "aspher"); enter(design);

    const colour = await waitFor(() => { const c = field("Lens colour option"); expect(document.activeElement).toBe(c); return c; });
    fireEvent.focus(colour);
    expect(options().map((o) => o.textContent)).toEqual(["Photochromic Grey"]); // the only colour for plastic + aspheric
    enter(colour); // nothing typed: Enter takes the highlighted (first) option

    await waitFor(() => expect(screen.getByText(/Plastic 1\.50 · Single Vision · Aspheric · Photochromic Grey/)).toBeInTheDocument());
    // and focus has moved on past the lens to the next field (the advanced panel is collapsed, so it is skipped)
    await waitFor(() => expect(document.activeElement).not.toBe(colour));
    expect((document.activeElement as HTMLElement).getAttribute("aria-label")).toBe("OD Sphere");
  });

  it("arrow keys move through the list and Enter picks the highlighted option", async () => {
    renderForm();
    const material = field("Material / index");
    material.focus(); fireEvent.focus(material);
    fireEvent.keyDown(material, { key: "ArrowDown" });
    fireEvent.keyDown(material, { key: "ArrowDown" });
    expect(options()[2]).toHaveAttribute("aria-selected", "false");
    expect(material.getAttribute("aria-activedescendant")).toBe(options()[2].id);
    enter(material);
    await waitFor(() => expect(field("Material / index").value).toBe("Hi-Index 1.67"));
    fireEvent.keyDown(field("Material / index"), { key: "ArrowUp" }); // reopens
  });

  it("Escape closes the list and leaves the choice alone; leaving the field reverts what was typed", () => {
    renderForm(blankOrder((v) => { v.lens.od = { m: "plastic", d: "", c: "" }; }));
    const material = field("Material / index");
    material.focus(); fireEvent.focus(material);
    expect(material.value).toBe("Plastic 1.50");
    type(material, "zzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
    fireEvent.keyDown(material, { key: "Escape" });
    expect(screen.queryByRole("listbox", { name: "Material / index options" })).not.toBeInTheDocument();
    expect(field("Material / index").value).toBe("Plastic 1.50");

    type(material, "poly"); // typing reopens it
    fireEvent.blur(material);
    expect(field("Material / index").value).toBe("Plastic 1.50"); // blur without picking changes nothing
  });

  it("Enter in an empty-search field with nothing to pick still just moves on", async () => {
    renderForm(blankOrder((v) => { v.lens.od = { m: "plastic", d: "sv", c: "clear" }; }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Lens selection" })); // complete, so it is folded
    const design = field("Lens design / type");
    design.focus(); fireEvent.focus(design);
    fireEvent.keyDown(design, { key: "Escape" }); // list closed, choice kept
    enter(design);
    await waitFor(() => expect(document.activeElement).toBe(field("Lens colour option")));
    expect(field("Lens design / type").value).toBe("Single Vision · Regular");
  });
});

describe("Enter advances through the other fields", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("patient name, reference and frame name follow one another", () => {
    renderForm();
    const first = field(/Patient first name/);
    first.focus();
    enter(first);
    expect(document.activeElement).toBe(field(/Patient last name/));
    enter(document.activeElement as HTMLElement);
    expect(document.activeElement).toBe(field(/Your order reference/));
    enter(document.activeElement as HTMLElement);
    expect(document.activeElement).toBe(field(/Frame name/));
  });

  it("A, B then DBL — the estimated ED is skipped, as Tab skips it", () => {
    renderForm();
    const a = field(/^A\b/);
    a.focus(); type(a, "52");
    enter(a);
    expect(document.activeElement).toBe(field(/^B\b/));
    type(document.activeElement as HTMLElement, "38");
    enter(document.activeElement as HTMLElement);
    expect(field(/^ED\b/).getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(field(/^DBL\b/));
  });

  it("the ED becomes a normal stop once the person types their own", () => {
    renderForm();
    const a = field(/^A\b/);
    type(a, "52"); type(field(/^B\b/), "38");
    type(field(/^ED\b/), "66");
    expect(field(/^ED\b/).getAttribute("tabindex")).toBe("0");
    field(/^B\b/).focus();
    enter(field(/^B\b/));
    expect(document.activeElement).toBe(field(/^ED\b/));
  });

  it("prescription cells go across the row and down to the next eye", () => {
    renderForm(blankOrder((v) => {
      v.patient = { first: "Ann", last: "Lee" };
      v.frame = { ...v.frame, name: "Ray", mount: "plastic", a: "52", b: "38", dbl: "18" };
      v.lens.od = { m: "plastic", d: "sv", c: "clear" };
    }));
    const odSph = field("OD Sphere");
    odSph.focus();
    enter(odSph);
    expect(document.activeElement).toBe(field("OD Cylinder"));
    enter(field("OD Cylinder")); expect(document.activeElement).toBe(field("OD Axis"));
    enter(field("OD Axis")); expect(document.activeElement).toBe(field("OD Dist PD"));
  });

  it("Enter in the notes box stays a new line (it is not a single-line field)", () => {
    renderForm(blankOrder((v) => {
      v.patient = { first: "Ann", last: "Lee" };
      v.frame = { ...v.frame, name: "Ray", mount: "plastic", a: "52", b: "38", dbl: "18" };
      v.lens.od = { m: "plastic", d: "sv", c: "clear" };
      for (const e of ["od", "os"] as const) v.rx[e] = { ...v.rx[e], sph: "-2.00", pd: "32.0" };
    }));
    fireEvent.click(screen.getByRole("button", { name: "Edit Delivery & notes" })); // complete, so it is folded
    const notes = screen.getByLabelText("Notes to the lab");
    notes.focus();
    const ev = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    notes.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
  });
});
