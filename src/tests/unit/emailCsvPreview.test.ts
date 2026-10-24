import { describe, expect, it } from "vitest";
import { parseCsvPreview } from "@/features/admin/email/csvPreview";

describe("email CSV preview", () => {
  it("preserves quoted commas, escaped quotes, and line breaks", () => {
    expect(parseCsvPreview('Name,Note\r\n"Doe, Jane","said ""hello""\nagain"\r\n')).toEqual([
      ["Name", "Note"],
      ["Doe, Jane", 'said "hello"\nagain'],
    ]);
  });

  it("limits rendered rows while preserving a final empty cell", () => {
    expect(parseCsvPreview("a,b,\nc,d,\ne,f,", 2)).toEqual([["a", "b", ""], ["c", "d", ""]]);
  });
});
