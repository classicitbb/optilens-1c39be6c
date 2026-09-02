// Pure candidate-list logic, kept free of Deno APIs so it can be unit tested.

import type { LeadCandidate } from "./providers/types.ts";
import type { SearchPlan } from "./ai/planner.ts";
import { businessNameKey } from "./providers/businessName.ts";

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

/** Fills gaps in `winner` from `other` without ever replacing populated facts. */
const merge = (winner: LeadCandidate, other: LeadCandidate): LeadCandidate => ({
  ...winner,
  // Keep the fuller name so a truncated variant never wins.
  name: (other.name ?? "").length > (winner.name ?? "").length ? other.name : winner.name,
  website: winner.website ?? other.website ?? null,
  city: winner.city ?? other.city ?? null,
  country: winner.country ?? other.country ?? null,
  instagram_handle: winner.instagram_handle ?? other.instagram_handle ?? null,
  facebook_page: winner.facebook_page ?? other.facebook_page ?? null,
  google_rating: winner.google_rating ?? other.google_rating ?? null,
  google_reviews_count: winner.google_reviews_count ?? other.google_reviews_count ?? null,
  formatted_address: winner.formatted_address ?? other.formatted_address ?? null,
  source_snippet: winner.source_snippet ?? other.source_snippet ?? null,
  source_provider: winner.source_provider === other.source_provider
    ? winner.source_provider
    : `${winner.source_provider}+${other.source_provider}`,
});

const locationsAgree = (a: LeadCandidate, b: LeadCandidate) => {
  const cityA = normalise(a.city ?? "");
  const cityB = normalise(b.city ?? "");
  if (cityA && cityB) return cityA === cityB;
  const countryA = normalise(a.country ?? "");
  const countryB = normalise(b.country ?? "");
  if (countryA && countryB) return countryA === countryB;
  return true;
};

/** True when two normalised names are the same business written differently. */
const namesAreSimilar = (a: string, b: string) => {
  if (!a || !b) return false;
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length < 5) return false;
  return longer.startsWith(`${shorter} `) || longer.endsWith(` ${shorter}`) ||
    longer.includes(` ${shorter} `);
};

/**
 * Collapses rows describing the same business. Website domain is the strongest
 * identity signal; without one we fall back to name + city. A second pass then
 * groups near-identical names (suffix words, sub-page titles) so one shop does
 * not appear as several near-duplicate leads. Later rows fill in fields the
 * winner is missing rather than replacing it.
 */
export function dedupeCandidates(candidates: LeadCandidate[]): LeadCandidate[] {
  const byKey = new Map<string, LeadCandidate>();

  for (const candidate of candidates) {
    const nameKey = businessNameKey(candidate.name);
    if (!nameKey && !candidate.website) continue;

    const key = domainOf(candidate.website) ?? `${nameKey}|${normalise(candidate.city ?? "")}`;

    const existing = byKey.get(key);
    byKey.set(key, existing ? merge(existing, candidate) : { ...candidate });
  }

  const grouped: LeadCandidate[] = [];
  for (const candidate of byKey.values()) {
    const key = businessNameKey(candidate.name);
    const matchIndex = grouped.findIndex((row) =>
      namesAreSimilar(businessNameKey(row.name), key) && locationsAgree(row, candidate)
    );

    if (matchIndex === -1) {
      grouped.push(candidate);
      continue;
    }
    grouped[matchIndex] = merge(grouped[matchIndex], candidate);
  }

  return grouped;
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
