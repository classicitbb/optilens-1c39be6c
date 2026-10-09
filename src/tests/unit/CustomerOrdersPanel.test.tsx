import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerOrdersPanel from "@/components/admin/CustomerOrdersPanel";
const mocks = vi.hoisted(() => ({ create: vi.fn(), toast: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket", () => ({ useCreateHelpdeskTicket: () => ({ mutateAsync: mocks.create, isPending: false }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ ilike: () => ({ order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: { id: "new-stage" } }) }) }) }) }) }) } }));
vi.mock("@/components/account/sections/MyOrdersSection", async () => {
  const { default: InquireButton } = await import("@/components/account/InquireButton");
  return { default: () => <InquireButton title="Job question" description="Please check this order" label="Ask about this order" /> };
});
const setup = (contactId: string | null = "selected-contact") => render(
  <QueryClientProvider client={new QueryClient()}><CustomerOrdersPanel target={{ userId: "customer-user", crmCustomerId: 1, accountNumber: "ACCOUNT", ordersUseBillToAccount: false }} contactId={contactId} /></QueryClientProvider>
);
describe("admin contact order questions", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue("ticket-1"); });
  it("sends from the admin to the selected contact with notification enabled", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Ask about this order" }));
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Confirm & send" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ partnerContactId: "selected-contact", ownerUserId: "admin-1", notifyContact: true, sourceChannel: "manual", stageId: "new-stage" })));
  });
  it("blocks tickets without a saved recipient contact", () => {
    setup(null);
    fireEvent.click(screen.getByRole("button", { name: "Ask about this order" }));
    expect(screen.getByRole("button", { name: "Confirm & send" })).toBeDisabled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
