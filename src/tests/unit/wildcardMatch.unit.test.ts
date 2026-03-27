import { describe, expect, it } from "vitest";
import { fieldsMatch, wildcardMatch } from "@/lib/wildcardMatch";

describe("wildcardMatch", () => {
  it("matches wildcard patterns case-insensitively", () => {
    expect(wildcardMatch("Hello World", "hel%rld")).toBe(true);
  });

  it("falls back to includes when no wildcard exists", () => {
    expect(wildcardMatch("hello world", "world")).toBe(true);
    expect(wildcardMatch("hello world", "mars")).toBe(false);
  });

  it("matches across multiple fields", () => {
    expect(fieldsMatch("acm%", "Vision Lab", "Acme Optical")).toBe(true);
    expect(fieldsMatch("zen", "Vision Lab", "Acme Optical")).toBe(false);
  });
});
