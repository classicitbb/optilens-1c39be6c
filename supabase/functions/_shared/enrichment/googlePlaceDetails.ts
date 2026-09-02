// Resolve ONE known business to its Google Place record.
//
// Deliberately not a ProviderAdapter: googlePlaces.ts implements lead
// *discovery* (a query in, many LeadCandidates out). This is a different verb —
// we already know who the contact is and want the structured public record for
// them — so it has its own shape rather than lying about that interface.
//
// The match guard here is the only thing standing between the CRM and a
// confidently wrong address. Do not loosen the thresholds to raise coverage.

export type PlaceDetails = {
  placeId: string;
  name: string;
  website: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  countryName: string | null;
  countryCode: string | null;
  rating: number | null;
  reviewsCount: number | null;
  formattedAddress: string | null;
  mapsUrl: string;
};

export type PlaceMatch =
  | { kind: "match"; placeId: string; matchedName: string; similarity: number; formattedAddress: string }
  | { kind: "no_match"; reason: string }
  | { kind: "ambiguous"; candidates: string[] };

/** Minimum name similarity before we will believe a result is the same business. */
const MIN_SIMILARITY = 0.72;
/** The top two results must be this far apart, or the match is ambiguous. */
const MIN_SEPARATION = 0.1;

const normalise = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    // Legal/business suffixes carry no identifying signal and inflate matches.
    .replace(/\b(ltd|limited|inc|incorporated|llc|co|company|corp|the)\b/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

/** Dice coefficient over character bigrams — tolerant of word order and typos. */
const similarity = (left: string, right: string): number => {
  const a = normalise(left);
  const b = normalise(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const bigrams = (value: string) => {
    const pairs: string[] = [];
    for (let index = 0; index < value.length - 1; index += 1) pairs.push(value.slice(index, index + 2));
    return pairs;
  };
  const first = bigrams(a);
  const second = bigrams(b);
  if (!first.length || !second.length) return 0;
  const pool = [...second];
  let hits = 0;
  for (const pair of first) {
    const at = pool.indexOf(pair);
    if (at >= 0) {
      pool.splice(at, 1);
      hits += 1;
    }
  }
  return (2 * hits) / (first.length + second.length);
};

export const findPlaceForContact = async (apiKey: string, query: string): Promise<PlaceMatch> => {
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const payload = await response.json();
  const status = typeof payload?.status === "string" ? payload.status : "UNKNOWN";

  if (status === "ZERO_RESULTS") return { kind: "no_match", reason: "ZERO_RESULTS" };
  if (status !== "OK") {
    const detail = typeof payload?.error_message === "string" ? payload.error_message.trim() : "";
    throw new Error(detail ? `${status}:${detail}` : status);
  }

  const results = (payload.results ?? []) as Record<string, unknown>[];
  if (!results.length) return { kind: "no_match", reason: "ZERO_RESULTS" };

  const scored = results
    .map((row) => ({
      placeId: String(row.place_id ?? ""),
      name: String(row.name ?? ""),
      formattedAddress: typeof row.formatted_address === "string" ? row.formatted_address : "",
      score: similarity(query, String(row.name ?? "")),
    }))
    .filter((row) => row.placeId)
    .sort((a, b) => b.score - a.score);

  if (!scored.length) return { kind: "no_match", reason: "NO_PLACE_ID" };

  const best = scored[0];
  if (best.score < MIN_SIMILARITY) {
    return { kind: "no_match", reason: `LOW_SIMILARITY_${best.score.toFixed(2)}` };
  }
  if (scored.length > 1 && best.score - scored[1].score < MIN_SEPARATION) {
    return { kind: "ambiguous", candidates: scored.slice(0, 3).map((row) => row.name) };
  }

  return {
    kind: "match",
    placeId: best.placeId,
    matchedName: best.name,
    similarity: Number(best.score.toFixed(2)),
    formattedAddress: best.formattedAddress,
  };
};

const PLACE_FIELDS = [
  "place_id",
  "name",
  "website",
  "formatted_phone_number",
  "international_phone_number",
  "formatted_address",
  "address_components",
  "rating",
  "user_ratings_total",
  "url",
].join(",");

const component = (components: Record<string, unknown>[], type: string, form: "long_name" | "short_name") => {
  const found = components.find((entry) => Array.isArray(entry.types) && (entry.types as string[]).includes(type));
  const value = found?.[form];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const fetchPlaceDetails = async (apiKey: string, placeId: string): Promise<PlaceDetails> => {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", PLACE_FIELDS);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const payload = await response.json();
  const status = typeof payload?.status === "string" ? payload.status : "UNKNOWN";
  if (status !== "OK") {
    const detail = typeof payload?.error_message === "string" ? payload.error_message.trim() : "";
    throw new Error(detail ? `${status}:${detail}` : status);
  }

  const result = (payload.result ?? {}) as Record<string, unknown>;
  const components = (result.address_components ?? []) as Record<string, unknown>[];
  const streetNumber = component(components, "street_number", "long_name");
  const route = component(components, "route", "long_name");

  return {
    placeId: String(result.place_id ?? placeId),
    name: String(result.name ?? ""),
    website: typeof result.website === "string" && result.website.trim() ? result.website.trim() : null,
    phone: typeof result.formatted_phone_number === "string" && result.formatted_phone_number.trim()
      ? result.formatted_phone_number.trim()
      : typeof result.international_phone_number === "string" && result.international_phone_number.trim()
      ? result.international_phone_number.trim()
      : null,
    street: [streetNumber, route].filter(Boolean).join(" ") || null,
    city: component(components, "locality", "long_name")
      ?? component(components, "postal_town", "long_name")
      ?? component(components, "administrative_area_level_2", "long_name"),
    state: component(components, "administrative_area_level_1", "long_name"),
    zip: component(components, "postal_code", "long_name"),
    countryName: component(components, "country", "long_name"),
    countryCode: component(components, "country", "short_name"),
    rating: typeof result.rating === "number" ? result.rating : null,
    reviewsCount: typeof result.user_ratings_total === "number" ? result.user_ratings_total : null,
    formattedAddress: typeof result.formatted_address === "string" ? result.formatted_address : null,
    mapsUrl: typeof result.url === "string" && result.url
      ? result.url
      : `https://www.google.com/maps/place/?q=place_id:${placeId}`,
  };
};

// Exported for the enrichment core's confidence calculation and for tests.
export const nameSimilarity = similarity;
