import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import OperatorAttentionAlert from "@/components/admin/OperatorAttentionAlert";

const mocks = vi.hoisted(() => ({
  snooze: vi.fn(),
}));

vi.mock("@/features/admin/notifications/useOperatorAttentionAlerts", () => ({
  useOperatorAttentionAlerts: () => ({
    items: [{ id: "ticket:1", kind: "ticket", title: "Collect frame", detail: "Helpdesk TCK-1", href: "/admin/helpdesk/tickets/1" }],
    isLoading: false,
    isSnoozed: false,
    snooze: mocks.snooze,
  }),
}));

const LocationProbe = () => <output data-testid="location">{useLocation().pathname}</output>;

const renderAlert = () => render(
  <MemoryRouter initialEntries={["/admin/finance/walk-in-payments"]}>
    <OperatorAttentionAlert />
    <LocationProbe />
  </MemoryRouter>,
);

describe("OperatorAttentionAlert", () => {
  it("collapses into a compact handle and expands again without snoozing", () => {
    renderAlert();

    const collapse = screen.getByRole("button", { name: "Collapse attention alert" });
    expect(collapse).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(collapse);

    expect(screen.queryByText("This alert remains until the ticket or task reaches its handled state.")).not.toBeInTheDocument();
    const expand = screen.getByRole("button", { name: "Expand attention alert" });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(mocks.snooze).not.toHaveBeenCalled();

    fireEvent.click(expand);
    expect(screen.getByText("This alert remains until the ticket or task reaches its handled state.")).toBeInTheDocument();
  });

  it("opens Help Desk while leaving the Snooze control available", () => {
    renderAlert();

    fireEvent.click(screen.getByRole("button", { name: "Open Help Desk" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/helpdesk/overview");

    expect(screen.getByRole("button", { name: "Snooze attention alerts" })).toHaveAttribute("aria-haspopup", "menu");
  });
});
