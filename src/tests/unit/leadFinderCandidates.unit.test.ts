import { describe, expect, it } from "vitest";
import {
  buildSearchTasks,
  dedupeCandidates,
  MAX_SEARCH_TASKS,
} from "../../../supabase/functions/lead-intelligence/candidates";
import { cleanBusinessName } from "../../../supabase/functions/lead-intelligence/providers/businessName";
import type { LeadCandidate } from "../../../supabase/functions/lead-intelligence/providers/types";
import type { SearchPlan } from "../../../supabase/functions/lead-intelligence/ai/planner";

const candidate = (overrides: Partial<LeadCandidate> = {}): LeadCandidate => ({
  name: "Bridgetown Optical",
  city: "Bridgetown",
  country: "Barbados",
  website: null,
  google_rating: null,
  google_reviews_count: null,
  source_provider: "firecrawl_search",
  ...overrides,
});

const plan = (overrides: Partial<SearchPlan> = {}): SearchPlan => ({
  interpretation: "",
  businessTypes: [],
  locations: [],
  searchQueries: ["optician"],
  mustHave: [],
  exclude: [],
  aiPlanned: true,
  ...overrides,
});

describe("dedupeCandidates", () => {
  it("merges rows for the same domain and keeps the richer facts", () => {
    const merged = dedupeCandidates([
      candidate({ website: "https://www.bridgetownoptical.bb/", source_provider: "firecrawl_search" }),
      candidate({
        website: "https://bridgetownoptical.bb",
        google_rating: 4.6,
        google_reviews_count: 82,
        source_provider: "google_places",
      }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].google_rating).toBe(4.6);
    expect(merged[0].google_reviews_count).toBe(82);
    expect(merged[0].source_provider).toBe("firecrawl_search+google_places");
  });

  it("falls back to name and city when there is no website", () => {
    const merged = dedupeCandidates([
      candidate({ name: "Island Eye Care" }),
      candidate({ name: "island eye care!", google_rating: 4.1 }),
      candidate({ name: "Island Eye Care", city: "Speightstown" }),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0].google_rating).toBe(4.1);
  });

  it("treats different businesses on different domains as distinct", () => {
    const merged = dedupeCandidates([
      candidate({ name: "A", website: "https://a.bb" }),
      candidate({ name: "B", website: "https://b.bb" }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("drops rows with neither a name nor a website", () => {
    expect(dedupeCandidates([candidate({ name: "", website: null })])).toHaveLength(0);
  });
});

describe("buildSearchTasks", () => {
  it("searches without a location when the plan has none", () => {
    expect(buildSearchTasks(plan({ searchQueries: ["optician"] }))).toEqual([
      { query: "optician", city: undefined, country: undefined },
    ]);
  });

  it("crosses every query with every planned location", () => {
    const tasks = buildSearchTasks(plan({
      searchQueries: ["optician", "eye clinic"],
      locations: [{ city: "Bridgetown", country: "Barbados" }],
    }));

    expect(tasks).toEqual([
      { query: "optician", city: "Bridgetown", country: "Barbados" },
      { query: "eye clinic", city: "Bridgetown", country: "Barbados" },
    ]);
  });

  it("caps fan-out so one brief cannot trigger unbounded provider calls", () => {
    const tasks = buildSearchTasks(plan({
      searchQueries: ["a", "b", "c", "d"],
      locations: [
        { city: null, country: "Barbados" },
        { city: null, country: "Jamaica" },
        { city: null, country: "Guyana" },
      ],
    }));

    expect(tasks).toHaveLength(MAX_SEARCH_TASKS);
  });
});

describe("cleanBusinessName", () => {
  it("keeps legitimate separators inside a business name", () => {
    expect(cleanBusinessName("Vision Care - Bridgetown", "https://visioncare.bb"))
      .toBe("Vision Care - Bridgetown");
    expect(cleanBusinessName("Smith | Optical", "https://smithoptical.bb"))
      .toBe("Smith | Optical");
  });

  it("strips directory and site-brand suffixes", () => {
    expect(cleanBusinessName("Acme Optical | Yelp", "https://www.yelp.com/biz/acme"))
      .toBe("Acme Optical");
    expect(cleanBusinessName("Island Eye Care - Contact Us", "https://islandeye.bb/contact"))
      .toBe("Island Eye Care");
  });

  it("falls back to the url when there is no title", () => {
    expect(cleanBusinessName(null, "https://islandeye.bb")).toBe("https://islandeye.bb");
  });
});

describe("dedupeCandidates near-duplicates", () => {
  it("collapses similar names in the same city and keeps the fuller name", () => {
    const merged = dedupeCandidates([
      candidate({ name: "Optical Solutions" }),
      candidate({ name: "Optical Solutions Ltd", google_rating: 4.3 }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].google_rating).toBe(4.3);
    expect(merged[0].name).toBe("Optical Solutions Ltd");
  });
});
