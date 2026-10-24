import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateHelpdeskTicket } from "@/features/admin/helpdesk/hooks/useCreateHelpdeskTicket";

const mocks = vi.hoisted(() => ({ insert: vi.fn(), single: vi.fn(), invoke: vi.fn(), toast: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: (table: string) => table === "helpdesk_tickets"
    ? { insert: () => ({ select: () => ({ single: mocks.single }) }) }
    : { insert: mocks.insert },
  functions: { invoke: mocks.invoke },
} }));
const setup = () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return renderHook(useCreateHelpdeskTicket, { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
};
describe("ticket creation completion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.single.mockResolvedValue({ data: { id: "ticket-1" }, error: null });
    mocks.insert.mockResolvedValue({ error: null });
    mocks.invoke.mockResolvedValue({ data: { ok: true }, error: null });
  });
  it("keeps a created ticket successful when its timeline event fails", async () => {
    mocks.insert.mockResolvedValue({ error: { message: "Event denied" } });
    const { result } = setup();
    await act(async () => {
      expect(await result.current.mutateAsync({ title: "Question", ownerUserId: "admin-1", partnerContactId: "contact-1", notifyContact: true })).toBe("ticket-1");
    });
    expect(mocks.invoke).toHaveBeenCalledWith("helpdesk-email", { body: { type: "ticket_created", ticketId: "ticket-1" } });
    expect(mocks.toast).toHaveBeenCalled();
  });
  it.each([
    { data: null, error: new Error("Email unavailable") },
    { data: { ok: true, skipped: "no_recipients" }, error: null },
    { data: { error: "Delivery failed" }, error: null },
  ])("reports an unsuccessful notification without inviting duplicate creation", async (response) => {
    mocks.invoke.mockResolvedValue(response);
    const { result } = setup();
    await act(async () => { expect(await result.current.mutateAsync({ title: "Question", partnerContactId: "contact-1", notifyContact: true })).toBe("ticket-1"); });
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Ticket created, but customer email was not sent" }));
  });
});
