import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import ProfessionalsPortalPage from "@/pages/ProfessionalsPortalPage";

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  submitPublicInquiry: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
  rpc: vi.fn(),
  authState: {
    user: {
      id: "user-1",
      email: "jordan@example.com",
      user_metadata: {
        full_name: "Jordan Smith",
        phone: "+1 246 555 0101",
        organization_name: "Vision Center",
      },
    } as null | { id: string; email?: string; user_metadata?: Record<string, unknown> },
  },
}));

vi.mock("@/components/Header", () => ({ default: () => <div>Header</div> }));
vi.mock("@/components/Footer", () => ({ default: () => <div>Footer</div> }));
vi.mock("@/components/seo/Seo", () => ({ default: () => null }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.authState.user,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock("@/lib/publicInquiry", () => ({
  submitPublicInquiry: mocks.submitPublicInquiry,
}));

vi.mock("@/features/admin/helpdesk/utils/structuredTicketing", () => ({
  createStructuredHelpdeskTicket: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: mocks.maybeSingle,
            }),
          }),
          upsert: mocks.upsert,
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: vi.fn(),
          }),
        }),
      };
    },
    rpc: mocks.rpc,
  },
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/professionals/trade-account"]}>
      <Routes>
        <Route path="/professionals/:slug" element={<ProfessionalsPortalPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProfessionalsPortalPage", () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.submitPublicInquiry.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.upsert.mockReset();
    mocks.rpc.mockReset();
    mocks.maybeSingle.mockResolvedValue({
      data: {
        full_name: "Jordan Smith",
        phone: "+1 246 555 0101",
        organization_name: "Vision Center",
        email: "jordan@example.com",
      },
    });
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    mocks.submitPublicInquiry.mockResolvedValue(undefined);
  });

  it("prefills trade-account details for signed-in users and syncs profile values on submit", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Business Name")).toHaveValue("Vision Center");
      expect(screen.getByLabelText("Contact Name")).toHaveValue("Jordan Smith");
      expect(screen.getByLabelText("Business Email")).toHaveValue("jordan@example.com");
      expect(screen.getByLabelText("Phone")).toHaveValue("+1 246 555 0101");
    });

    fireEvent.change(screen.getByPlaceholderText("https://yourbusiness.com"), { target: { value: "https://vision.example.com" } });
    fireEvent.change(screen.getByLabelText("Notes"), { target: { value: "Looking for wholesale onboarding." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => {
      expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: "user-1",
        full_name: "Jordan Smith",
        organization_name: "Vision Center",
        phone: "+1 246 555 0101",
        email: "jordan@example.com",
      }), { onConflict: "user_id" });
      expect(mocks.rpc).toHaveBeenCalledWith("sync_customer_portal_identity", { p_user_id: "user-1" });
      expect(mocks.submitPublicInquiry).toHaveBeenCalledWith(expect.objectContaining({
        inquiryType: "trade_account",
        name: "Jordan Smith",
        businessName: "Vision Center",
        email: "jordan@example.com",
        phone: "+1 246 555 0101",
      }));
    });
  });
});
