import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TicketReplyComposer } from "@/features/admin/helpdesk/components/TicketReplyComposer";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/features/admin/helpdesk/hooks/useTicketMessageMutation", () => ({
  useTicketMessageMutation: () => ({ mutateAsync: mocks.mutateAsync, isPending: false }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe("TicketReplyComposer", () => {
  it("handles a failed send without an unhandled event-handler rejection", async () => {
    mocks.mutateAsync.mockRejectedValueOnce(new Error("column reference \"ticket_id\" is ambiguous"));

    render(<TicketReplyComposer ticketId="ticket-123" />);
    fireEvent.change(screen.getByPlaceholderText("Write a reply to the customer…"), {
      target: { value: "Reply to send" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() => {
      expect(mocks.mutateAsync).toHaveBeenCalledWith({
        ticketId: "ticket-123",
        direction: "outbound",
        body: "Reply to send",
      });
    });
  });
});
