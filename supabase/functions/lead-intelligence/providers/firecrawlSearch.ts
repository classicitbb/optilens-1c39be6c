import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getApiKey = () => Deno.env.get("FIRECRAWL_API_KEY")?.trim() ?? "";

const search = async ({ query, country, city }: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("NOT_CONFIGURED");

  const locationParts = [city, country].filter(Boolean).join(", ");
  const searchQuery = locationParts ? `${query} ${locationParts}` : query;

  const response = await fetch("https://api.firecrawl.dev/v1/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: searchQuery,
      limit: 15,
      lang: "en",
      country: country?.toLowerCase()?.slice(0, 2) || undefined,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const body = await response.text();
    if (status === 402) throw new Error("FIRECRAWL_INSUFFICIENT_CREDITS");
    throw new Error(`FIRECRAWL_${status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const results = Array.isArray(data?.data) ? data.data : [];

  return results.slice(0, 20).map((item: any) => {
    const title = String(item.title ?? item.url ?? "Unknown Business");
    // Extract domain as a rough business name
    const name = title.length > 3 ? title.split(" - ")[0].split(" | ")[0].trim() : title;

    return {
      name,
      city: city ?? null,
      country: country ?? null,
      website: item.url || null,
      instagram_handle: null,
      facebook_page: null,
      google_rating: null,
      google_reviews_count: null,
      score: 0,
    };
  });
};

export const firecrawlSearchProvider: ProviderAdapter = {
  id: "firecrawl_search",
  isConfigured: () => Boolean(getApiKey()),
  search,
};
