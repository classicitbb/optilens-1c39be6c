import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import GlobalSearch from "@/components/admin/GlobalSearch";
const state = vi.hoisted(() => ({ mobile: true }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => state.mobile }));
vi.mock("@/hooks/useRolePermissions", () => ({ PATH_FEATURE_MAP: {}, useRolePermissions: () => ({ canView: () => true, canEditFeature: () => true, hasAppAccess: () => true }) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: [] }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/features/atlas/hooks/useAtlas", () => ({ useAtlasSource: () => ({}), useAtlasCapabilities: () => ({ bySpace: {} }) }));
vi.mock("@/features/admin/core/hooks/useRecentModules", () => ({ useRecentModules: () => ["/admin/orders/rx-capture"] }));
afterEach(cleanup);
describe("responsive admin search", () => {
  it("starts as a mobile button, focuses the expanded field, and closes on Escape", async () => {
    state.mobile = true;
    render(<MemoryRouter><GlobalSearch /></MemoryRouter>);
    const trigger = screen.getByRole("button", { name: "Search admin" });
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("searchbox")).toHaveFocus();
    expect(screen.getByText("Rx Capture")).toBeVisible();
    fireEvent.keyDown(screen.getByRole("searchbox"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("searchbox")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(document, { ctrlKey: true, key: "k" });
    expect(screen.getByRole("searchbox")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Close search" }));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it("dismisses mobile search on outside tap and result selection", () => {
    state.mobile = true;
    render(<MemoryRouter><GlobalSearch /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Search admin" }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Search admin" }));
    fireEvent.click(screen.getByText("Rx Capture"));
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
  it("keeps the desktop field visible and supports Ctrl+K", () => {
    state.mobile = false;
    render(<MemoryRouter><GlobalSearch /></MemoryRouter>);
    expect(screen.getByRole("searchbox")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Search admin" })).not.toBeInTheDocument();
    fireEvent.keyDown(document, { ctrlKey: true, key: "k" });
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});
