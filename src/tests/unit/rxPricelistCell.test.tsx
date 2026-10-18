import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RxPricelistCell } from "@/components/account/RxPricelistCell";

const first = { alias: "100", material: "Poly", design: "Progressive · Classic PAL", colour: "SRCoated" };
const second = { ...first, alias: "101", colour: "UNCoated" };
const setup = (overrides: Partial<React.ComponentProps<typeof RxPricelistCell>> = {}) => {
  const props = {
    context: "Progressive - Good · Material: POLY · Colour / treatment: Clear", lenses: [first],
    catalogLoading: false, catalogError: false, price: 142, wholesaleDisplay: "$71.00", currency: "USD",
    pricesHidden: false, onSave: vi.fn(), onClear: vi.fn(), isSaving: false, readOnly: false,
    canStartOrder: true, onStartOrder: vi.fn(), onRequestQuote: vi.fn(), ...overrides,
  };
  render(<RxPricelistCell {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Lens details:/ }));
  return props;
};

describe("combined Rx pricelist popup", () => {
  it("keeps a tapped popup open after pointer leave and allows a second tap or Close to dismiss", async () => {
    const props = setup();
    const trigger = screen.getByRole("button", { name: /Lens details:/ });
    fireEvent.pointerLeave(trigger, { pointerType: "touch" });
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(screen.getByRole("dialog", { name: "Lens details" })).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.queryByRole("dialog", { name: "Lens details" })).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Close lens details" }));
    expect(screen.queryByRole("dialog", { name: "Lens details" })).not.toBeInTheDocument();
    expect(props.onStartOrder).not.toHaveBeenCalled();
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it("uses the euro symbol on a retail price in euros", () => {
    setup({ pricesHidden: true, currency: "EUR", override: { custom_price: 125, currency_code: "EUR" } });
    expect(screen.getByRole("dialog", { name: "Lens details" })).toHaveTextContent("EUR €125.00");
  });
  it("puts keyboard focus in the popup on activation and returns it on Escape", async () => {
    setup({ lenses: [first, second] });
    const selector = screen.getByLabelText(/Choose a lens/);
    await waitFor(() => expect(selector).toHaveFocus());
    fireEvent.keyDown(selector, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Lens details" })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Lens details:/ })).toHaveFocus();
  });

  it("shows actual form labels and starts the selected lens without changing retail prices", () => {
    const props = setup();
    const popup = screen.getByRole("dialog", { name: "Lens details" });
    expect(within(popup).getByText("Poly")).toBeInTheDocument();
    expect(within(popup).getByText("Progressive · Classic PAL")).toBeInTheDocument();
    expect(within(popup).getByText("SRCoated")).toBeInTheDocument();
    expect(within(popup).getByRole("button", { name: "Enter your own retail price" })).toBeInTheDocument();
    fireEvent.click(within(popup).getByRole("button", { name: "Start Rx order" }));
    expect(props.onStartOrder).toHaveBeenCalledWith(first);
    expect(props.onSave).not.toHaveBeenCalled();
    expect(props.onRequestQuote).not.toHaveBeenCalled();
  });

  it("requires an explicit lens choice when several selections share a price", () => {
    const props = setup({ lenses: [first, second] });
    const start = screen.getByRole("button", { name: "Start Rx order" });
    expect(start).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Choose a lens/), { target: { value: "101" } });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(props.onStartOrder).toHaveBeenCalledWith(second);
  });

  it("retains the inquiry action for customers without Rx ordering", () => {
    const props = setup({ canStartOrder: false });
    expect(screen.queryByRole("button", { name: "Start Rx order" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request a quote" }));
    expect(props.onRequestQuote).toHaveBeenCalledWith("Poly — Progressive · Classic PAL — SRCoated");
    expect(props.onStartOrder).not.toHaveBeenCalled();
  });

  it("edits and cancels the existing retail override within the same popup", () => {
    const props = setup({ pricesHidden: true, override: { custom_price: 250, currency_code: "USD" } });
    const popup = screen.getByRole("dialog", { name: "Lens details" });
    fireEvent.click(within(popup).getByRole("button", { name: "Edit your price" }));
    const input = within(popup).getByRole("spinbutton");
    expect(input).toHaveValue(250);
    fireEvent.change(input, { target: { value: "275" } });
    fireEvent.click(within(popup).getByRole("button", { name: "Cancel retail price edit" }));
    expect(props.onSave).not.toHaveBeenCalled();
    fireEvent.click(within(popup).getByRole("button", { name: "Edit your price" }));
    fireEvent.change(within(popup).getByRole("spinbutton"), { target: { value: "275" } });
    fireEvent.click(within(popup).getByRole("button", { name: "Save retail price" }));
    expect(props.onSave).toHaveBeenCalledWith(275);
    expect(props.onStartOrder).not.toHaveBeenCalled();
  });

  it("keeps staff views read-only", () => {
    setup({ readOnly: true, canStartOrder: false });
    const popup = screen.getByRole("dialog", { name: "Lens details" });
    expect(within(popup).getAllByRole("button")).toHaveLength(1);
    expect(within(popup).getByRole("button", { name: "Close lens details" })).toBeInTheDocument();
  });

  it.each([{ catalogError: true }, { catalogLoading: true }, { lenses: [] }])("cannot start an unresolved lens: %j", (state) => {
    const props = setup(state);
    expect(screen.getByRole("button", { name: "Start Rx order" })).toBeDisabled();
    expect(props.onStartOrder).not.toHaveBeenCalled();
  });

  it("offers assistance instead of a zero-priced order for an unpriced cell", () => {
    setup({ price: null });
    expect(screen.queryByRole("button", { name: "Start Rx order" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request a quote" })).toBeEnabled();
    expect(screen.getByText(/Not offered on this pricelist\./)).toBeInTheDocument();
  });
});
