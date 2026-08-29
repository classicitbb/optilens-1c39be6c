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

  // Page titles often carry a site suffix ("Acme Optical | Yelp"). The lookup
  // pipeline skips the AI qualifier, so strip the suffix here to keep suggested
  // business names clean.
  return results.slice(0, 20).map((item: any) => ({
    name: String(item.title ?? item.url ?? "Unknown Business")
      .split(" | ")[0]
      .split(" - ")[0]
      .trim() || String(item.url ?? "Unknown Business"),
    city: city ?? null,
    country: country ?? null,
    website: item.url || null,
    instagram_handle: null,
    facebook_page: null,
    google_rating: null,
    google_reviews_count: null,
    formatted_address: null,
    source_snippet: typeof item.description === "string" ? item.description : null,
    source_provider: "firecrawl_search",
    score: 0,
  } satisfies LeadCandidate));
};

export const firecrawlSearchProvider: ProviderAdapter = {
  id: "firecrawl_search",
  isConfigured: () => Boolean(getApiKey()),
  search,
};
