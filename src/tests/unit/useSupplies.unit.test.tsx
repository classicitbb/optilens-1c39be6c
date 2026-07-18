import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSupplies, type Supply } from "@/hooks/useSupplies";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

const supply = {
  id: "supply-1",
  name: "Lens Cleaner",
  category: "lab",
  description: "",
  sku: "LC-1",
  base_price: 4,
  sell_price: 8,
  unit: "each",
  quantity_per_unit: 1,
  is_active: true,
  show_on_website: false,
  image_url: null,
  notes: null,
  supplier_id: "supplier-1",
  supplier_name: "Acme Optical",
  brand_id: "brand-1",
  brand_name: "Acme",
  preferred: false,
  stocked: false,
  show_in_pricelist: false,
  bin: "",
  detail: "",
  currency: "USD",
  bb_item: false,
  duty_added: false,
  vat_paid: false,
  labour_added: false,
  stk_wspl: false,
  created_at: "2026-07-15T00:00:00Z",
  updated_at: "2026-07-15T00:00:00Z",
  supplier: { id: "supplier-1", name: "Acme Optical" },
  brand: { id: "brand-1", name: "Acme" },
} as Supply & { supplier: { id: string; name: string }; brand: { id: string; name: string } };

describe("useSupplies", () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.insert.mockReset();
    mocks.select.mockReset();
    mocks.single.mockReset();
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    mocks.single.mockResolvedValue({ data: { id: "supply-copy" }, error: null });
    mocks.select.mockReturnValue({ single: mocks.single });
    mocks.insert.mockReturnValue({ select: mocks.select });
    mocks.from.mockReturnValue({ insert: mocks.insert });
  });

  it("duplicates only writable supplies columns, not expanded relationships", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSupplies(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await result.current.duplicateMutation.mutateAsync(supply);

    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: "Lens Cleaner (Copy)",
      supplier_id: "supplier-1",
      brand_id: "brand-1",
    }));
    const inserted = mocks.insert.mock.calls[0][0];
    expect(inserted).not.toHaveProperty("supplier");
    expect(inserted).not.toHaveProperty("brand");
    expect(inserted).not.toHaveProperty("supplier_name");
    expect(inserted).not.toHaveProperty("brand_name");
  });

  it("uses the supplies foreign-key names when loading expanded references", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const order = vi.fn().mockResolvedValue({ data: [supply], error: null });
    const select = vi.fn().mockReturnValue({ order });
    mocks.rpc.mockResolvedValue({ data: [{ id: supply.id, base_price: supply.base_price }], error: null });
    mocks.from.mockReturnValue({ select });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSupplies(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(select).toHaveBeenCalledWith(
      "*, supplier:suppliers!supplies_supplier_id_fkey(id, name), brand:brands!supplies_brand_id_fkey(id, name)",
    );
  });
});
