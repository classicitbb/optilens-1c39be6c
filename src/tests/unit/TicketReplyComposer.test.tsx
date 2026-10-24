import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    window.localStorage.clear();
    mocks.mutateAsync.mockReset();
  });

  it("keeps an unsent reply across a remount and clears it once sent", async () => {
    const { unmount } = render(<TicketReplyComposer ticketId="ticket-123" />);
    fireEvent.change(screen.getByPlaceholderText("Write a reply to the customer…"), {
      target: { value: "Half-written reply" },
    });
    unmount();

    render(<TicketReplyComposer ticketId="ticket-123" />);
    const box = screen.getByPlaceholderText("Write a reply to the customer…") as HTMLTextAreaElement;
    expect(box.value).toBe("Half-written reply");

    mocks.mutateAsync.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));
    await waitFor(() => expect(box.value).toBe(""));
    expect(window.localStorage.getItem("cv.draft.helpdesk-reply:ticket-123")).toBeNull();
  });

  it("keeps drafts separate per ticket", () => {
    const { unmount } = render(<TicketReplyComposer ticketId="ticket-a" />);
    fireEvent.change(screen.getByPlaceholderText("Write a reply to the customer…"), { target: { value: "For A" } });
    unmount();

    render(<TicketReplyComposer ticketId="ticket-b" />);
    expect((screen.getByPlaceholderText("Write a reply to the customer…") as HTMLTextAreaElement).value).toBe("");
  });

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
        files: [],
      });
    });
  });
});
