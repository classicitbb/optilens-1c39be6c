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

// The alignment wrapper is the only ancestor that lays the row out full
// width, so find it by that rather than by counting parents: the markdown
// renderer's internal nesting is free to change without breaking this test.
const bubbleContainer = (body: string) =>
  screen.getByText(body).closest<HTMLElement>("div.w-full.flex-col");

describe("TicketMessageBubble", () => {
  it("keeps customer messages left and operator messages right", () => {
    const { rerender } = render(<TicketMessageBubble message={message("inbound")} />);
    expect(bubbleContainer("inbound message")).toHaveClass("w-full", "items-start");

    rerender(<TicketMessageBubble message={message("outbound")} />);
    expect(bubbleContainer("outbound message")).toHaveClass("w-full", "items-end");
  });
});
