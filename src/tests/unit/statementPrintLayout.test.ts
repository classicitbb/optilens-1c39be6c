import { describe, expect, it } from "vitest";
import { paginateStatementLines } from "@/components/account/sections/statementPrintLayout";

describe("paginateStatementLines", () => {
  it("keeps a short statement together on its first page", () => {
    expect(paginateStatementLines([1, 2, 3])).toEqual([[1, 2, 3]]);
  });

  it("breaks long statements only between rows and reserves the final page for closing details", () => {
    const lines = Array.from({ length: 65 }, (_, index) => index + 1);
    const pages = paginateStatementLines(lines);

    expect(pages).toEqual([
      Array.from({ length: 14 }, (_, index) => index + 1),
      Array.from({ length: 30 }, (_, index) => index + 15),
      [45, 46, 47],
      Array.from({ length: 18 }, (_, index) => index + 48),
    ]);
    expect(pages.flat()).toEqual(lines);
    expect(pages.at(-1)).toHaveLength(18);
  });
});
