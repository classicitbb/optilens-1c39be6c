import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getApiKey = () => Deno.env.get("YAHOO_SEARCH_API_KEY")?.trim() ?? "";

const search = async (_params: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("NOT_CONFIGURED");
  }

  return [];
};

export const yahooProvider: ProviderAdapter = {
  id: "yahoo",
  isConfigured: () => Boolean(getApiKey()),
  search,
};
