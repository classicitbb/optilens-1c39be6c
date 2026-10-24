import { describe, expect, it } from "vitest";
import { sameJson, stableStringify } from "@/lib/stableJson";

describe("stableStringify", () => {
  it("ignores object key order at every depth", () => {
    const written = { blocks: [{ type: "paragraph", children: [{ type: "text", text: "Hi" }] }] };
    // jsonb returns shorter keys first, then alphabetical: text before type
    const readBack = { blocks: [{ children: [{ text: "Hi", type: "text" }], type: "paragraph" }] };
    expect(JSON.stringify(written)).not.toBe(JSON.stringify(readBack));
    expect(sameJson(written, readBack)).toBe(true);
  });

  it("still tells different values apart, including array order", () => {
    expect(sameJson({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
    expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameJson({ a: undefined, b: 1 }, { b: 1 })).toBe(true);
    expect(stableStringify(null)).toBe("null");
    expect(stableStringify("x")).toBe('"x"');
  });
});
