import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { TooltipProvider } from "@/components/ui/tooltip";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationBell from "@/components/admin/NotificationBell";
const mocks = vi.hoisted(() => ({ notifications: [] as Array<{ id: string; title: string; createdAt: string }>, play: vi.fn(), unlock: vi.fn(), enabled: true }));
vi.mock("@/features/admin/notifications/useAdminNotifications", () => ({ useAdminNotifications: () => ({ notifications: mocks.notifications, unreadCount: mocks.notifications.length, isLoading: false }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "operator" } }) }));
vi.mock("@/features/admin/notifications/alertSound", () => ({ playAlertSound: mocks.play, unlockAlertSound: mocks.unlock, isAlertSoundEnabled: () => mocks.enabled, setAlertSoundEnabled: (enabled: boolean) => { mocks.enabled = enabled; } }));
const bell = () => <MemoryRouter><TooltipProvider><NotificationBell /></TooltipProvider></MemoryRouter>;
describe("notification bell sound", () => {
  beforeEach(() => { mocks.notifications = [{ id: "old", title: "Old alert", createdAt: "2026-10-20T12:00:00Z" }]; mocks.enabled = true; vi.clearAllMocks(); });
  it("skips initial backlog and sounds once for multiple new notifications", () => {
    const { rerender } = render(bell()); expect(mocks.play).not.toHaveBeenCalled();
    mocks.notifications = [...mocks.notifications, { id: "new", title: "New alert", createdAt: "2026-10-20T13:00:00Z" }, { id: "new2", title: "Second alert", createdAt: "2026-10-20T13:00:00Z" }];
    rerender(bell()); expect(mocks.play).toHaveBeenCalledOnce();
    rerender(bell()); expect(mocks.play).toHaveBeenCalledOnce();
  });
  it("offers a mute toggle and an explicit test sound", async () => {
    render(bell()); fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getByRole("button", { name: "Test ding dong" }));
    await vi.waitFor(() => expect(mocks.play).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole("button", { name: "Alert sound: On" }));
    expect(screen.getByRole("button", { name: "Alert sound: Off" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Test ding dong" })).toBeDisabled();
  });
});
