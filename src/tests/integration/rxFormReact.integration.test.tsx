// The React Rx form, driven the way a person drives it. The backend hooks are
// mocked at their boundary (catalogue, save, cart); everything between — the
// state hook, the pure model, the cards, the quote panel — is the real code.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { DEFAULT_SURCHARGE_RULES } from "@/features/rx-order/domain/price";
import { buildOrder, derive, valuesFromOrder } from "@/features/rx-order/form/model";
import { defaultValues, type RxCatalog, type RxFormValues } from "@/features/rx-order/form/types";

const mocks = vi.hoisted(() => ({
  persist: vi.fn(),
  addToCart: vi.fn(),
  rpc: vi.fn(),
  saveDraft: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/features/rx-order/embed/rx-order-adapter", () => ({
  persistPayload: mocks.persist,
  syntheticCartProductId: () => -42,
  savedRxPayload: () => null,
}));
vi.mock("@/hooks/useCart", () => ({ useCart: () => ({ addToCart: mocks.addToCart }) }));
vi.mock("@/hooks/useCartDrafts", () => ({ useCartDrafts: () => ({ drafts: [] }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/lens-assistant/api", () => ({
  useRxDrafts: () => ({ data: [] }),
  useSaveEmbeddedRxOrderDraft: () => ({ mutateAsync: mocks.saveDraft }),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, from: vi.fn() } }));

const catalog: RxCatalog = {
  materials: [{ id: "plastic", n: "Plastic 1.50", up: 0 }, { id: "poly", n: "Polycarbonate", up: 0 }],
  designs: [{ id: "sv", n: "Single Vision", v: "sv", base: 0 }, { id: "prog", n: "Progressive", v: "mf", base: 0, prog: true, needsAdd: true }],
  colours: [{ id: "clear", n: "Clear", up: 0 }, { id: "photo", n: "Photochromic Grey", up: 0 }],
  combos: [{ m: "plastic", d: "sv", c: "clear" }, { m: "plastic", d: "sv", c: "photo" }, { m: "poly", d: "sv", c: "clear" }, { m: "plastic", d: "prog", c: "clear" }],
  treatments: [
    { id: "ar1", c: "Anti-reflective", n: "Super AR", d: "Premium anti-reflective", p: 48, grp: "ar", pop: true },
    { id: "ar2", c: "Anti-reflective", n: "Blue Defence", d: "Blue-light AR", p: 62, grp: "ar", pop: true },
  ],
  clashes: [],
  lensPrice: () => 100,
  hasPriceSource: true,
  blockUnpricedOrders: false,
  surchargeRules: DEFAULT_SURCHARGE_RULES,
  accountCountry: "BB",
  pricesVisible: true,
};
const accounts = [{ id: 776, name: "Retail", account_number: "RETAIL" }];

let currentCatalog = catalog;
vi.mock("@/features/rx-order/form/useRxCatalog", () => ({
  useRxCatalog: () => ({
    catalog: currentCatalog,
    persistContext: { lensIndex: new Map(), addons: [], lensPriceBBD: () => 100, resolveAlias: () => null },
    accounts, effectiveAccountId: 776, defaultAccountId: 776, loading: false,
  }),
}));

import RxForm from "@/features/rx-order/form/RxForm";

const validValues = (): RxFormValues => {
  const v = defaultValues(776);
  v.patient = { first: "Ann", last: "Lee" };
  v.frame = { ...v.frame, name: "Ray", mount: "plastic", a: "52", b: "38", dbl: "18" };
  v.lens.od = { m: "plastic", d: "sv", c: "clear" };
  v.lens.diameter = "70";
  for (const e of ["od", "os"] as const) v.rx[e] = { ...v.rx[e], sph: "-2.00", cyl: "-0.75", axis: "90", pd: "32.0" };
  return v;
};
const savedOrder = (v = validValues()) =>
  buildOrder(v, derive(v, currentCatalog), currentCatalog, { orderNo: "80000001", account: { id: 776, name: "Retail" }, source: "form" });

// the desktop button and the phone's bottom bar both exist in the DOM
const submitButton = (name: string) => screen.getAllByRole("button", { name })[0];

const renderForm = (props: Partial<React.ComponentProps<typeof RxForm>> = {}) =>
  render(<MemoryRouter><RxForm quoteId={null} surface="admin" lockedAccountId={776} {...props} /></MemoryRouter>);

beforeEach(() => {
  currentCatalog = catalog;
  mocks.persist.mockReset().mockResolvedValue({ totalBBD: 100, quoteId: "q1", quoteNumber: "Q-1", rxOrderNumber: 80000001, created: true });
  mocks.addToCart.mockReset().mockResolvedValue(true);
  mocks.rpc.mockReset().mockResolvedValue({ data: { ok: true }, error: null });
  mocks.saveDraft.mockReset().mockResolvedValue({ id: "draft-1" });
  mocks.toast.mockReset();
});

describe("RxForm", () => {
  it("opens empty with only the first card, the next one named, and nothing saved", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "Patient & order" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Frame & measurements" })).not.toBeInTheDocument();
    expect(screen.getByText(/opens next/)).toBeInTheDocument();
    expect(submitButton("Submit to cart")).toBeDisabled();
    expect(mocks.persist).not.toHaveBeenCalled();
  });

  it("reveals the next card as the patient name is completed, and folds the finished one when focus leaves", () => {
    renderForm();
    fireEvent.focus(screen.getByLabelText(/Patient first name/));
    fireEvent.change(screen.getByLabelText(/Patient first name/), { target: { value: "Ann" } });
    fireEvent.change(screen.getByLabelText(/Patient last name/), { target: { value: "Lee" } });
    expect(screen.getByRole("heading", { name: "Frame & measurements" })).toBeInTheDocument();
    // focus moves into the new card → the finished one folds into a summary
    fireEvent.focus(screen.getByLabelText(/Frame name/));
    expect(screen.queryByLabelText(/Patient first name/)).not.toBeInTheDocument();
    expect(screen.getByText("ANN LEE")).toBeInTheDocument();
    // and Edit brings it back
    fireEvent.click(screen.getByRole("button", { name: "Edit Patient & order" }));
    expect(screen.getByLabelText(/Patient first name/)).toBeInTheDocument();
  });

  it("a saved order reopens complete: every card present, the quote priced, submit ready", () => {
    renderForm({ prefill: savedOrder() });
    for (const name of ["Patient & order", "Frame & measurements", "Lens selection", "Prescription", "Coatings & treatments", "Delivery & notes"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    const quote = screen.getByLabelText("Order quote");
    expect(within(quote).getByText("100.00", { selector: "p *, p" })).toBeInTheDocument();
    expect(submitButton("Submit to cart")).toBeEnabled();
    expect(within(screen.getByLabelText("Order quote")).getAllByText("Prescription complete & valid")).toHaveLength(1);
  });

  it("normalises a typed prescription when the cell loses focus and shows the error beside it", () => {
    renderForm({ prefill: savedOrder() });
    fireEvent.click(screen.getByRole("button", { name: "Edit Prescription" }));
    const sph = screen.getByLabelText("OD Sphere") as HTMLInputElement;
    fireEvent.change(sph, { target: { value: "125" } });
    expect(sph.value).toBe("125");
    fireEvent.blur(sph);
    expect(sph.value).toBe("+1.25"); // shorthand read as 1.25 and signed
    fireEvent.change(sph, { target: { value: "-30" } });
    fireEvent.blur(sph);
    expect(sph.value).toBe("-25.00"); // clamped to the producible range
    const pd = screen.getByLabelText("OD Dist PD") as HTMLInputElement;
    fireEvent.change(pd, { target: { value: "" } });
    expect(screen.getByText("OD distance PD must be 20–45 mm.")).toBeInTheDocument();
    expect(submitButton("Submit to cart")).toBeDisabled();
  });

  it("submits to the cart at the saved total, then offers what next", async () => {
    renderForm({ prefill: savedOrder() });
    fireEvent.click(submitButton("Submit to cart"));
    await waitFor(() => expect(mocks.addToCart).toHaveBeenCalledTimes(1));
    const [, v1] = mocks.persist.mock.calls[0]; // (quoteId, payload, ctx)
    expect(v1.schema).toBe("cv.rxorder/1");
    expect(v1.patient).toEqual({ first: "Ann", last: "Lee" });
    expect(v1.quote.lines.some((l: any) => l.lens)).toBe(true);
    expect(mocks.addToCart.mock.calls[0][0]).toMatchObject({ price: 100, variantMetadata: { rx_quote_id: "q1", kind: "rx_order" } });
    expect(await screen.findByText("Added to your cart")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checkout now" })).toBeInTheDocument();
  });

  it("a credit-approved account places the order directly and never touches the cart", async () => {
    renderForm({ prefill: savedOrder(), allowDirectSubmit: true });
    fireEvent.click(submitButton("Place order now"));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledWith("place_rx_order_direct", expect.anything()));
    expect(mocks.addToCart).not.toHaveBeenCalled();
    expect(await screen.findByText("Order placed on your account")).toBeInTheDocument();
  });

  it("test mode saves tagged as a test and sends nothing anywhere", async () => {
    const onTestSubmitted = vi.fn();
    renderForm({ prefill: savedOrder(), isTest: true, onTestSubmitted });
    expect(screen.getByText(/Test order\./)).toBeInTheDocument();
    fireEvent.click(submitButton("Submit to cart"));
    await waitFor(() => expect(onTestSubmitted).toHaveBeenCalledWith("Would be added to the cart", expect.objectContaining({ quoteId: "q1" })));
    expect(mocks.persist.mock.calls[0][2]).toMatchObject({ isTest: true });
    expect(mocks.addToCart).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.saveDraft).not.toHaveBeenCalled();
  });

  it("an unpriced lens is flagged, and blocks submit only when the switch is on", () => {
    currentCatalog = { ...catalog, lensPrice: () => null };
    const { unmount } = renderForm({ prefill: savedOrder() });
    expect(screen.getAllByText(/not priced on this account/i).length).toBeGreaterThan(0);
    expect(submitButton("Submit to cart")).toBeEnabled();
    unmount();
    currentCatalog = { ...catalog, lensPrice: () => null, blockUnpricedOrders: true };
    renderForm({ prefill: savedOrder() });
    expect(submitButton("Submit to cart")).toBeDisabled();
  });

  it("hides prices on an account that may not see them", () => {
    currentCatalog = { ...catalog, pricesVisible: false };
    renderForm({ prefill: savedOrder() });
    expect(screen.getByText(/Your order details are ready to review/)).toBeInTheDocument();
    expect(screen.queryByText("100.00")).not.toBeInTheDocument();
  });

  it("does not save an empty form, and 'Save draft' on one says so", async () => {
    renderForm();
    fireEvent.click(screen.getAllByRole("button", { name: /Save draft|Save as draft/ })[0]);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith({ description: "Nothing to save yet" }));
    expect(mocks.persist).not.toHaveBeenCalled();
  });
});
