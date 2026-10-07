import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import OperatorAttentionAlert from "@/components/admin/OperatorAttentionAlert";
const mocks = vi.hoisted(() => ({ snooze: vi.fn() }));
vi.mock("@/features/admin/notifications/useOperatorAttentionAlerts", () => ({
  useOperatorAttentionAlerts: () => ({
    items: [{ id: "ticket:1", kind: "ticket", title: "Collect frame", detail: "Helpdesk TCK-1", href: "/admin/helpdesk/tickets/1" }],
    isLoading: false, isSnoozed: false, snooze: mocks.snooze,
  }),
}));
const LocationProbe = () => <output data-testid="location">{useLocation().pathname}</output>;
const renderAlert = () => render(<MemoryRouter><OperatorAttentionAlert /><LocationProbe /></MemoryRouter>);
const openPanel = () => fireEvent.click(screen.getByRole("button", { name: "1 attention item" }));
describe("OperatorAttentionAlert", () => {
  it("starts closed and dismisses without snoozing or losing the count", () => {
    renderAlert();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    openPanel();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss attention panel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 attention item" })).toHaveAttribute("aria-expanded", "false");
    expect(mocks.snooze).not.toHaveBeenCalled();
    openPanel();
    expect(screen.getByText("Collect frame")).toBeInTheDocument();
  });
  it("dismisses with Escape", async () => {
    renderAlert(); openPanel();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
  it("opens Help Desk and closes the panel", () => {
    renderAlert(); openPanel();
    expect(screen.getByRole("button", { name: "Snooze attention alerts" })).toHaveAttribute("aria-haspopup", "menu");
    fireEvent.click(screen.getByRole("button", { name: "Open Help Desk" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/admin/helpdesk/overview");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
