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

export const findPlaceForContact = async (apiKey: string, query: string, businessName = query): Promise<PlaceMatch> => {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress" },
    body: JSON.stringify({ textQuery: query, pageSize: 5 }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Google Places lookup failed (HTTP_${response.status}). Check Places API (New) enablement and API key restrictions.`);
  const payload = await response.json();
  if (payload.error || (payload.places !== undefined && !Array.isArray(payload.places))) throw new Error("Google Places returned an unexpected search response.");
  const results = (payload.places ?? []) as Record<string, unknown>[];
  if (!results.length) return { kind: "no_match", reason: "ZERO_RESULTS" };

  const scored = results
    .map((row) => ({
      placeId: String(row.id ?? ""),
      name: String((row.displayName as { text?: string })?.text ?? ""),
      formattedAddress: typeof row.formattedAddress === "string" ? row.formattedAddress : "",
      score: similarity(businessName, String((row.displayName as { text?: string })?.text ?? "")),
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
  "id",
  "displayName",
  "websiteUri",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "formattedAddress",
  "addressComponents",
  "rating",
  "userRatingCount",
  "googleMapsUri",
].join(",");

const component = (components: Record<string, unknown>[], type: string, form: "longText" | "shortText") => {
  const found = components.find((entry) => Array.isArray(entry.types) && (entry.types as string[]).includes(type));
  const value = found?.[form];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

export const fetchPlaceDetails = async (apiKey: string, placeId: string): Promise<PlaceDetails> => {
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": PLACE_FIELDS },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Google Places details failed (HTTP_${response.status}). Check Places API (New) enablement and API key restrictions.`);
  const payload = await response.json();
  if (payload.error || typeof payload.id !== "string") throw new Error("Google Places returned an unexpected details response.");
  const result = payload as Record<string, unknown>;
  const components = (result.addressComponents ?? []) as Record<string, unknown>[];
  const streetNumber = component(components, "street_number", "longText");
  const route = component(components, "route", "longText");

  return {
    placeId: String(result.id),
    name: String((result.displayName as { text?: string })?.text ?? ""),
    website: typeof result.websiteUri === "string" && result.websiteUri.trim() ? result.websiteUri.trim() : null,
    phone: typeof result.internationalPhoneNumber === "string" && result.internationalPhoneNumber.trim()
      ? result.internationalPhoneNumber.trim()
      : typeof result.nationalPhoneNumber === "string" && result.nationalPhoneNumber.trim()
      ? result.nationalPhoneNumber.trim()
      : null,
    street: [streetNumber, route].filter(Boolean).join(" ") || null,
    city: component(components, "locality", "longText")
      ?? component(components, "postal_town", "longText")
      ?? component(components, "administrative_area_level_2", "longText"),
    state: component(components, "administrative_area_level_1", "longText"),
    zip: component(components, "postal_code", "longText"),
    countryName: component(components, "country", "longText"),
    countryCode: component(components, "country", "shortText"),
    rating: typeof result.rating === "number" ? result.rating : null,
    reviewsCount: typeof result.userRatingCount === "number" ? result.userRatingCount : null,
    formattedAddress: typeof result.formattedAddress === "string" ? result.formattedAddress : null,
    mapsUrl: typeof result.googleMapsUri === "string" && result.googleMapsUri
      ? result.googleMapsUri
      : `https://www.google.com/maps/place/?q=place_id:${placeId}`,
  };
};

// Exported for the enrichment core's confidence calculation and for tests.
export const nameSimilarity = similarity;
