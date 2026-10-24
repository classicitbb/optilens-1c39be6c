import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { TicketMessageBubble } from "@/features/admin/helpdesk/components/TicketMessageBubble";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "staff-1" } }) }));

const message = (direction: "inbound" | "outbound", overrides: Record<string, unknown> = {}) => ({
  id: `message-${direction}`,
  ticket_id: "ticket-123",
  direction,
  body: `${direction} message`,
  sender_user_id: null,
  sender_name: direction === "inbound" ? "Customer" : "Classic Visions Support",
  sender_email: null,
  sent_at: "2026-07-30T14:00:00.000Z",
  created_at: "2026-07-30T14:00:00.000Z",
  edited_at: null,
  retracted_at: null,
  ...overrides,
});

const renderBubble = (ui: React.ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

// The alignment wrapper is the only ancestor that lays the row out full
// width, so find it by that rather than by counting parents: the markdown
// renderer's internal nesting is free to change without breaking this test.
const bubbleContainer = (body: string) =>
  screen.getByText(body).closest<HTMLElement>("div.w-full.flex-col");

describe("TicketMessageBubble", () => {
  it("keeps customer messages left and operator messages right", () => {
    const { rerender } = renderBubble(<TicketMessageBubble message={message("inbound")} />);
    expect(bubbleContainer("inbound message")).toHaveClass("w-full", "items-start");

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TicketMessageBubble message={message("outbound")} />
      </QueryClientProvider>,
    );
    expect(bubbleContainer("outbound message")).toHaveClass("w-full", "items-end");
  });

  it("offers Edit and Retract only on the signed-in user's own message", () => {
    const { unmount } = renderBubble(<TicketMessageBubble message={message("outbound", { sender_user_id: "someone-else" })} />);
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
    unmount();

    renderBubble(<TicketMessageBubble message={message("outbound", { sender_user_id: "staff-1" })} />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retract/i })).toBeInTheDocument();
  });

  it("shows a retracted message as a placeholder without its text or actions", () => {
    renderBubble(
      <TicketMessageBubble
        message={message("outbound", { sender_user_id: "staff-1", body: "", retracted_at: "2026-07-30T15:00:00.000Z" })}
      />,
    );
    expect(screen.getByText("This message was retracted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("marks an edited message", () => {
    renderBubble(<TicketMessageBubble message={message("outbound", { edited_at: "2026-07-30T15:00:00.000Z" })} />);
    expect(screen.getByText(/· edited/)).toBeInTheDocument();
  });
});
