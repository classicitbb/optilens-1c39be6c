import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getApiKey = (credentials?: Record<string, string>) =>
  credentials?.["yahoo"]?.trim() ?? Deno.env.get("YAHOO_SEARCH_API_KEY")?.trim() ?? "";

const search = async ({ credentials }: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const apiKey = getApiKey(credentials);
  if (!apiKey) {
    throw new Error("NOT_CONFIGURED");
  }

  return [];
};

export const yahooProvider: ProviderAdapter = {
  id: "yahoo",
  isConfigured: (credentials) => Boolean(getApiKey(credentials)),
  search,
};
