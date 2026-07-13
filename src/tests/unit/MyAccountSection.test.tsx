import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import MyAccountSection from "@/components/account/sections/MyAccountSection";

const mocks = vi.hoisted(() => ({
  accountNumber: "RETAIL" as string | null,
  signOut: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "customer@example.com", user_metadata: {} }, signOut: mocks.signOut }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ role: "customer", hasAccess: false }),
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    identity: {
      portalAccessNote: "Your account is ready.",
      portalAccessStatus: "approved_customer",
      emailVerified: true,
      profileCompleted: true,
      crmContactId: "contact-1",
      crmCustomerId: 3,
      accountNumber: mocks.accountNumber,
    },
  }),
}));

vi.mock("@/hooks/useCustomerAddresses", () => ({
  useCustomerAddresses: () => ({ addresses: [{}] }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { full_name: "Customer", phone: "+12465550101", display_name: "Customer", bio: "", avatar_url: "", organization_name: "Classic Visions" },
            error: null,
          }),
        }),
      }),
    }),
    rpc: vi.fn(),
    auth: { resetPasswordForEmail: vi.fn() },
  },
}));

const renderSection = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>
      <MyAccountSection />
    </MemoryRouter>
  </QueryClientProvider>,
);

describe("MyAccountSection", () => {
  beforeEach(() => {
    mocks.accountNumber = "RETAIL";
    mocks.signOut.mockReset();
    mocks.toast.mockReset();
  });

  it("shows the source-managed ERP account number and signs out from the form actions", async () => {
    renderSection();

    expect(await screen.findByRole("status", { name: "ERP Account Number" })).toHaveTextContent("RETAIL");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mocks.signOut).toHaveBeenCalledOnce();
  });

  it("uses ACC# when no ERP account is linked", async () => {
    mocks.accountNumber = null;
    renderSection();

    expect(await screen.findByRole("status", { name: "ERP Account Number" })).toHaveTextContent("ACC#");
  });
});
