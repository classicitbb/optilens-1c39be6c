import type { ReactElement } from "react";
import { screen } from "@testing-library/dom";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import AssignedPricelistsSection from "@/components/account/sections/AssignedPricelistsSection";
import CustomerStatementsPanel from "@/components/admin/CustomerStatementsPanel";

// The admin renders these customer sections with no CartProvider or
// CompanionAssistantProvider (those only wrap the customer shell), so a staff
// view must not require either.
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1", email: "admin@example.com" } }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ isAdmin: true, canEdit: true }) }));
vi.mock("@/hooks/usePortalIdentity", () => ({ usePortalIdentity: () => ({ identity: null }) }));
vi.mock("@/hooks/useUserPriceOverrides", () => ({
  useUserPriceOverrides: () => ({ overrides: new Map(), setOverride: { mutate: vi.fn(), isPending: false }, clearOverride: { mutate: vi.fn() } }),
}));
vi.mock("@/hooks/useUserCurrencyPreference", () => ({
  useUserCurrencyPreference: () => ({ preferredCurrency: null, setPreference: { mutate: vi.fn() } }),
}));
vi.mock("@/hooks/usePortalRxPricingStructure", () => ({ usePortalRxPricingStructure: () => ({ structure: [], isLoading: false }) }));
const statement = {
  id: "11", account_number: "ACC7", statement_date: "2026-09-30", period_start: "2026-09-01", period_end: "2026-09-30",
  opening_balance: 0, closing_balance: 100, aging_amount_1: 0, aging_amount_2: 0, aging_amount_3: 0, aging_amount_4: 0,
};
vi.mock("@/lib/liveDataGateway", () => ({
  requestLiveData: vi.fn(async (key: string) =>
    key === "innovations.customer_statement"
      ? { statement, lines: [{ id: 1, statement_id: "11", invoice_id: 5, order_id: 6, patient: "P", amount: 100, post_date: "2026-09-10" }], retrieved_at: "" }
      : { statements: [statement], balance: { current_balance: 100 } }),
}));
vi.mock("@/integrations/supabase/client", () => {
  const query: any = new Proxy({}, { get: (_t, prop) => prop === "then" ? (resolve: (v: unknown) => void) => resolve({ data: [], error: null }) : () => query });
  return { supabase: { from: () => query, rpc: () => query, auth: { getSession: async () => ({ data: { session: null } }) } } };
});

const renderStaff = (ui: ReactElement) => render(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>,
);

describe("staff view of a customer's pricelist and statements", () => {
  it("renders the pricelist without cart or assistant providers", async () => {
    renderStaff(<AssignedPricelistsSection staffTarget={{ userId: "customer-user", crmCustomerId: 7, assignedPricelistId: 3 }} />);
    expect(await screen.findByText("Assigned wholesale pricing for this customer", { exact: false })).toBeInTheDocument();
  });

  it("renders statements for the customer without a Pay Balance action", async () => {
    renderStaff(<CustomerStatementsPanel target={{ crmCustomerId: 7, accountNumber: "ACC7", customerName: "Customer" }} contactId="contact-1" />);
    expect(await screen.findByRole("heading", { name: "Statements & Billing" })).toBeInTheDocument();
    // Life-buoy question icons use the staff ticket handler, not the customer assistant.
    expect((await screen.findAllByRole("button", { name: "Ask about this statement" })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Pay Balance" })).not.toBeInTheDocument();
  });
});
