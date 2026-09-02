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
  cartDrafts: [] as Array<{ id: string }>,
  rxDrafts: [] as Array<{ id: string }>,
  statementRows: [] as Array<{ id: string; period_end: string | null }>,
  orderRows: [] as Array<{ id: string }>,
}));

vi.mock("@/hooks/usePortalIdentity", () => ({
  usePortalIdentity: () => ({
    identity: null,
    emulation: null,
    effectiveUserId: null,
    canAccessFeature: (feature: string) => {
      if (feature === "statements") return mocks.statementsEnabled;
      if (feature === "rx-order") return mocks.lensAssistantProfileEnabled;
      return true;
    },
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/useCartDrafts", () => ({
  useCartDrafts: () => ({ drafts: mocks.cartDrafts }),
}));

vi.mock("@/features/lens-assistant/api", () => ({
  useRxDrafts: () => ({ data: mocks.rxDrafts }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey?: unknown[] }) => {
    const key = options.queryKey?.[0];
    if (key === "customer-statement-indicator") return { data: mocks.statementRows };
    if (key === "customer-order-indicator") return { data: mocks.orderRows };
    return { data: [] };
  },
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

const renderSidebar = (pathname = "/profile/account") => render(
  <MemoryRouter>
    <AccountSidebar pathname={pathname} />
  </MemoryRouter>,
);

describe("AccountSidebar", () => {
  beforeEach(() => {
    mocks.statementsEnabled = true;
    mocks.isAdmin = false;
    mocks.lensAssistantPublic = false;
    mocks.lensAssistantAdmin = true;
    mocks.lensAssistantProfileEnabled = true;
    mocks.cartDrafts = [];
    mocks.rxDrafts = [];
    mocks.statementRows = [];
    mocks.orderRows = [];
    localStorage.clear();
  });

  it("lets approved customers open statements", () => {
    mocks.statementsEnabled = true;
    mocks.isAdmin = false;
    renderSidebar();

    expect(screen.getByRole("link", { name: "Statements" })).toHaveAttribute("href", "/profile/statements");
  });

  it("keeps payment methods inside My Profile instead of the sidebar", () => {
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Payment Methods" })).not.toBeInTheDocument();
  });

  it("keeps saved addresses inside My Profile instead of the sidebar", () => {
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Address Book" })).not.toBeInTheDocument();
  });

  it("hides statements entirely when the feature is disabled", () => {
    mocks.statementsEnabled = false;
    mocks.isAdmin = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Statements" })).not.toBeInTheDocument();
    expect(screen.queryByText("Statements")).not.toBeInTheDocument();
  });

  it("hides the Rx Order Form entirely for customers without the portal feature", () => {
    mocks.isAdmin = false;
    mocks.lensAssistantProfileEnabled = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Rx Order Form" })).not.toBeInTheDocument();
    expect(screen.queryByText("Rx Order Form")).not.toBeInTheDocument();
  });

  it("lets admins open the Rx Order Form", () => {
    mocks.isAdmin = true;
    renderSidebar();

    expect(screen.getByRole("link", { name: "Rx Order Form" })).toHaveAttribute("href", "/profile/rx-order");
  });

  it("hides the Rx Order Form when this profile has an explicit disabled override", () => {
    mocks.isAdmin = false;
    mocks.lensAssistantProfileEnabled = false;
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Rx Order Form" })).not.toBeInTheDocument();
  });

  it("counts saved cart and Rx drafts together", () => {
    mocks.cartDrafts = [{ id: "cart-1" }];
    mocks.rxDrafts = [{ id: "rx-1" }, { id: "rx-2" }];
    renderSidebar();

    expect(screen.getByLabelText("3 saved drafts")).toBeInTheDocument();
  });

  it("shows unique order and unseen-statement counts", () => {
    mocks.orderRows = [{ id: "order-1" }, { id: "order-1" }, { id: "order-2" }];
    mocks.statementRows = [{ id: "statement-1", period_end: "2026-08-01T00:00:00.000Z" }];
    renderSidebar();

    expect(screen.getByLabelText("2 unique orders")).toBeInTheDocument();
    expect(screen.getByLabelText("1 new statement")).toBeInTheDocument();
  });

  it("does not keep My Account active on a child account route", () => {
    mocks.lensAssistantPublic = true;
    renderSidebar("/profile/rx-order");

    expect(screen.getByRole("link", { name: "My Account" })).not.toHaveClass("bg-primary/10");
    expect(screen.getByRole("link", { name: "Rx Order Form" })).toHaveClass("bg-primary/10");
  });
});
