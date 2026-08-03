import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AccountSidebar from "@/components/account/AccountSidebar";

const mocks = vi.hoisted(() => ({
  statementsEnabled: true,
  isAdmin: false,
  lensAssistantPublic: false,
  lensAssistantAdmin: true,
  lensAssistantProfileEnabled: true,
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    canAccessFeature: (feature: string) => {
      if (feature === "statements") return mocks.statementsEnabled;
      if (feature === "lens-assistant") return mocks.lensAssistantProfileEnabled;
      return true;
    },
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
    mocks.lensAssistantProfileEnabled = true;
  });

  it("lets approved customers open statements", () => {
    mocks.statementsEnabled = true;
    mocks.isAdmin = false;
    renderSidebar();

    expect(screen.getByRole("link", { name: "Statements" })).toHaveAttribute("href", "/profile/statements");
  });

  it("hides statements entirely when the feature is disabled", () => {
    mocks.statementsEnabled = false;
    mocks.isAdmin = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Statements" })).not.toBeInTheDocument();
    expect(screen.queryByText("Statements")).not.toBeInTheDocument();
  });

  it("hides Lens Assistant entirely for customers until the public flag is enabled", () => {
    mocks.isAdmin = false;
    mocks.lensAssistantPublic = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Lens Assistant" })).not.toBeInTheDocument();
    expect(screen.queryByText("Lens Assistant")).not.toBeInTheDocument();
  });

  it("lets admins open Lens Assistant when the admin flag is enabled", () => {
    mocks.isAdmin = true;
    mocks.lensAssistantAdmin = true;
    renderSidebar();

    expect(screen.getByRole("link", { name: "Lens Assistant" })).toHaveAttribute("href", "/profile/lens-assistant?audience=professional");
  });

  it("hides Lens Assistant when this profile has an explicit disabled override", () => {
    mocks.isAdmin = false;
    mocks.lensAssistantPublic = true;
    mocks.lensAssistantProfileEnabled = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Lens Assistant" })).not.toBeInTheDocument();
  });
});
