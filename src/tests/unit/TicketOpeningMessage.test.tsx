import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import { TicketOpeningMessage } from "@/features/admin/helpdesk/components/TicketOpeningMessage";
import type { HelpdeskTicketDetail } from "@/features/admin/helpdesk/hooks/useHelpdeskTicketDetail";

const ticket = {
  id: "ticket-123",
  title: "Inquiry about HACKETT ODELIA — Rx 136340",
  description: `Rx Number: 136340\n\nAssistant context:\n${JSON.stringify({
    route: "/profile/orders",
    assistantProfile: "portal_support",
    audience: "dispenser",
    accountAccessStatus: "approved_customer",
    accountCustomer: "Retail",
    market: "",
    issueType: "Inquiry about HACKETT ODELIA — Rx 136340",
    productTopic: "",
    previousResults: [],
  })}`,
  customer_email: "customer@example.com",
  partner_contact: null,
  created_at: "2026-08-07T21:05:00.000Z",
} as HelpdeskTicketDetail;

describe("TicketOpeningMessage", () => {
  it("shows assistant context as plain-language request details", () => {
    const { container } = render(<MemoryRouter><TicketOpeningMessage ticket={ticket} /></MemoryRouter>);

    expect(screen.getByText("Request details")).toBeInTheDocument();
    expect(screen.getByText("My Account › Orders")).toBeInTheDocument();
    expect(screen.getByText("Customer portal support")).toBeInTheDocument();
    expect(screen.getByText("Dispensing professional")).toBeInTheDocument();
    expect(screen.getByText("Approved customer")).toBeInTheDocument();
    expect(screen.getByText("No earlier assistant answers.")).toBeInTheDocument();
    expect(screen.queryByText("Market")).not.toBeInTheDocument();
    expect(container.querySelector("pre")).not.toBeInTheDocument();
    expect(container).not.toHaveTextContent('"assistantProfile"');
  });
});
