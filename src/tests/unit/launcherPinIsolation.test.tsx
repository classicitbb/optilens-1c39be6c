import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { useLauncherPins } from "@/features/admin/core/hooks/useLauncherPins";

const state = vi.hoisted(() => ({ user: { id: "alice" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({
  select: () => ({ eq: (_column: string, id: string) => ({ order: async () => ({ data: [{ route: `/admin/${id}` }], error: null }) }) }),
}) } }));

describe("launcher account isolation", () => {
  it("does not show the previous user's cached pins after an account switch or sign-out", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const hook = renderHook(useLauncherPins, { wrapper });
    await waitFor(() => expect(hook.result.current.pinnedRoutes).toEqual(["/admin/alice"]));
    state.user = { id: "bob" };
    hook.rerender();
    expect(hook.result.current.pinnedRoutes).not.toContain("/admin/alice");
    await waitFor(() => expect(hook.result.current.pinnedRoutes).toEqual(["/admin/bob"]));
    state.user = null;
    hook.rerender();
    expect(hook.result.current.pinnedRoutes).toEqual([]);
  });
});
