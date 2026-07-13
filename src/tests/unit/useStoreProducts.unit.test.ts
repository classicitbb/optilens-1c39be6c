import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchStoreProducts } from "@/hooks/useStoreProducts";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  pricing: {
    data: {
      fx_rates: { USD: 2 },
      fx_risk_buffer: 0,
    },
    error: null,
  },
  results: {} as Record<string, { data: any[] | null; error: any }>,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

const createQueryBuilder = (table: string) => {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => mocks.pricing),
    then: (resolve: any, reject: any) =>
      Promise.resolve(mocks.results[table] ?? { data: [], error: null }).then(resolve, reject),
  };

  return builder;
};

describe("fetchStoreProducts", () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
    mocks.from.mockImplementation((table: string) => createQueryBuilder(table));
    mocks.rpc.mockImplementation((functionName: string) =>
      Promise.resolve(mocks.results[functionName] ?? { data: [], error: null }),
    );
    mocks.results = {
      get_lenses_safe: { data: [], error: null },
      get_supplies_safe: { data: [], error: null },
      get_addons_safe: { data: [], error: null },
      store_product_media: { data: [], error: null },
      store_product_overrides: { data: [], error: null },
      store_product_variant_summary: { data: [], error: null },
    };
  });

  it("keeps available products when optional safe RPCs are missing", async () => {
    const missingRpcError = {
      code: "PGRST205",
      message: "Could not find the function in the schema cache",
    };
    mocks.results.get_lenses_safe = { data: null, error: missingRpcError };
    mocks.results.get_addons_safe = { data: null, error: missingRpcError };
    mocks.results.get_supplies_safe = {
      data: [
        {
          id: "supply-1",
          name: "Lens Cleaning Kit",
          description: "Professional-grade lens cleaning wipes",
          sell_price: 40,
          category: "optical",
          unit: "box",
          quantity_per_unit: 100,
          image_url: null,
        },
      ],
      error: null,
    };

    const products = await fetchStoreProducts();

    expect(products).toHaveLength(1);
    expect(products[0]).toMatchObject({
      id: "supply-1",
      name: "Lens Cleaning Kit",
      product_type: "supply",
      sell_price: 40,
      sell_price_usd: 20,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("get_lenses_safe");
    expect(mocks.rpc).toHaveBeenCalledWith("get_supplies_safe");
    expect(mocks.rpc).toHaveBeenCalledWith("get_addons_safe");
    expect(mocks.from).not.toHaveBeenCalledWith("lenses");
    expect(mocks.from).not.toHaveBeenCalledWith("supplies");
    expect(mocks.from).not.toHaveBeenCalledWith("addons");
  });

  it("still fails for non-optional safe RPC errors", async () => {
    mocks.results.get_supplies_safe = {
      data: null,
      error: { code: "42501", message: "permission denied for function get_supplies_safe" },
    };

    await expect(fetchStoreProducts()).rejects.toMatchObject({
      code: "42501",
    });
  });
});
