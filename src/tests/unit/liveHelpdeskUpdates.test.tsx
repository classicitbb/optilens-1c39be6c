import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useLiveHelpdeskInboxUpdates, useLiveHelpdeskTicketUpdates } from "@/features/admin/helpdesk/hooks/useLiveHelpdeskUpdates";

const mocks = vi.hoisted(() => {
  const handlers = new Map<string, (payload: { payload?: { ticket_id?: string; kind?: string } }) => void>();
  const channel = {
    on: vi.fn((_type: string, filter: { event: string }, handler: (payload: { payload?: { ticket_id?: string; kind?: string } }) => void) => {
      handlers.set(filter.event, handler);
      return channel;
    }),
    subscribe: vi.fn(() => channel),
  };

  return {
    channel,
    handlers,
    removeChannel: vi.fn(),
    toast: vi.fn(),
  };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    channel: vi.fn(() => mocks.channel),
    removeChannel: mocks.removeChannel,
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

const TicketHarness = () => {
  useLiveHelpdeskTicketUpdates("ticket-123");
  return null;
};

const InboxHarness = () => {
  useLiveHelpdeskInboxUpdates();
  return null;
};

const renderWithClient = (node: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
  return { invalidate };
};

describe("live Helpdesk updates", () => {
  it("joins the exact private ticket topic and refreshes only ticket-related data", async () => {
    mocks.handlers.clear();
    mocks.channel.on.mockClear();

    const { invalidate } = renderWithClient(<TicketHarness />);

    await waitFor(() => {
      expect(mocks.channel.on).toHaveBeenCalled();
    });
    expect((await import("@/integrations/supabase/client")).supabase.channel).toHaveBeenCalledWith(
      "helpdesk:ticket:ticket-123",
      { config: { private: true } },
    );

    mocks.handlers.get("message_created")?.({ payload: { ticket_id: "ticket-123", kind: "message_created" } });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["helpdesk-ticket-messages", "ticket-123"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["portal-helpdesk-messages", "ticket-123"] });
  });

  it("refreshes the office inbox and visibly announces a customer reply", async () => {
    mocks.handlers.clear();
    mocks.channel.on.mockClear();
    mocks.toast.mockClear();

    const { invalidate } = renderWithClient(<InboxHarness />);

    await waitFor(() => {
      expect(mocks.channel.on).toHaveBeenCalled();
    });
    expect((await import("@/integrations/supabase/client")).supabase.channel).toHaveBeenCalledWith(
      "helpdesk:inbox",
      { config: { private: true } },
    );
    mocks.handlers.get("customer_message")?.({ payload: { ticket_id: "ticket-456", kind: "customer_message" } });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["helpdesk-tickets"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["operator-attention-helpdesk-tickets"] });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "New customer reply" }));
  });
});
