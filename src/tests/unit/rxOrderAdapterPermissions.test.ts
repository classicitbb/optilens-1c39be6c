import { describe, expect, it } from "vitest";
import { buildEngineData } from "@/features/rx-order/embed/rx-order-adapter";

describe("Rx order account presentation", () => {
  const base = {
    lenses: [],
    addons: [],
    clashRules: [],
    accounts: [{ id: 7, name: "Bridgetown Eyecare", account_number: "B-7" }] as any,
    addonPriceFor: (_id: string, fallback: number) => fallback,
  };

  it("uses Barbados dollars and respects a portal pricing denial", () => {
    const { data } = buildEngineData({ ...base, currency: "BBD", pricesVisible: false });
    expect(data.branches[0]).toMatchObject({ cur: "BBD", prices: false });
  });

  it("promotes Blue Defense and Super AR but not Back AR by catalogue order", () => {
    const addon = (id: string, name: string) => ({
      id, name, sku: id, category: "ar_coating", description: "", cost: 0, price: 10,
      is_auto: false, auto_rule: null, is_active: true, show_on_website: true, sort_order: 0,
      supplier_id: null, supplier_name: null, created_at: "", updated_at: "",
    });
    const { data } = buildEngineData({
      ...base,
      addons: [addon("back", "BACK AR (For Polarised)"), addon("blue", "BLUE DEFENSE AR+"), addon("super", "SUPER AR")] as any,
    });

    expect(data.treatments.map(({ n, pop }) => [n, pop])).toEqual([
      ["BACK AR (For Polarised)", false],
      ["BLUE DEFENSE AR+", true],
      ["SUPER AR", true],
    ]);
  });
});
