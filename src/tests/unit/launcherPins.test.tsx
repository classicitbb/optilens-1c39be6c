import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import AppLauncher from "@/components/admin/AppLauncher";
import AdminSidebar from "@/components/admin/AdminSidebar";

const mocks = vi.hoisted(() => ({
  toggle: vi.fn(),
  pinnedRoutes: ["/admin/orders/quotations", "/admin/leads/settings", "/admin/no-longer-exists"],
}));

vi.mock("@/features/admin/core/hooks/useLauncherPins", () => ({
  useLauncherPins: () => ({
    pinnedRoutes: mocks.pinnedRoutes,
    isPinned: (route: string) => mocks.pinnedRoutes.includes(route),
    toggle: mocks.toggle,
  }),
}));

vi.mock("@/hooks/useRolePermissions", () => ({
  useRolePermissions: () => ({ hasAppAccess: () => true }),
}));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

const renderAt = (path: string, ui: JSX.Element) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

describe("launcher pins", () => {
  it("shows pinned pages first, disambiguates generic labels, and skips stale pins", () => {
    renderAt("/admin/dashboard", <AppLauncher open onClose={() => {}} />);

    const pinnedSection = screen.getByText("Pinned").closest("section")!;
    const tiles = within(pinnedSection).getAllByRole("link");
    expect(tiles.map((tile) => tile.getAttribute("href"))).toEqual(["/admin/orders/quotations", "/admin/leads/settings"]);
    expect(within(pinnedSection).getByText("Quotations")).toBeInTheDocument();
    expect(within(pinnedSection).getByText("Leads · Settings")).toBeInTheDocument();
  });

  it("unpins a launcher tile from its right-click menu", async () => {
    mocks.toggle.mockClear();
    renderAt("/admin/dashboard", <AppLauncher open onClose={() => {}} />);

    fireEvent.contextMenu(screen.getByText("Quotations"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Unpin from launcher" }));

    expect(mocks.toggle).toHaveBeenCalledWith("/admin/orders/quotations");
  });

  it("offers Pin to launcher when right-clicking a sidebar item", async () => {
    mocks.toggle.mockClear();
    renderAt("/admin/orders", <AdminSidebar />);

    fireEvent.contextMenu(screen.getByRole("link", { name: "Stock Order Builder" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Pin to launcher" }));

    expect(mocks.toggle).toHaveBeenCalledWith("/admin/orders/stock-orders");
  });
});
