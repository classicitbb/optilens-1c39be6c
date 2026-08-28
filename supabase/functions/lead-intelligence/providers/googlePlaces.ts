// Places API (New) text search.
//
// The legacy endpoint (maps.googleapis.com/maps/api/place/textsearch/json) is
// not enabled on projects created after the New API shipped and returns
// REQUEST_DENIED with a LegacyApiNotActivatedMapError, which is what this
// provider used to do. The New API also returns websiteUri, so results now
// carry a website instead of always being null.
//
// The GCP project must have "Places API (New)" enabled, not just "Places API".

import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.displayName",
  "places.formattedAddress",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.addressComponents",
].join(",");

const getApiKey = (credentials?: Record<string, string>) =>
  credentials?.["google_places"]?.trim() ?? Deno.env.get("GOOGLE_PLACES_API_KEY")?.trim() ?? "";

type AddressComponent = { longText?: string; shortText?: string; types?: string[] };

const componentOfType = (components: AddressComponent[], type: string) =>
  components.find((component) => (component.types ?? []).includes(type))?.longText ?? null;

const search = async ({ query, country, city, credentials }: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const apiKey = getApiKey(credentials);
  if (!apiKey) throw new Error("NOT_CONFIGURED");

  const textQuery = [query, city, country].filter(Boolean).join(" ");

  const res = await fetch(PLACES_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, maxResultCount: 20, languageCode: "en" }),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body.slice(0, 200);
    try {
      const parsed = JSON.parse(body);
      if (typeof parsed?.error?.message === "string") message = parsed.error.message;
    } catch {
      // keep the raw body excerpt
    }
    throw new Error(`HTTP_${res.status}: ${message}`);
  }

  const payload = await res.json();
  const places = Array.isArray(payload?.places) ? payload.places : [];

  return places.map((place: Record<string, unknown>) => {
    const components = (place.addressComponents ?? []) as AddressComponent[];
    const formattedAddress = typeof place.formattedAddress === "string" ? place.formattedAddress : null;

    return {
      name: String((place.displayName as { text?: string } | undefined)?.text ?? "Unknown"),
      city: componentOfType(components, "locality") ?? city ?? null,
      country: componentOfType(components, "country") ?? country ?? null,
      website: typeof place.websiteUri === "string" ? place.websiteUri : null,
      google_rating: typeof place.rating === "number" ? place.rating : null,
      google_reviews_count: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
      formatted_address: formattedAddress,
      source_snippet: formattedAddress,
      source_provider: "google_places",
      score: 0,
    } satisfies LeadCandidate;
  });
};

export const googlePlacesProvider: ProviderAdapter = {
  id: "google_places",
  isConfigured: (credentials) => Boolean(getApiKey(credentials)),
  search,
};
