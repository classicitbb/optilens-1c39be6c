import { describe, expect, it } from "vitest";
import { searchDocs, type SearchDoc } from "@/components/workspace/paletteSearch";

const docs: SearchDoc[] = [
  { id: "1", title: "Frame returns", body: "How to pack a frame for return shipping.", kind: "page" },
  { id: "2", title: "Shipping rates", body: "Carrier tables for Caribbean freight and frame returns.", kind: "page" },
  { id: "3", title: "Returns FAQ", body: "Customer-facing answers.", kind: "website", meta: "FAQ" },
];

describe("searchDocs", () => {
  it("returns nothing for an empty query", () => {
    expect(searchDocs(docs, "  ")).toEqual([]);
  });

  it("ranks title-prefix, then title match, then body match", () => {
    const hits = searchDocs(docs, "frame returns");
    expect(hits.map((hit) => hit.id)).toEqual(["1", "2"]);
    expect(hits[0].snippet).toBeUndefined();
    expect(hits[1].snippet).toContain("frame returns");
  });

  it("requires every term and searches block text and website content", () => {
    expect(searchDocs(docs, "caribbean returns").map((hit) => hit.id)).toEqual(["2"]);
    expect(searchDocs(docs, "returns").map((hit) => hit.id)).toEqual(["3", "1", "2"]);
    expect(searchDocs(docs, "zzz")).toEqual([]);
  });

  it("honours the limit", () => {
    expect(searchDocs(docs, "r", 1)).toHaveLength(1);
  });
});
