import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuoteFormSection from "@/components/account/sections/QuoteFormSection";

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
    identity: { crmCustomerId: 42, crmContactId: "contact-1" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast }) }));

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
        <Routes>
          <Route path="/profile/quotes" element={<QuoteFormSection />} />
          <Route path="/profile/helpdesk/:ticketId" element={<div>Conversation opened</div>} />
        </Routes>
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

  it("submits through the atomic RPC and opens the new ticket on demand", async () => {
    renderSection();
    await screen.findByText("Example Optical", { exact: false });

    fireEvent.change(screen.getByLabelText("Customer or business"), { target: { value: "New Optical" } });
    fireEvent.change(screen.getByLabelText("Request details"), { target: { value: "Please quote 10 photochromic lenses" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit quote request" }));

    await waitFor(() => expect(rpc).toHaveBeenCalledWith("submit_customer_quote_request", {
      p_customer_name: "New Optical",
      p_request_details: "Please quote 10 photochromic lenses",
      p_account_id: 42,
    }));
    expect(await screen.findByText("Request sent and locked")).toBeInTheDocument();
    expect(screen.getByText(/PTL-DEF456/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /view conversation/i }).at(-1)!);
    expect(await screen.findByText("Conversation opened")).toBeInTheDocument();
  });
});
