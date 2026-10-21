import { fetchPlaceDetails, findPlaceForContact } from "./googlePlaceDetails.ts";
import { researchPublicWeb, type PublicWebSource } from "./publicWebResearch.ts";

/** A real answer, not an outage: several businesses fit, so a person must choose. */
export class AmbiguousMatchError extends Error {}

export type ResearchProvider = "google_places" | "openai_web_search";
export async function researchProvider(provider: ResearchProvider, apiKey: string, query: string, name: string, model: string): Promise<PublicWebSource[]> {
  if (provider === "openai_web_search") return researchPublicWeb(apiKey, query, model);
  const match = await findPlaceForContact(apiKey, query, name);
  if (match.kind === "no_match") return [];
  if (match.kind === "ambiguous") throw new AmbiguousMatchError(`Google Places found several possible matches (${match.candidates.join("; ")}). Add the city or exact business name to the contact, save, and research again.`);
  const place = await fetchPlaceDetails(apiKey, match.placeId);
  return [{ title: `Google Places: ${place.name}`, url: place.mapsUrl,
    snippet: [place.formattedAddress, place.phone, place.website].filter(Boolean).join(" · "), emails: [] }];
}
