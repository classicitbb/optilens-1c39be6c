// Turns one sentence from the operator into a concrete provider search plan.
//
// The operator types what they want ("independent opticians in Bridgetown that
// look like they'd buy premium progressives"). This extracts the business
// types, the geography and the qualifying signals, and emits the literal
// query strings the grounded providers should run.

import { callGatewayTool } from "./gateway.ts";

export type PlanLocation = { city: string | null; country: string | null };

export type SearchPlan = {
  interpretation: string;
  businessTypes: string[];
  locations: PlanLocation[];
  searchQueries: string[];
  mustHave: string[];
  exclude: string[];
  aiPlanned: boolean;
};

const PLANNER_TOOL = {
  name: "return_search_plan",
  description: "Return a structured business-discovery plan derived from the operator's brief.",
  parameters: {
    type: "object",
    properties: {
      interpretation: {
        type: "string",
        description: "One sentence restating what kind of business the operator is looking for and where.",
      },
      business_types: {
        type: "array",
        items: { type: "string" },
        description: "Concrete business categories to look for, e.g. 'independent optician', 'eye clinic'.",
      },
      locations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            city: { type: "string", description: "City name, or empty string if the brief is country-wide." },
            country: { type: "string", description: "Country name, or empty string if the brief is global." },
          },
          required: ["city", "country"],
          additionalProperties: false,
        },
        description: "Geographies to search. Empty array means search without a location constraint.",
      },
      search_queries: {
        type: "array",
        items: { type: "string" },
        description:
          "2-4 literal search-engine queries that would surface these businesses. Plain business language, no boolean operators.",
      },
      must_have: {
        type: "array",
        items: { type: "string" },
        description: "Qualifying signals implied by the brief, e.g. 'sells progressive lenses', 'independently owned'.",
      },
      exclude: {
        type: "array",
        items: { type: "string" },
        description: "Business kinds the brief rules out, e.g. 'national chains', 'online-only retailers'.",
      },
    },
    required: ["interpretation", "business_types", "locations", "search_queries", "must_have", "exclude"],
    additionalProperties: false,
  },
};

type PlannerResponse = {
  interpretation?: string;
  business_types?: unknown;
  locations?: unknown;
  search_queries?: unknown;
  must_have?: unknown;
  exclude?: unknown;
};

const asStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0)
    : [];

const blankToNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
};

/** Plan used when the AI gateway is unreachable: search the brief verbatim. */
export const fallbackPlan = (brief: string): SearchPlan => ({
  interpretation: `Searching for "${brief}" without AI interpretation.`,
  businessTypes: [],
  locations: [],
  searchQueries: [brief],
  mustHave: [],
  exclude: [],
  aiPlanned: false,
});

export async function planSearch(brief: string, icpSummary: string): Promise<SearchPlan> {
  const plan = await callGatewayTool<PlannerResponse>(
    "You plan B2B business-discovery searches for a wholesale optical supplier. " +
      "Read the operator's brief and produce concrete search queries a web search engine or business " +
      "directory would answer well. Infer geography from the brief; do not invent a location that was " +
      "not asked for. Keep queries short and literal - they are sent to search providers verbatim.",
    [
      `Operator brief: ${brief}`,
      "",
      "Who we sell to (background context, do not override the brief):",
      icpSummary,
    ].join("\n"),
    PLANNER_TOOL,
  );

  const locations = Array.isArray(plan.locations)
    ? (plan.locations as Array<Record<string, unknown>>)
      .map((item) => ({ city: blankToNull(item.city), country: blankToNull(item.country) }))
      .filter((item) => item.city || item.country)
    : [];

  const searchQueries = asStrings(plan.search_queries);

  return {
    interpretation: String(plan.interpretation ?? "").trim() || `Searching for "${brief}".`,
    businessTypes: asStrings(plan.business_types),
    locations,
    searchQueries: searchQueries.length > 0 ? searchQueries.slice(0, 4) : [brief],
    mustHave: asStrings(plan.must_have),
    exclude: asStrings(plan.exclude),
    aiPlanned: true,
  };
}
