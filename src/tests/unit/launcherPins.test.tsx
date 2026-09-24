import type { ReactElement } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import AppLauncher from "@/components/admin/AppLauncher";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { launcherColumns } from "@/features/admin/core/config/launcherLayout";

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

const renderAt = (path: string, ui: ReactElement) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

describe("launcher pins", () => {
  it("lists pinned pages in Shortcuts before Home Page, disambiguates generic labels, and skips stale pins", () => {
    renderAt("/admin/dashboard", <AppLauncher open onClose={() => {}} />);

    const shortcutsSection = screen.getByText("Shortcuts").closest("section")!;
    const hrefs = within(shortcutsSection).getAllByRole("link").map((tile) => tile.getAttribute("href"));
    expect(hrefs.slice(-3)).toEqual(["/admin/orders/quotations", "/admin/leads/settings", "/"]);
    expect(hrefs).not.toContain("/admin/no-longer-exists");
    expect(within(shortcutsSection).getByText("Leads · Settings")).toBeInTheDocument();
    expect(screen.queryByText("Pinned")).not.toBeInTheDocument();
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

describe("launcher layout", () => {
  it("keeps four columns when everything fits", () => {
    expect(launcherColumns([14, 5], { width: 1920, height: 1080 })).toBe(4);
  });

  it("adds columns instead of growing past a short viewport", () => {
    expect(launcherColumns([14, 10], { width: 1920, height: 700 })).toBeGreaterThan(4);
  });

  it("stops widening at the window edge", () => {
    expect(launcherColumns([40, 40], { width: 700, height: 400 })).toBe(6);
  });
});
