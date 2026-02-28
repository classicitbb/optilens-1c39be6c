import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AutopilotConstraints = {
  productCategories?: string[];
  marginTiers?: string[];
  fulfillmentGeography?: string;
  existingCustomerProfile?: string;
  exclusions?: string[];
  maxIntents?: number;
};

type StrategyRow = {
  id: string;
  industry: string;
  subsegments: string[] | null;
  buyer_roles: string[] | null;
  exclusions: string[] | null;
  keyword_clusters: string[] | null;
  channel_hints: string[] | null;
};

export type RankedIntent = {
  rank: number;
  score: number;
  searchIntent: string;
  query: string;
  industry: string;
  channelHints: string[];
  rationale: string[];
};

export type PlanningResult = {
  strategyIds: string[];
  rankedIntents: RankedIntent[];
  selectedIntent: RankedIntent | null;
};

const normalize = (value: string) => value.trim().toLowerCase();

const includesAny = (haystack: string[], needles: string[]) => {
  const normalizedHaystack = haystack.map(normalize);
  return needles.some((needle) => normalizedHaystack.some((item) => item.includes(normalize(needle))));
};

export async function generateSearchPlan(
  supabaseClient: SupabaseClient,
  constraints: AutopilotConstraints,
): Promise<PlanningResult> {
  const { data, error } = await supabaseClient
    .from("lead_search_strategies" as never)
    .select("id, industry, subsegments, buyer_roles, exclusions, keyword_clusters, channel_hints")
    .order("industry", { ascending: true });

  if (error) {
    throw new Error(`Unable to load lead search strategies: ${error.message}`);
  }

  const rows = ((data ?? []) as StrategyRow[]);
  const categories = constraints.productCategories ?? [];
  const tiers = constraints.marginTiers ?? [];
  const geography = constraints.fulfillmentGeography?.trim();
  const profile = constraints.existingCustomerProfile?.trim().toLowerCase();
  const blocked = (constraints.exclusions ?? []).map(normalize);
  const intents: RankedIntent[] = [];

  for (const row of rows) {
    const rowSubsegments = row.subsegments ?? [];
    const rowRoles = row.buyer_roles ?? [];
    const rowKeywords = row.keyword_clusters ?? [];
    const rowExclusions = (row.exclusions ?? []).map(normalize);
    const rowChannels = row.channel_hints ?? [];

    if (blocked.some((term) => rowExclusions.some((excluded) => excluded.includes(term) || term.includes(excluded)))) {
      continue;
    }

    const segment = rowSubsegments[0] ?? row.industry;
    const role = rowRoles[0] ?? "buyers";
    const intentLabel = `${segment} ${role}`;

    let score = 35;
    const rationale: string[] = [];

    if (categories.length > 0 && includesAny(rowKeywords, categories)) {
      score += 18;
      rationale.push("Matches product category keywords.");
    }

    if (tiers.length > 0 && includesAny(rowKeywords, tiers)) {
      score += 12;
      rationale.push("Aligned with target margin tier language.");
    }

    if (geography) {
      score += 10;
      rationale.push(`Constrained to fulfillment geography: ${geography}.`);
    }

    if (profile && (intentLabel.toLowerCase().includes(profile) || rowKeywords.some((k) => k.toLowerCase().includes(profile)))) {
      score += 20;
      rationale.push("Echoes existing customer profile.");
    }

    if (rationale.length === 0) {
      rationale.push("General-fit strategy from historical lead targeting setup.");
    }

    const queryParts = [row.industry, segment, role, ...(categories.slice(0, 2))]
      .filter(Boolean)
      .map((part) => part.trim());

    if (geography) queryParts.push(geography);

    intents.push({
      rank: 0,
      score,
      searchIntent: intentLabel,
      query: queryParts.join(" "),
      industry: row.industry,
      channelHints: rowChannels,
      rationale,
    });
  }

  const rankedIntents = intents
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, constraints.maxIntents ?? 5))
    .map((intent, index) => ({ ...intent, rank: index + 1 }));

  return {
    strategyIds: rows.map((row) => row.id),
    rankedIntents,
    selectedIntent: rankedIntents[0] ?? null,
  };
}
