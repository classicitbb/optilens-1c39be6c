import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TicketMessageBubble } from "@/features/admin/helpdesk/components/TicketMessageBubble";

const message = (direction: "inbound" | "outbound") => ({
  id: `message-${direction}`,
  ticket_id: "ticket-123",
  direction,
  body: `${direction} message`,
  sender_user_id: null,
  sender_name: direction === "inbound" ? "Customer" : "Classic Visions Support",
  sender_email: null,
  sent_at: "2026-07-30T14:00:00.000Z",
  created_at: "2026-07-30T14:00:00.000Z",
});

const bubbleContainer = (body: string) =>
  screen.getByText(body).closest("p")?.parentElement?.parentElement?.parentElement;

describe("TicketMessageBubble", () => {
  it("keeps customer messages left and operator messages right", () => {
    const { rerender } = render(<TicketMessageBubble message={message("inbound")} />);
    expect(bubbleContainer("inbound message")).toHaveClass("w-full", "items-start");

    rerender(<TicketMessageBubble message={message("outbound")} />);
    expect(bubbleContainer("outbound message")).toHaveClass("w-full", "items-end");
  });
});
