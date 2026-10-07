import { fetchPlaceDetails, findPlaceForContact } from "./googlePlaceDetails.ts";
import { researchPublicWeb, type PublicWebSource } from "./publicWebResearch.ts";

export type ResearchProvider = "google_places" | "openai_web_search";
export async function researchProvider(provider: ResearchProvider, apiKey: string, query: string, name: string, model: string): Promise<PublicWebSource[]> {
  if (provider === "openai_web_search") return researchPublicWeb(apiKey, query, model);
  const match = await findPlaceForContact(apiKey, query, name);
  if (match.kind === "no_match") return [];
  if (match.kind === "ambiguous") throw new Error(`Google Places has several possible matches: ${match.candidates.join("; ")}`);
  const place = await fetchPlaceDetails(apiKey, match.placeId);
  return [{ title: `Google Places: ${place.name}`, url: place.mapsUrl,
    snippet: [place.formattedAddress, place.phone, place.website].filter(Boolean).join(" · "), emails: [] }];
}
