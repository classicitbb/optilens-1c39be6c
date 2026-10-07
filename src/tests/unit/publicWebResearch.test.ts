import { describe, expect, it, vi } from "vitest";
import { buildResearchQuery, parseResearchSources, researchPublicWeb } from "../../../supabase/functions/_shared/enrichment/publicWebResearch";

describe("Public web contact research", () => {
  it("uses company and location context to distinguish people", () => {
    expect(buildResearchQuery({ name: "Alex Example", business_name: "Example Optical", city: "Bridgetown", country_code: "BB" }))
      .toBe("Alex Example Example Optical Bridgetown BB");
  });
  it("returns source evidence and candidate emails without trusting unsafe URLs", () => {
    expect(parseResearchSources({ data: { web: [
      { title: "Example", url: "https://example.com/team", description: "Our team", markdown: "alex@example.com" },
      { url: "javascript:alert(1)", description: "bad@example.com" },
      { url: "https://example.com/team" },
    ] } })).toEqual([{ title: "Example", url: "https://example.com/team", snippet: "Our team", emails: ["alex@example.com"] }]);
    expect(() => parseResearchSources({ data: {} })).toThrow("unexpected response");
  });
  it("bounds the provider request and reports failures without exposing its response body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("private-provider-details", { status: 402 }));
    try {
      await expect(researchPublicWeb("test-key", "Alex Example")).rejects.toThrow("Public web search failed (402)");
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ limit: 8, sources: ["web"] });
    } finally { fetchMock.mockRestore(); }
  });
});
