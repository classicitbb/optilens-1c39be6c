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
});
