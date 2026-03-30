// deno-lint-ignore-file no-explicit-any
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import type { LeadCandidate } from "./providers/types.ts";

export const LEAD_SCORE_FACTORS = [
  "firmographic_fit",
  "role_likelihood",
  "procurement_readiness",
  "digital_maturity",
  "engagement_recency",
  "geography_fit",
  "catalog_match",
] as const;

export type LeadScoreFactor = typeof LEAD_SCORE_FACTORS[number];

export interface LeadScoreFactorBreakdown {
  points: number;
  evidence: string[];
}

export type LeadScoreBreakdown = Record<LeadScoreFactor, LeadScoreFactorBreakdown>;

export const DEFAULT_SCORING_WEIGHTS: Record<LeadScoreFactor, number> = {
  firmographic_fit: 20,
  role_likelihood: 12,
  procurement_readiness: 18,
  digital_maturity: 14,
  engagement_recency: 12,
  geography_fit: 12,
  catalog_match: 12,
};

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

type FactorAssessment = { value: number; evidence: string[] };

function normalizedReviewVolume(count?: number | null): number {
  if (!count || count <= 0) return 0.25;
  return clamp(count / 80, 0, 1);
}

function assessFactor(lead: LeadCandidate, factor: LeadScoreFactor, params: { country?: string; city?: string; query?: string }): FactorAssessment {
  const rating = lead.google_rating ?? null;
  const reviews = lead.google_reviews_count ?? null;
  const hasWebsite = !!lead.website;
  const hasSocial = !!lead.instagram_handle || !!lead.facebook_page;
  const locationTokens = [lead.country?.toLowerCase(), lead.city?.toLowerCase()].filter(Boolean);
  const query = (params.query ?? "").toLowerCase();

  switch (factor) {
    case "firmographic_fit": {
      const value = clamp(0.4 + normalizedReviewVolume(reviews) * 0.6, 0, 1);
      return {
        value,
        evidence: [
          `Google reviews volume: ${reviews ?? 0}`,
          value >= 0.7 ? "Review footprint suggests established business." : "Moderate/low review footprint; treat as emerging fit.",
        ],
      };
    }
    case "role_likelihood": {
      const value = hasSocial ? 0.7 : 0.45;
      return {
        value,
        evidence: [
          hasSocial ? "Active social identity available for outreach." : "No social profile found; role match confidence is reduced.",
        ],
      };
    }
    case "procurement_readiness": {
      const healthyRating = rating ? clamp((rating - 3.4) / 1.4, 0, 1) : 0.45;
      const value = clamp(healthyRating * 0.7 + normalizedReviewVolume(reviews) * 0.3, 0, 1);
      return {
        value,
        evidence: [
          `Google rating: ${rating ?? "unknown"}`,
          value >= 0.65 ? "Quality signals suggest near-term procurement readiness." : "Mixed quality signals; procurement timing may be uncertain.",
        ],
      };
    }
    case "digital_maturity": {
      const value = hasWebsite && hasSocial ? 0.9 : hasWebsite || hasSocial ? 0.65 : 0.35;
      return {
        value,
        evidence: [
          hasWebsite ? "Website detected." : "No website detected.",
          hasSocial ? "Social account detected." : "No social account detected.",
        ],
      };
    }
    case "engagement_recency": {
      const value = reviews && reviews > 0 ? clamp(0.35 + normalizedReviewVolume(reviews) * 0.65, 0, 1) : 0.3;
      return {
        value,
        evidence: ["Using current review footprint as a proxy for recent customer engagement."],
      };
    }
    case "geography_fit": {
      const scopedCountry = params.country?.toLowerCase();
      const scopedCity = params.city?.toLowerCase();
      const countryMatch = scopedCountry && lead.country?.toLowerCase() === scopedCountry;
      const cityMatch = scopedCity && lead.city?.toLowerCase() === scopedCity;
      const value = cityMatch ? 1 : countryMatch ? 0.8 : params.country || params.city ? 0.35 : 0.7;
      return {
        value,
        evidence: [
          cityMatch
            ? `City match with target scope (${params.city}).`
            : countryMatch
            ? `Country match with target scope (${params.country}).`
            : "Outside selected scope; still eligible for broader targeting.",
        ],
      };
    }
    case "catalog_match": {
      const queryMatch = query.length > 0 && locationTokens.some((token) => query.includes(token ?? ""));
      const opticalSignal = /optical|optomet|vision|eyecare|eye/.test(`${lead.name} ${query}`.toLowerCase());
      const value = opticalSignal ? (queryMatch ? 0.9 : 0.75) : 0.45;
      return {
        value,
        evidence: [
          opticalSignal ? "Business name/query indicates eyewear relevance." : "Category match inferred with limited confidence.",
          query ? `Search intent reference: "${params.query}".` : "No query intent provided.",
        ],
      };
    }
  }
}

export async function loadScoringWeights(supabaseClient: SupabaseClient): Promise<Record<LeadScoreFactor, number>> {
  const weights = { ...DEFAULT_SCORING_WEIGHTS };

  try {
    const { data, error } = await supabaseClient
      .from("lead_scoring_weights" as any)
      .select("factor,weight")
      .eq("is_active", true);

    if (error || !Array.isArray(data)) return weights;

    for (const row of data as Array<{ factor?: string; weight?: number }>) {
      if (!row.factor || typeof row.weight !== "number") continue;
      if ((LEAD_SCORE_FACTORS as readonly string[]).includes(row.factor)) {
        weights[row.factor as LeadScoreFactor] = clamp(row.weight, 0, 100);
      }
    }
  } catch {
    return weights;
  }

  return weights;
}

export function scoreLead(
  lead: LeadCandidate,
  weights: Record<LeadScoreFactor, number>,
  params: { country?: string; city?: string; query?: string },
): { score: number; lead_score_breakdown: LeadScoreBreakdown } {
  const lead_score_breakdown = {} as LeadScoreBreakdown;

  let total = 0;
  for (const factor of LEAD_SCORE_FACTORS) {
    const assessment = assessFactor(lead, factor, params);
    const weightedPoints = Math.round(clamp(weights[factor], 0, 100) * clamp(assessment.value, 0, 1));
    lead_score_breakdown[factor] = {
      points: weightedPoints,
      evidence: assessment.evidence,
    };
    total += weightedPoints;
  }

  return {
    score: clamp(Math.round(total), 0, 100),
    lead_score_breakdown,
  };
}

