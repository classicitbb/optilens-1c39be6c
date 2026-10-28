import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminSidebar from "@/components/admin/AdminSidebar";
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => true }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: undefined }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/features/admin/core/hooks/useLauncherPins", () => ({ useLauncherPins: () => ({ isPinned: () => false, toggle: vi.fn() }) }));
afterEach(cleanup);
describe("mobile admin sidebar", () => {
  it("loads closed, never exposes pinning, and dismisses on Escape with focus restored", async () => {
    render(<MemoryRouter initialEntries={["/admin/orders/rx-capture"]}><AdminSidebar /></MemoryRouter>);
    const trigger = screen.getByRole("button", { name: "Open sidebar" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.queryByRole("button", { name: /pin sidebar/i })).not.toBeInTheDocument();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
  it("closes even when selecting the current page", async () => {
    render(<MemoryRouter initialEntries={["/admin/orders/rx-capture"]}><AdminSidebar /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open sidebar" }));
    fireEvent.click(screen.getByRole("link", { name: "Rx Capture" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
