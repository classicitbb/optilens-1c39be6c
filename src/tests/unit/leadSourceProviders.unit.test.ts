import { describe, expect, it } from "vitest";
import { mergeSourceProviders } from "../../../supabase/functions/lead-intelligence/candidates.ts";

describe("lead source labels", () => {
  it("lists each provider once when duplicates merge repeatedly", () => {
    let label = mergeSourceProviders("google_places", "firecrawl_search");
    for (let i = 0; i < 5; i++) label = mergeSourceProviders(label, "firecrawl_search");
    expect(label).toBe("google_places+firecrawl_search");
  });
});
