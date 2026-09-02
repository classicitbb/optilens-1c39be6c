// Reads what the grounded providers actually returned and decides which rows
// are real, individual businesses that match the operator's brief.
//
// Raw web-search output is mostly noise: directory pages, "top 10 opticians"
// listicles, marketplace category pages, news articles. Provider rows are also
// named by splitting a page <title>, which is rarely the business name.
//
// The model only ever SELECTS from and RENAMES the rows it is given - it is
// addressed by index and any index it did not receive is discarded. Contact
// facts (website, rating, review count) are always taken from the provider row,
// never from the model, so a lead can never be fabricated here.

import { callGatewayTool } from "./gateway.ts";
import type { LeadCandidate } from "../providers/types.ts";

export type QualifiedLead = LeadCandidate & {
  fit_score: number;
  fit_reason: string;
};

export type RejectedCandidate = {
  name: string;
  reason: string;
};

export type QualificationResult = {
  qualified: QualifiedLead[];
  rejected: RejectedCandidate[];
};

const QUALIFIER_TOOL = {
  name: "return_qualified_leads",
  description: "Classify each numbered search result and score how well it matches the operator's brief.",
  parameters: {
    type: "object",
    properties: {
      results: {
        type: "array",
        items: {
          type: "object",
          properties: {
            index: { type: "integer", description: "The index of the search result being judged." },
            is_business: {
              type: "boolean",
              description:
                "True only if this row is one specific real business. False for directories, listicles, marketplaces, news articles, association pages, or aggregators.",
            },
            name: {
              type: "string",
              description: "The business's actual trading name, cleaned of page-title decoration such as taglines or city suffixes.",
            },
            city: { type: "string", description: "City if determinable from the row, else empty string." },
            country: { type: "string", description: "Country if determinable from the row, else empty string." },
            fit_score: {
              type: "integer",
              description: "0-100. How well this business matches the operator's brief. 0 when is_business is false.",
            },
            reason: {
              type: "string",
              description:
                "One short sentence. When is_business is true, why this is a good or poor fit. When false, why it is not a business.",
            },
          },
          required: ["index", "is_business", "name", "city", "country", "fit_score", "reason"],
          additionalProperties: false,
        },
      },
    },
    required: ["results"],
    additionalProperties: false,
  },
};

type QualifierResponse = {
  results?: Array<{
    index?: unknown;
    is_business?: unknown;
    name?: unknown;
    city?: unknown;
    country?: unknown;
    fit_score?: unknown;
    reason?: unknown;
  }>;
};

const clampScore = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
};

const blankToNull = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
};

const describeCandidate = (candidate: LeadCandidate, index: number) => {
  const parts = [`[${index}] title: ${candidate.name}`];
  if (candidate.website) parts.push(`url: ${candidate.website}`);
  if (candidate.formatted_address) parts.push(`address: ${candidate.formatted_address}`);
  if (candidate.google_rating != null) {
    parts.push(`google: ${candidate.google_rating} stars from ${candidate.google_reviews_count ?? 0} reviews`);
  }
  if (candidate.source_snippet) parts.push(`snippet: ${candidate.source_snippet.slice(0, 300)}`);
  parts.push(`found via: ${candidate.source_provider ?? "unknown"}`);
  return parts.join("\n    ");
};

export async function qualifyCandidates(
  brief: string,
  candidates: LeadCandidate[],
  planContext: { mustHave: string[]; exclude: string[] },
): Promise<QualificationResult> {
  if (candidates.length === 0) return { qualified: [], rejected: [] };

  const constraints = [
    planContext.mustHave.length > 0 ? `Must have: ${planContext.mustHave.join("; ")}.` : "",
    planContext.exclude.length > 0 ? `Exclude: ${planContext.exclude.join("; ")}.` : "",
  ].filter(Boolean).join(" ");

  const response = await callGatewayTool<QualifierResponse>(
    "You qualify raw web search results into B2B sales leads for a wholesale optical supplier. " +
      "You judge only the rows you are given - never add a business that does not appear in the list. " +
      "Most rows will be directory pages, listicles or aggregators rather than businesses; reject those. " +
      "Judge fit honestly: a low score with a clear reason is more useful than a generous one.",
    [
      `Operator brief: ${brief}`,
      constraints ? `Qualifying criteria: ${constraints}` : "",
      "",
      `Search results (${candidates.length}):`,
      ...candidates.map((candidate, index) => `  ${describeCandidate(candidate, index)}`),
      "",
      "Judge every index above exactly once.",
    ].filter(Boolean).join("\n"),
    QUALIFIER_TOOL,
  );

  const qualified: QualifiedLead[] = [];
  const rejected: RejectedCandidate[] = [];
  const seenIndexes = new Set<number>();

  for (const row of response.results ?? []) {
    const index = Number(row.index);
    // Anything outside the input list is a hallucinated row; drop it.
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length) continue;
    if (seenIndexes.has(index)) continue;
    seenIndexes.add(index);

    const source = candidates[index];
    const reason = String(row.reason ?? "").trim();

    if (row.is_business !== true) {
      rejected.push({ name: source.name, reason: reason || "Not an individual business." });
      continue;
    }

    qualified.push({
      ...source,
      name: blankToNull(row.name) ?? source.name,
      city: blankToNull(row.city) ?? source.city ?? null,
      country: blankToNull(row.country) ?? source.country ?? null,
      fit_score: clampScore(row.fit_score),
      fit_reason: reason || "No rationale returned.",
    });
  }

  return { qualified, rejected };
}
