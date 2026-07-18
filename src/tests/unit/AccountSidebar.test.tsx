import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AccountSidebar from "@/components/account/AccountSidebar";

const mocks = vi.hoisted(() => ({
  statementsEnabled: true,
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    canAccessFeature: (feature: string) => feature === "statements" ? mocks.statementsEnabled : true,
  }),
}));

const renderSidebar = () => render(
  <MemoryRouter>
    <AccountSidebar pathname="/profile/account" />
  </MemoryRouter>,
);

describe("AccountSidebar", () => {
  it("lets approved customers open statements", () => {
    mocks.statementsEnabled = true;
    renderSidebar();

    expect(screen.getByRole("link", { name: "Statements" })).toHaveAttribute("href", "/profile/statements");
  });

  it("keeps statements locked when the feature is disabled", () => {
    mocks.statementsEnabled = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Statements" })).not.toBeInTheDocument();
    expect(screen.getByText("Statements").parentElement).toHaveTextContent("Approval");
  });
});
