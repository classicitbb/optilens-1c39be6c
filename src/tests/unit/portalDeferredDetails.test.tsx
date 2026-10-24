import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { useOrders } from "@/hooks/useOrders";
import { useCustomerAddresses } from "@/hooks/useCustomerAddresses";
import { useCustomerPaymentMethods } from "@/hooks/useCustomerPaymentMethods";
const mocks = vi.hoisted(() => ({ from: vi.fn(), toast: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "signed-in-admin" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
describe("unselected portal account", () => {
  it("does not fetch the admin's orders, addresses or payment methods", () => {
    const client = new QueryClient();
    const { result, unmount } = renderHook(() => ({ orders: useOrders(undefined, { enabled: false }), addresses: useCustomerAddresses(undefined, { enabled: false }), payments: useCustomerPaymentMethods(undefined, { enabled: false }) }), { wrapper: ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> });
    expect(mocks.from).not.toHaveBeenCalled();
    expect(result.current.orders.orders).toEqual([]);
    unmount(); client.clear();
  });
});
