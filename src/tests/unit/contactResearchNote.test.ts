import { describe, expect, it } from "vitest";
import { canonicalToSearchText, toCanonicalDocument } from "@/lib/wikiCanonical";
import { formatResearchNote } from "@/features/admin/crm/contactResearch";
import { parseResearchSummary } from "../../../supabase/functions/_shared/enrichment/publicWebResearch";

describe("Contact research notes", () => {
  it("strips citation markers from the written answer", () => {
    const text = "Specs Optical\n- Phone: +1 246 426 7030 cite";
    expect(parseResearchSummary({ output: [{ type: "message", content: [{ type: "output_text", text }] }] }))
      .toBe("Specs Optical\n- Phone: +1 246 426 7030");
    expect(parseResearchSummary(null)).toBe("");
  });

  it("appends the profile and sources under existing notes", () => {
    const note = formatResearchNote({
      contactId: "c1", retrievedAt: "2026-10-28T04:00:00.000Z",
      summary: "Specs Optical\n- Phone: +1 246 426 7030",
      sources: [{ title: "Specs [Optical]", url: "https://example.com", snippet: "", emails: [] }],
    });
    expect(note).toContain("## Market intel (2026-10-28)");
    expect(note).toContain("- [Specs Optical](https://example.com)");
    const existing = toCanonicalDocument("Existing call note");
    const doc = { ...existing, blocks: [...existing.blocks, ...toCanonicalDocument(note).blocks] };
    const text = canonicalToSearchText(doc);
    expect(text.startsWith("Existing call note")).toBe(true);
    expect(text).toContain("+1 246 426 7030");
    expect(text).toContain("Specs Optical");
  });
});
