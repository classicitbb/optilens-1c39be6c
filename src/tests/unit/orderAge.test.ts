import { describe, expect, it } from "vitest";
import { orderAgeBand } from "@/lib/orderAge";

const now = new Date("2026-09-29T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe("orderAgeBand", () => {
  it.each([
    [0, "0–5 days"],
    [4.9, "0–5 days"],
    [5, "5–7 days"],
    [10, "7–11 days"],
    [13, "11–14 days"],
    [16, "14–17 days"],
    [20, "17–28 days"],
    [40, "Over 28 days"],
  ])("%s days old → %s", (d, label) => {
    expect(orderAgeBand(daysAgo(d), now)?.label).toBe(label);
  });

  it("returns null for missing or invalid dates", () => {
    expect(orderAgeBand(null, now)).toBeNull();
    expect(orderAgeBand("not a date", now)).toBeNull();
  });
});
