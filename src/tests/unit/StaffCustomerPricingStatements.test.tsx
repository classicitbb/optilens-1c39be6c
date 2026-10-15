import { screen } from "@testing-library/dom";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import AssignedPricelistsSection from "@/components/account/sections/AssignedPricelistsSection";
import StatementsSection from "@/components/account/sections/StatementsSection";

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
vi.mock("@/lib/liveDataGateway", () => ({ requestLiveData: vi.fn(async () => ({ statements: [], balance: null })) }));
vi.mock("@/integrations/supabase/client", () => {
  const query: any = new Proxy({}, { get: (_t, prop) => prop === "then" ? (resolve: (v: unknown) => void) => resolve({ data: [], error: null }) : () => query });
  return { supabase: { from: () => query, rpc: () => query, auth: { getSession: async () => ({ data: { session: null } }) } } };
});

const renderStaff = (ui: JSX.Element) => render(
  <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>,
);

describe("staff view of a customer's pricelist and statements", () => {
  it("renders the pricelist without cart or assistant providers", async () => {
    renderStaff(<AssignedPricelistsSection staffTarget={{ userId: "customer-user", crmCustomerId: 7, assignedPricelistId: 3 }} />);
    expect(await screen.findByText("Assigned wholesale pricing for this customer", { exact: false })).toBeInTheDocument();
  });

  it("renders statements for the customer without a Pay Balance action", async () => {
    renderStaff(<StatementsSection staffTarget={{ crmCustomerId: 7, accountNumber: "ACC7", customerName: "Customer" }} />);
    expect(await screen.findByRole("heading", { name: "Statements & Billing" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pay Balance" })).not.toBeInTheDocument();
  });
});
