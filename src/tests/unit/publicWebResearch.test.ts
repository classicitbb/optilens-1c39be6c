import { describe, expect, it, vi } from "vitest";
import { buildResearchQuery, parseResearchSources, researchPublicWeb } from "../../../supabase/functions/_shared/enrichment/publicWebResearch";

describe("Public web contact research", () => {
  it("uses company and location context to distinguish people", () => {
    expect(buildResearchQuery({ name: "Alex Example", business_name: "Example Optical", city: "Bridgetown", country_code: "BB" }))
      .toBe("Alex Example Example Optical Bridgetown BB");
  });
  const answer = (text: string, annotations: unknown[]) => ({ status: "completed", output: [
    { type: "web_search_call", status: "completed" },
    { type: "message", content: [{ type: "output_text", text, annotations }] },
  ] });
  const citation = (url: string, start: number, end: number) => ({ type: "url_citation", title: "Example", url, start_index: start, end_index: end });
  it("returns cited paragraphs and candidates without trusting unsafe or model-invented URLs", () => {
    const text = "Email alex@example.com [1]\nOther unrelated bad@example.com [2]";
    const sources = parseResearchSources(answer(text, [
      citation("https://example.com/team", text.indexOf("[1]"), text.indexOf("[1]") + 3),
      citation("https://example.com/team", text.indexOf("[1]"), text.indexOf("[1]") + 3),
      citation("javascript:alert(1)", text.indexOf("[2]"), text.length),
      citation("https://user:secret@example.com", 0, 3),
      citation("https://invalid.example", -1, 3), null,
    ]));
    expect(sources).toEqual([{ title: "Example", url: "https://example.com/team", snippet: "AI search suggestion: Email alex@example.com", emails: ["alex@example.com"] }]);
    expect(parseResearchSources(answer("Invented https://invented.example and guess@example.com", []))).toEqual([]);
  });
  it("rejects incomplete and ungrounded responses and handles a searched no-match", () => {
    expect(() => parseResearchSources(null)).toThrow("unexpected response");
    expect(() => parseResearchSources({ status: "incomplete", output: [] })).toThrow("incomplete");
    expect(() => parseResearchSources({ status: "completed", output: [] })).toThrow("web search evidence");
    expect(parseResearchSources(answer("No relevant matches.", []))).toEqual([]);
  });
  it("caps sources at eight and keeps emails with their cited paragraph", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `Email person${i}@example.com [${i}]`);
    const text = lines.join("\n");
    const sources = parseResearchSources(answer(text, lines.map((_, i) => {
      const start = text.indexOf(`[${i}]`);
      return citation(`https://example.com/${i}`, start, start + 3);
    })));
    expect(sources).toHaveLength(8);
    expect(sources[1].emails).toEqual(["person1@example.com"]);
  });
  it("uses the Responses web search tool and accepts only cited results", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(answer("Email alex@example.com [1]", [citation("https://example.com", 23, 26)]))));
    try {
      await researchPublicWeb("test-key", "Alex Example", "configured-model");
      expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/responses");
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ model: "configured-model", store: false, tools: [{ type: "web_search", search_context_size: "low" }], tool_choice: "required", max_tool_calls: 2, max_output_tokens: 2000 });
      expect(fetchMock.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
    } finally { fetchMock.mockRestore(); }
  });
  it("bounds the provider request and reports failures without exposing its response body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("private-provider-details", { status: 402 }));
    try {
      await expect(researchPublicWeb("test-key", "Alex Example")).rejects.toThrow("Public web search failed (402)");
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ store: false, max_tool_calls: 2 });
    } finally { fetchMock.mockRestore(); }
  });
});
