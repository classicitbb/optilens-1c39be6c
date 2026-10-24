import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminUsers } from "@/hooks/useAdminUsers";
const mocks = vi.hoisted(() => ({ from: vi.fn(), admin: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/features/admin/api/adminUserManagement", () => ({ callAdminUserManagement: mocks.admin }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ role: "admin" }) }));
vi.mock("@/features/admin/security/adminFunctionPolicy", () => ({ validateAdminFunctionRequest: (value: unknown) => value }));
describe("portal user loading", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("starts auth metadata before slow profile reads complete", async () => {
    let release!: (value: unknown) => void;
    const profiles = new Promise((resolve) => { release = resolve; });
    mocks.from.mockImplementation((table: string) => ({ select: () => table === "profiles" ? profiles : Promise.resolve({ data: [], error: null }) }));
    mocks.admin.mockResolvedValue([]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useAdminUsers(), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    try {
      await waitFor(() => expect(mocks.admin).toHaveBeenCalledOnce(), { timeout: 200 });
    } finally {
      release({ data: [], error: null });
    }
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    unmount(); client.clear();
  });
});
