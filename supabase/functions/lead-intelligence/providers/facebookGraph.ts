import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getToken = () => Deno.env.get("FACEBOOK_GRAPH_API_TOKEN")?.trim() ?? "";

const search = async (_params: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const token = getToken();
  if (!token) {
    throw new Error("NOT_CONFIGURED");
  }

  // Policy-compliant placeholder: page/entity search requires vetted app permissions.
  return [];
};

export const facebookGraphProvider: ProviderAdapter = {
  id: "facebook_graph",
  isConfigured: () => Boolean(getToken()),
  search,
};
