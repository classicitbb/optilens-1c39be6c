import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import WalkInPaymentsPage from "@/pages/admin/WalkInPaymentsPage";

const mocks = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }), prepare: vi.fn() }));
vi.mock("@/contexts/AdminRoleContext", () => ({ useAdminRole: () => ({ realRole: "admin", isLoading: false }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/lib/payments/customerLinkOrigin", () => ({ isPublicHost: () => true }));
vi.mock("@/lib/payments/scotiaConnect", () => ({ prepareScotiaPayment: mocks.prepare, redirectToScotiaPayment: vi.fn(), SCOTIA_RETURN_URL: "https://example.com/return" }));
vi.mock("@/features/admin/walk-in-payments/useLiveWalkInPayment", () => ({ useLiveWalkInPayment: vi.fn() }));
vi.mock("@/features/admin/walk-in-payments/LinkActivityPanel", () => ({ default: () => <div>Register</div> }));
vi.mock("@/features/admin/walk-in-payments/UnmatchedPaymentsQueue", () => ({ default: () => null }));
vi.mock("@/components/admin/ContactPickerSelect", () => ({ default: () => <select aria-label="Contact"><option>None</option></select> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("opens a popup without taking payment and sends only the selected action on explicit submission", async () => {
  render(<MemoryRouter><WalkInPaymentsPage /></MemoryRouter>);
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "New payment" }));
  expect(screen.getByRole("dialog", { name: "New payment" })).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Customer name"), { target: { value: "Sample customer" } });
  fireEvent.change(screen.getByLabelText("Amount (BBD)"), { target: { value: "25.00" } });
  fireEvent.change(screen.getByLabelText("Customer email"), { target: { value: "sample@example.com" } });
  fireEvent.click(screen.getByRole("radio", { name: "Request by email" }));
  expect(mocks.invoke).not.toHaveBeenCalled();
  expect(mocks.prepare).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Send payment request" }));
  await waitFor(() => expect(mocks.invoke).toHaveBeenCalledOnce());
  expect(mocks.invoke).toHaveBeenCalledWith("scotia-payment", { body: expect.objectContaining({ action: "send-walkin-request", amount: 25, customerEmail: "sample@example.com" }) });
  expect(mocks.prepare).not.toHaveBeenCalled();
});

it("cancels the popup without invoking payment or email actions", () => {
  render(<MemoryRouter><WalkInPaymentsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "New payment" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(mocks.invoke).not.toHaveBeenCalled();
  expect(mocks.prepare).not.toHaveBeenCalled();
});
