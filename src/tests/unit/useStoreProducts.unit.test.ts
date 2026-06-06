import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchStoreProducts } from "@/hooks/useStoreProducts";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
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
    mocks.from.mockImplementation((table: string) => createQueryBuilder(table));
    mocks.results = {
      lenses_public: { data: [], error: null },
      supplies_public: { data: [], error: null },
      addons_public: { data: [], error: null },
      store_product_media: { data: [], error: null },
      store_product_overrides: { data: [], error: null },
      store_product_variant_summary: { data: [], error: null },
    };
  });

  it("keeps available products when optional public catalog views are missing", async () => {
    const missingViewError = {
      code: "PGRST205",
      message: "Could not find the table in the schema cache",
    };
    mocks.results.lenses_public = { data: null, error: missingViewError };
    mocks.results.addons_public = { data: null, error: missingViewError };
    mocks.results.supplies_public = {
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
  });

  it("still fails for non-optional catalog query errors", async () => {
    mocks.results.supplies_public = {
      data: null,
      error: { code: "42501", message: "permission denied for relation supplies_public" },
    };

    await expect(fetchStoreProducts()).rejects.toMatchObject({
      code: "42501",
    });
  });
});
