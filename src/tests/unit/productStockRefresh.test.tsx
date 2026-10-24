import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useProductVariants } from "@/hooks/useProductVariants";
const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc } }));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe("store grid stock refresh", () => {
  it("reads all variants together again after eight hours without remounting", async () => {
    vi.useFakeTimers();
    mocks.rpc.mockResolvedValueOnce({ data: [{ id: "one", is_active: true, stock_qty: 0 }], error: null })
      .mockResolvedValue({ data: [{ id: "one", is_active: true, stock_qty: 12 }], error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => useProductVariants("lens", "product"), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(result.current.data?.[0].stock_qty).toBe(0);
    expect(mocks.rpc).toHaveBeenCalledWith("get_store_product_variants_public", { p_product_type: "lens", p_product_id: "product" });
    await act(async () => { await vi.advanceTimersByTimeAsync(8 * 60 * 60 * 1000 + 10); });
    expect(mocks.rpc).toHaveBeenCalledTimes(2);
    expect(result.current.data?.[0].stock_qty).toBe(12);
    unmount(); client.clear();
  });
  it("keeps active-only and admin variant results in separate cache entries", async () => {
    vi.useFakeTimers();
    mocks.rpc.mockResolvedValue({ data: [{ id: "active", is_active: true }, { id: "archived", is_active: false }], error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, unmount } = renderHook(() => ({ active: useProductVariants("lens", "product"), all: useProductVariants("lens", "product", { activeOnly: false }) }), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(result.current.active.data).toHaveLength(1);
    expect(result.current.all.data).toHaveLength(2);
    unmount(); client.clear();
  });
});
