import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuoteFormSection from "@/components/account/sections/QuoteFormSection";
import CompanionAssistant from "@/components/assistant/CompanionAssistant";
import { CompanionAssistantProvider } from "@/features/assistant/CompanionAssistantContext";

const { rpc, from, toast } = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "customer@example.com" } }),
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    emulation: null,
    effectiveUserId: "user-1",
    identity: { crmCustomerId: 42, crmContactId: "contact-1", organizationName: "Example Optical", customerName: "Example Optical" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

vi.mock("@/hooks/useStoreProducts", () => ({ useStoreProducts: () => ({ data: [] }) }));
vi.mock("@/hooks/useContentArticles", () => ({ usePublicKnowledge: () => ({ data: [] }) }));
vi.mock("@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket", () => ({ useCreateHelpdeskTicket: () => ({ mutateAsync: vi.fn() }) }));
vi.mock("@/features/assistant/assistantGeneration", () => ({ generateAssistantAnswer: vi.fn(async () => null) }));
vi.mock("@/lib/cookieConsent", () => ({ hasGivenConsent: () => true, COOKIE_PREFERENCES_EVENT: "cookie-preferences-changed" }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from, rpc },
}));

const quoteRows = [
  {
    id: "quote-1",
    quote_number: "Q-000001",
    status: "Draft",
    quote_type: "STOCK",
    created_at: "2026-08-06T12:00:00.000Z",
    customer_name: "Example Optical",
    notes_customer: "Twenty progressive lenses\nAnti-reflective coating",
    account_id: 42,
    helpdesk_ticket_id: "ticket-1",
  },
  {
    id: "quote-legacy",
    quote_number: "Q-000000",
    status: "Draft",
    quote_type: "STOCK",
    created_at: "2026-08-05T12:00:00.000Z",
    customer_name: "Legacy Optical",
    notes_customer: "Legacy request",
    account_id: 42,
    helpdesk_ticket_id: null,
  },
];

const renderSection = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/profile/quotes"]}>
        <CompanionAssistantProvider>
          <Routes>
            <Route path="/profile/quotes" element={<><QuoteFormSection /><CompanionAssistant /></>} />
            <Route path="/profile/helpdesk/:ticketId" element={<div>Conversation opened</div>} />
          </Routes>
        </CompanionAssistantProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("QuoteFormSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockImplementation((table: string) => {
      if (table === "quotes_customer") {
        return {
          select: () => ({ order: () => ({ limit: async () => ({ data: quoteRows, error: null }) }) }),
        };
      }
      if (table === "helpdesk_tickets") {
        return {
          select: () => ({
            in: async () => ({
              data: [{ id: "ticket-1", ticket_number: "PTL-ABC123", closed_at: null, stage: { name: "New", is_closed: false } }],
              error: null,
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });
    rpc.mockResolvedValue({
      data: [{ quote_id: "quote-2", quote_number: "Q-000002", ticket_id: "ticket-2", ticket_number: "PTL-DEF456" }],
      error: null,
    });
  });

  it("shows immutable request content and links only linked requests to Helpdesk", async () => {
    renderSection();

    expect(await screen.findByText("Twenty progressive lenses", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Helpdesk PTL-ABC123 · New")).toBeInTheDocument();
    expect(screen.getByText("Legacy request · No Helpdesk conversation")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /view conversation/i })).toHaveLength(1);
  });

  it("moves quote intake into the assistant while preserving quote history", async () => {
    renderSection();
    await screen.findByText("Example Optical", { exact: false });

    fireEvent.click(screen.getByRole("button", { name: "Request a quote" }));
    expect(await screen.findByText(/what would you like a quote for/i)).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Quote request form" })).toBeInTheDocument();
    expect(screen.getByLabelText("Quote title")).toBeInTheDocument();
    expect(screen.getByLabelText("Description (optional)")).toBeInTheDocument();
    expect(screen.getByText("This quote will be prepared for Example Optical.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask anything")).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form", { name: "Quote request form" })).not.toBeInTheDocument();
    expect(screen.queryByText(/what would you like a quote for/i)).not.toBeInTheDocument();
    expect(screen.getByText("No request was sent. What else can I help with?")).toBeInTheDocument();
  });
});
