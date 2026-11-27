import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import LinkActivityPanel from "@/features/admin/walk-in-payments/LinkActivityPanel";

const mocks = vi.hoisted(() => ({ from: vi.fn(), error: null as null | { message: string } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: mocks.from,
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
  removeChannel: vi.fn(),
} }));
beforeEach(() => {
  mocks.error = null;
  const base = { customer_email: "sample@example.com", order_reference: "Order 42", reason: "Lenses", contact_id: null, needs_matching: false, created_at: "2026-11-26T12:00:00Z", link_expires_at: null, token_used_at: null, paid_at: "2026-11-26T12:01:00Z", status: "settled" };
  mocks.from.mockImplementation((table: string) => table === "order_extra_invoices" ? { select: async () => ({ data: [], error: null }) } : {
    select: () => ({ order: () => ({ limit: async () => ({ data: [
      { ...base, id: "cash", customer_name: "Cash Customer", origin: "staff_terminal", provider: "cash", payment_reference: "CASH-42", amount: 12 },
      { ...base, id: "card", customer_name: "Card Customer", origin: "staff_terminal", provider: "scotia", payment_reference: "CARD-43", amount: 24 },
    ], error: mocks.error }) }) }),
  });
});
afterEach(cleanup);
function renderRegister(onOpenReceipt = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><LinkActivityPanel onOpenReceipt={onOpenReceipt} /></QueryClientProvider>);
}
it("includes cash and direct card receipts with separate columns and opens the selected receipt", async () => {
  const open = vi.fn();
  renderRegister(open);
  const cash = await screen.findByRole("row", { name: /Cash Customer/ });
  expect(screen.getByRole("columnheader", { name: "Order / reference" })).toBeTruthy();
  expect(screen.getByRole("columnheader", { name: "Email" })).toBeTruthy();
  expect(screen.getByRole("columnheader", { name: "Paid" })).toBeTruthy();
  expect(screen.getByRole("row", { name: /Card Customer/ })).toBeTruthy();
  expect(within(cash).getByRole("cell", { name: "Cash", exact: true })).toBeTruthy();
  fireEvent.click(within(cash).getByRole("button", { name: "Receipt" }));
  expect(open).toHaveBeenCalledWith("cash");
  fireEvent.change(screen.getByRole("textbox", { name: "Search payments" }), { target: { value: "CARD-43" } });
  expect(screen.queryByRole("row", { name: /Cash Customer/ })).toBeNull();
  expect(screen.getByRole("row", { name: /Card Customer/ })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
});
it("shows read failures instead of presenting a failed query as an empty register", async () => {
  mocks.error = { message: "Read failed" };
  renderRegister();
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load payments");
});
