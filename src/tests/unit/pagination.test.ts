import { describe, expect, it } from "vitest";
import { clampPage, paginate } from "@/lib/pagination";

describe("pagination", () => {
  it("limits a large result set to one bounded render page", () => {
    const result = paginate(Array.from({ length: 1_250 }, (_, index) => index), 3, 100);
    expect(result.items).toHaveLength(100);
    expect(result.items[0]).toBe(200);
    expect(result.items[99]).toBe(299);
    expect(result.pageCount).toBe(13);
  });

  it("clamps stale pages after filters reduce the result count", () => {
    expect(clampPage(8, 12, 100)).toBe(1);
    expect(paginate(["only"], 8, 100)).toMatchObject({ page: 1, start: 1, end: 1 });
  });
});
