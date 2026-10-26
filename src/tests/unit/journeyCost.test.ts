import { describe, expect, it } from "vitest";
import { compareCosts, landedTotal } from "@/components/home/journeyCost";

describe("delivered-cost comparison", () => {
  it("does not turn missing charges into savings", () => {
    expect(compareCosts(["100", "20", "0", "10", "5"], ["90", "", "0", "10", "5"])).toBeNull();
    expect(landedTotal(["100", "-20", "0", "10", "5"])).toBeNull();
    expect(landedTotal(["100", "Infinity", "0", "10", "5"])).toBeNull();
  });
  it("includes all charges and reports a higher competing offer honestly", () => {
    expect(compareCosts(["100", "10", "0", "10", "5"], ["90", "30", "5", "10", "5"]))
      .toEqual({ currentTotal: 125, proposedTotal: 140, difference: -15 });
  });
  it("handles equal totals, confirmed zeros and decimal rounding", () => {
    expect(compareCosts(["0.1", "0.2", "0", "0", "0"], ["0.3", "0", "0", "0", "0"]))
      .toEqual({ currentTotal: 0.3, proposedTotal: 0.3, difference: 0 });
  });
});
