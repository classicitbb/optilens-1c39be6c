import { describe, expect, it } from "vitest";

import { sanitizeRichTextHtml } from "@/lib/sanitizeRichTextHtml";

describe("sanitizeRichTextHtml", () => {
  it("removes script tags", () => {
    const raw = '<p>Safe</p><script>alert("xss")</script>';

    expect(sanitizeRichTextHtml(raw)).toBe("<p>Safe</p>");
  });

  it("removes inline event handlers", () => {
    const raw = '<p onclick="alert(1)">Click</p><img src="x" onerror="alert(2)">';

    expect(sanitizeRichTextHtml(raw)).toBe("<p>Click</p>");
  });

  it("neutralizes javascript urls", () => {
    const raw = '<a href="javascript:alert(1)">bad</a><a href="https://safe.example">safe</a>';

    expect(sanitizeRichTextHtml(raw)).toBe('<a>bad</a><a href="https://safe.example">safe</a>');
  });

  it("enforces rel noopener noreferrer for _blank links", () => {
    const raw = '<a href="https://safe.example" target="_blank">safe</a>';

    expect(sanitizeRichTextHtml(raw)).toBe('<a href="https://safe.example" target="_blank" rel="noopener noreferrer">safe</a>');
  });
});
