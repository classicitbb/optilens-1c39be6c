import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AccountSidebar from "@/components/account/AccountSidebar";

const mocks = vi.hoisted(() => ({
  statementsEnabled: true,
  isAdmin: false,
  lensAssistantPublic: false,
  lensAssistantAdmin: true,
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    canAccessFeature: (feature: string) => feature === "statements" ? mocks.statementsEnabled : true,
  }),
}));

vi.mock("@/hooks/useUserRole", () => ({
  useUserRole: () => ({ isAdmin: mocks.isAdmin }),
}));

vi.mock("@/hooks/useWebsiteFeatures", () => ({
  useWebsiteFeature: (key: string) => ({
    enabled: key === "lens_assistant_admin" ? mocks.lensAssistantAdmin : mocks.lensAssistantPublic,
    isLoading: false,
    feature: null,
  }),
}));

const renderSidebar = () => render(
  <MemoryRouter>
    <AccountSidebar pathname="/profile/account" />
  </MemoryRouter>,
);

describe("AccountSidebar", () => {
  beforeEach(() => {
    mocks.statementsEnabled = true;
    mocks.isAdmin = false;
    mocks.lensAssistantPublic = false;
    mocks.lensAssistantAdmin = true;
  });

  it("lets approved customers open statements", () => {
    mocks.statementsEnabled = true;
    mocks.isAdmin = false;
    renderSidebar();

    expect(screen.getByRole("link", { name: "Statements" })).toHaveAttribute("href", "/profile/statements");
  });

  it("keeps statements locked when the feature is disabled", () => {
    mocks.statementsEnabled = false;
    mocks.isAdmin = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Statements" })).not.toBeInTheDocument();
    expect(screen.getByText("Statements").parentElement).toHaveTextContent("Approval");
  });

  it("keeps Lens Assistant disabled for customers until the public flag is enabled", () => {
    mocks.isAdmin = false;
    mocks.lensAssistantPublic = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Lens Assistant" })).not.toBeInTheDocument();
    expect(screen.getByText("Lens Assistant").parentElement).toHaveTextContent("Feature");
  });

  it("lets admins open Lens Assistant when the admin flag is enabled", () => {
    mocks.isAdmin = true;
    mocks.lensAssistantAdmin = true;
    renderSidebar();

    expect(screen.getByRole("link", { name: "Lens Assistant" })).toHaveAttribute("href", "/lens-assistant?audience=professional");
  });
});
