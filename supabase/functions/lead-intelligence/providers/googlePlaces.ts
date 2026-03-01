import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getApiKey = (credentials?: Record<string, string>) =>
  credentials?.["google_places"]?.trim() ?? Deno.env.get("GOOGLE_PLACES_API_KEY")?.trim() ?? "";

const search = async ({ query, country, city, credentials }: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const apiKey = getApiKey(credentials);
  if (!apiKey) {
    throw new Error("NOT_CONFIGURED");
  }

  const textQuery = [query, city, country].filter(Boolean).join(" ");
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", textQuery);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`HTTP_${res.status}`);
  }

  const payload = await res.json();
  const status = typeof payload?.status === "string" ? payload.status : "UNKNOWN";
  const errorMessage = typeof payload?.error_message === "string" ? payload.error_message.trim() : "";

  if (status !== "OK" && status !== "ZERO_RESULTS") {
    throw new Error(errorMessage ? `${status}:${errorMessage}` : status);
  }

  const results = (payload.results ?? []) as Record<string, unknown>[];

  return results.slice(0, 50).map((row) => ({
    name: String(row.name ?? "Unknown"),
    city: city ?? (typeof row.vicinity === "string" ? row.vicinity : null),
    country: country ?? (typeof row.formatted_address === "string"
      ? row.formatted_address.split(",").map((part) => part.trim()).at(-1) ?? null
      : null),
    website: null,
    google_rating: typeof row.rating === "number" ? row.rating : null,
    google_reviews_count: typeof row.user_ratings_total === "number" ? row.user_ratings_total : null,
    score: 0,
  }));
};

export const googlePlacesProvider: ProviderAdapter = {
  id: "google_places",
  isConfigured: (credentials) => Boolean(getApiKey(credentials)),
  search,
};
