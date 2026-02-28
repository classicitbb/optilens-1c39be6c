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
  base_weight: number | null;
  performance_weight: number | null;
  cac_penalty_weight: number | null;
  negative_filters: string[] | null;
};

type PerformanceRow = {
  strategy_id: string;
  sample_size: number;
  win_rate: number;
  avg_deal_size: number | null;
  cac_proxy: number | null;
  computed_at: string;
};

type HistoricalPerformance = {
  sampleSize: number;
  winRate: number;
  avgDealSize: number | null;
  cacProxy: number | null;
};

export type RankedIntent = {
  rank: number;
  score: number;
  strategyId: string;
  searchIntent: string;
  query: string;
  industry: string;
  channelHints: string[];
  rationale: string[];
  whySuggested: string[];
  historicalPerformance: HistoricalPerformance | null;
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
    .select("id, industry, subsegments, buyer_roles, exclusions, keyword_clusters, channel_hints, base_weight, performance_weight, cac_penalty_weight, negative_filters")
    .order("industry", { ascending: true });

  if (error) {
    throw new Error(`Unable to load lead search strategies: ${error.message}`);
  }

  const { data: performanceData } = await supabaseClient
    .from("lead_strategy_segment_performance" as never)
    .select("strategy_id, sample_size, win_rate, avg_deal_size, cac_proxy, computed_at")
    .order("computed_at", { ascending: false })
    .limit(500);

  const rows = ((data ?? []) as StrategyRow[]);
  const performanceRows = (performanceData ?? []) as PerformanceRow[];
  const latestByStrategy = new Map<string, PerformanceRow>();
  for (const perf of performanceRows) {
    if (!latestByStrategy.has(perf.strategy_id)) {
      latestByStrategy.set(perf.strategy_id, perf);
    }
  }
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
    const strategyNegativeFilters = (row.negative_filters ?? []).map(normalize);
    const rowChannels = row.channel_hints ?? [];
    const performance = latestByStrategy.get(row.id);

    if (blocked.some((term) => rowExclusions.some((excluded) => excluded.includes(term) || term.includes(excluded)))) {
      continue;
    }

    if (strategyNegativeFilters.some((filterTerm) => filterTerm && normalize(fallbackQuery(constraints)).includes(filterTerm))) {
      continue;
    }

    const segment = rowSubsegments[0] ?? row.industry;
    const role = rowRoles[0] ?? "buyers";
    const intentLabel = `${segment} ${role}`;

    const baseWeight = Number(row.base_weight ?? 1);
    const performanceWeight = Number(row.performance_weight ?? 1);
    const cacPenaltyWeight = Number(row.cac_penalty_weight ?? 1);
    const historicalWinRate = Number(performance?.win_rate ?? 0);
    const historicalCacProxy = Number(performance?.cac_proxy ?? 0);

    let score = 35 * baseWeight;
    const rationale: string[] = [];
    const whySuggested: string[] = [];

    if (categories.length > 0 && includesAny(rowKeywords, categories)) {
      score += 18;
      rationale.push("Matches product category keywords.");
      whySuggested.push("Aligned to requested product category terms.");
    }

    if (tiers.length > 0 && includesAny(rowKeywords, tiers)) {
      score += 12;
      rationale.push("Aligned with target margin tier language.");
      whySuggested.push("Margin tier signal appears in known winning query clusters.");
    }

    if (geography) {
      score += 10;
      rationale.push(`Constrained to fulfillment geography: ${geography}.`);
      whySuggested.push(`Matches fulfillment geography (${geography}).`);
    }

    if (profile && (intentLabel.toLowerCase().includes(profile) || rowKeywords.some((k) => k.toLowerCase().includes(profile)))) {
      score += 20;
      rationale.push("Echoes existing customer profile.");
      whySuggested.push("Looks similar to your existing customer profile.");
    }

    if (performance) {
      score += historicalWinRate * 40 * performanceWeight;
      score -= historicalCacProxy * 2 * cacPenaltyWeight;
      rationale.push(`Historical segment win rate ${(historicalWinRate * 100).toFixed(1)}% applied.`);
      whySuggested.push(`Historical performance: ${(historicalWinRate * 100).toFixed(1)}% win rate with CAC proxy ${historicalCacProxy.toFixed(2)}.`);
    }

    if (rationale.length === 0) {
      rationale.push("General-fit strategy from historical lead targeting setup.");
    }

    if (whySuggested.length === 0) {
      whySuggested.push("Fallback strategy match based on your current constraints.");
    }

    const queryParts = [row.industry, segment, role, ...(categories.slice(0, 2))]
      .filter(Boolean)
      .map((part) => part.trim());

    if (geography) queryParts.push(geography);

    intents.push({
      rank: 0,
      score,
      strategyId: row.id,
      searchIntent: intentLabel,
      query: queryParts.join(" "),
      industry: row.industry,
      channelHints: rowChannels,
      rationale,
      whySuggested,
      historicalPerformance: performance
        ? {
          sampleSize: performance.sample_size,
          winRate: historicalWinRate,
          avgDealSize: performance.avg_deal_size,
          cacProxy: performance.cac_proxy,
        }
        : null,
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

function fallbackQuery(constraints: AutopilotConstraints): string {
  return [
    ...(constraints.productCategories ?? []),
    ...(constraints.marginTiers ?? []),
    constraints.existingCustomerProfile ?? "",
    constraints.fulfillmentGeography ?? "",
  ]
    .join(" ")
    .trim()
    .toLowerCase();
}
