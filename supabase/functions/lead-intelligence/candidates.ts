// Pure candidate-list logic, kept free of Deno APIs so it can be unit tested.

import type { LeadCandidate } from "./providers/types.ts";
import type { SearchPlan } from "./ai/planner.ts";

/** Provider fan-out ceiling. Each task runs every configured provider. */
export const MAX_SEARCH_TASKS = 6;

export type SearchTask = { query: string; city?: string; country?: string };

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const domainOf = (website?: string | null) => {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
};

/**
 * Collapses rows describing the same business. Website domain is the strongest
 * identity signal; without one we fall back to name + city. Later rows fill in
 * fields the winner is missing rather than replacing it, so a Firecrawl hit and
 * a Google Places hit for one shop become a single well-populated lead.
 */
export function dedupeCandidates(candidates: LeadCandidate[]): LeadCandidate[] {
  const byKey = new Map<string, LeadCandidate>();

  for (const candidate of candidates) {
    const nameKey = normalise(candidate.name ?? "");
    if (!nameKey && !candidate.website) continue;

    const key = domainOf(candidate.website) ?? `${nameKey}|${normalise(candidate.city ?? "")}`;

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...candidate });
      continue;
    }

    byKey.set(key, {
      ...existing,
      website: existing.website ?? candidate.website ?? null,
      city: existing.city ?? candidate.city ?? null,
      country: existing.country ?? candidate.country ?? null,
      google_rating: existing.google_rating ?? candidate.google_rating ?? null,
      google_reviews_count: existing.google_reviews_count ?? candidate.google_reviews_count ?? null,
      formatted_address: existing.formatted_address ?? candidate.formatted_address ?? null,
      source_snippet: existing.source_snippet ?? candidate.source_snippet ?? null,
      source_provider: existing.source_provider === candidate.source_provider
        ? existing.source_provider
        : `${existing.source_provider}+${candidate.source_provider}`,
    });
  }

  return [...byKey.values()];
}

/** Expands a plan into the concrete (query, location) pairs to search. */
export function buildSearchTasks(plan: SearchPlan): SearchTask[] {
  const locations = plan.locations.length > 0 ? plan.locations : [{ city: null, country: null }];
  const tasks: SearchTask[] = [];

  for (const query of plan.searchQueries) {
    for (const location of locations) {
      if (tasks.length >= MAX_SEARCH_TASKS) return tasks;
      tasks.push({
        query,
        city: location.city ?? undefined,
        country: location.country ?? undefined,
      });
    }
  }

  return tasks;
}
