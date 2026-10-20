import { describe, expect, it } from "vitest";
import { evaluateLensChain, summarizeLensChain, type ChainAlias, type ChainInputs } from "@/features/alias-mapping/lensChain";

const alias = (overrides: Partial<ChainAlias> = {}): ChainAlias => ({
  alias: "100", style_description: "Classic PAL", color_description: "SRCoated", mf_type: "Progressive",
  pricing_key: "Poly | Progressive | Classic PAL", suppliers: ["Acme"], ...overrides,
});

// The cell the alias above resolves to, as used by pricelistLenses.unit.test.ts.
const allocation = (pricelist_version_id: number, price: number | null = 90) => ({
  pricelist_version_id, treatment_type: "clear", category: "progressive_good", material_index: "POLY", allocated_price_bbd: price,
});

const inputs = (overrides: Partial<ChainInputs> = {}): ChainInputs => ({
  aliases: [alias()],
  confirmedLensIdsByAlias: new Map([["100", ["lens-1"]]]),
  lensById: new Map([["lens-1", { is_active: true, supplier_id: "s1" }]]),
  versions: [{ id: 1, name: "Current" }],
  allocations: [allocation(1)],
  customersByVersion: new Map([[1, 4]]),
  ...overrides,
});

describe("lens chain", () => {
  it("marks a fully connected alias cloud-ready, with Innovations stages unknown", () => {
    const [chain] = evaluateLensChain(inputs());
    expect(chain.cloudReady).toBe(true);
    expect(chain.firstBroken).toBeNull();
    expect(chain.pricedOn).toEqual(["Current"]);
    expect(chain.stages.lens_on).toBe("unknown");
    expect(chain.stages.cost_source).toBe("unknown");
  });

  it("breaks at the catalog entry when no confirmed lens is linked", () => {
    const [chain] = evaluateLensChain(inputs({ confirmedLensIdsByAlias: new Map() }));
    expect(chain.firstBroken).toBe("catalog_entry");
    expect(chain.cloudReady).toBe(false);
  });

  it("ignores a confirmed link to an inactive lens", () => {
    const [chain] = evaluateLensChain(inputs({ lensById: new Map([["lens-1", { is_active: false, supplier_id: "s1" }]]) }));
    expect(chain.stages.catalog_entry).toBe("fail");
  });

  it("accepts a supplier from either the alias or the linked lens", () => {
    const [fromLens] = evaluateLensChain(inputs({ aliases: [alias({ suppliers: [] })] }));
    expect(fromLens.stages.supplier).toBe("pass");
    const [none] = evaluateLensChain(inputs({
      aliases: [alias({ suppliers: null })],
      lensById: new Map([["lens-1", { is_active: true, supplier_id: null }]]),
    }));
    expect(none.stages.supplier).toBe("fail");
  });

  it("treats a null price as unpriced and leaves assignment unknown", () => {
    const [chain] = evaluateLensChain(inputs({ allocations: [allocation(1, null)] }));
    expect(chain.stages.classified).toBe("pass");
    expect(chain.firstBroken).toBe("priced");
    expect(chain.stages.assigned).toBe("unknown");
  });

  it("fails assignment when no customer uses a pricelist that prices it", () => {
    const [chain] = evaluateLensChain(inputs({ customersByVersion: new Map([[1, 0]]) }));
    expect(chain.firstBroken).toBe("assigned");
  });

  it("flags an alias that cannot reach a price cell", () => {
    const [chain] = evaluateLensChain(inputs({ aliases: [alias({ pricing_key: "Unknown | Progressive | Classic PAL" })] }));
    expect(chain.firstBroken).toBe("classified");
  });

  it("counts each alias once, at its first broken stage", () => {
    const chains = evaluateLensChain(inputs({
      aliases: [alias(), alias({ alias: "101" }), alias({ alias: "102" })],
      confirmedLensIdsByAlias: new Map([["100", ["lens-1"]], ["101", ["lens-1"]]]),
    }));
    const summary = summarizeLensChain(chains);
    expect(summary.total).toBe(3);
    expect(summary.cloudReady).toBe(2);
    expect(summary.brokenAt.catalog_entry).toBe(1);
  });
});
