import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ExtraInvoicesCart } from "@/components/cart/ExtraInvoicesCart";
const mocks = vi.hoisted(() => ({ token: vi.fn(), navigate: vi.fn(), invoices: [] as unknown[], error: null as Error | null }));
vi.mock("react-router", async (orig) => ({ ...(await orig<typeof import("react-router")>()), useNavigate: () => mocks.navigate }));
vi.mock("@/features/rx-order/hooks/useOrderExtraInvoices", () => ({ useOrderExtraInvoices: () => ({ data: mocks.invoices, error: mocks.error }), extraInvoicePaymentToken: mocks.token }));
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.error=null; });
const invoice = { id: "extra1", invoice_number: "CV-EX-000001", total_bbd: 12.34, status: "unpaid", lines: [{ description: "Extra coating requested in notes", quantity: 2, unit_price: 6.17 }] };
describe("supplementary invoice checkout", () => {
  it("shows itemised BBD charges and opens the existing payment review from the server token", async () => {
    mocks.invoices=[invoice]; mocks.token.mockResolvedValue("fixture-token");
    render(<MemoryRouter><ExtraInvoicesCart /></MemoryRouter>);
    expect(screen.getByText(/BBD 12.34/)).toBeVisible();
    expect(screen.getByText(/Extra coating requested/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Review & pay invoice" }));
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/pay?token=fixture-token"));
    expect(mocks.token).toHaveBeenCalledWith("extra1");
  });
  it("does not show settled invoices and does not navigate when checkout is refused", async () => {
    mocks.invoices=[{ ...invoice, status: "paid" }];
    const view=render(<MemoryRouter><ExtraInvoicesCart /></MemoryRouter>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    mocks.invoices=[invoice]; mocks.token.mockRejectedValue(new Error("Payment was already started."));
    view.rerender(<MemoryRouter><ExtraInvoicesCart /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Review & pay invoice" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Payment was already started.");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
