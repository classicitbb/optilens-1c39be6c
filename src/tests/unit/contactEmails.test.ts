import { describe, expect, it } from "vitest";
import { normalizeContactEmails, parseContactEmails } from "@/lib/contactEmails";

describe("CRM email lists", () => {
  it("accepts the requested separators, preserves primary order and removes duplicate addresses", () => {
    expect(normalizeContactEmails("first@example.com:second@example.com; FIRST@example.com, third@example.com\n"))
      .toBe("first@example.com, second@example.com, third@example.com");
    expect(parseContactEmails("first@example.com, second@example.com")[0]).toBe("first@example.com");
  });
  it("allows clearing emails and rejects invalid entries and header text", () => {
    expect(normalizeContactEmails(" ; , : ")).toBe("");
    expect(() => normalizeContactEmails("good@example.com, wrong")).toThrow("Invalid email address: wrong");
    expect(() => normalizeContactEmails("good@example.com\nBcc: other@example.com")).toThrow();
  });
});
