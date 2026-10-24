import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomerOrdersPanel from "@/components/admin/CustomerOrdersPanel";
const mocks = vi.hoisted(() => ({ create: vi.fn(), toast: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "admin-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket", () => ({ useCreateHelpdeskTicket: () => ({ mutateAsync: mocks.create, isPending: false }) }));
vi.mock("@/integrations/supabase/client", () => {
  const query: any = new Proxy({}, { get: (_t, prop) => prop === "then" ? (resolve: (v: unknown) => void) => resolve({ data: [], error: null }) : () => query });
  return { supabase: { from: () => query, rpc: () => query } };
});
vi.mock("@/components/admin/ContactPickerSelect", () => ({ default: () => null }));
vi.mock("@/components/admin/InlineDictationButton", () => ({ default: () => null }));
vi.mock("@/components/admin/TidySuggestionChip", () => ({ default: () => null }));
vi.mock("@/components/account/HelpdeskImageAttachments", () => ({ HelpdeskImageAttachments: () => null }));
vi.mock("@/components/account/sections/MyOrdersSection", async () => {
  const { default: InquireButton } = await import("@/components/account/InquireButton");
  return { default: () => <InquireButton title="Job question" description="Please check this order" label="Ask about this order" /> };
});
const setup = (contactId: string | null = "selected-contact") => render(
  <QueryClientProvider client={new QueryClient()}><CustomerOrdersPanel target={{ userId: "customer-user", crmCustomerId: 1, accountNumber: "ACCOUNT", ordersUseBillToAccount: false }} contactId={contactId} /></QueryClientProvider>
);
describe("admin contact order questions", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue("ticket-1"); });
  it("opens the shared ticket form prefilled for the selected contact with notification enabled", async () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Ask about this order" }));
    expect(await screen.findByRole("heading", { name: "Create Ticket" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Job question")).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Create Ticket" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ title: "Job question", partnerContactId: "selected-contact", ownerUserId: "admin-1", notifyContact: true, sourceChannel: "manual" })));
  });
});
