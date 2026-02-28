import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getApiKey = () => Deno.env.get("BING_SEARCH_API_KEY")?.trim() ?? "";

const search = async (_params: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("NOT_CONFIGURED");
  }

  return [];
};

export const bingProvider: ProviderAdapter = {
  id: "bing",
  isConfigured: () => Boolean(getApiKey()),
  search,
};
