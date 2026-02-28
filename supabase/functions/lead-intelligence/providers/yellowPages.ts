import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getApiKey = () => Deno.env.get("YELLOWPAGES_API_KEY")?.trim() ?? "";

const search = async (_params: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("NOT_CONFIGURED");
  }

  return [];
};

export const yellowPagesProvider: ProviderAdapter = {
  id: "yellow_pages",
  isConfigured: () => Boolean(getApiKey()),
  search,
};
