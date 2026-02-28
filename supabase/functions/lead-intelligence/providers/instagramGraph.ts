import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const getToken = () => Deno.env.get("FACEBOOK_GRAPH_API_TOKEN")?.trim() ?? "";

const search = async (_params: ProviderSearchParams): Promise<LeadCandidate[]> => {
  const token = getToken();
  if (!token) {
    throw new Error("NOT_CONFIGURED");
  }

  // Policy-compliant placeholder: Instagram business discovery requires approved Graph scopes.
  return [];
};

export const instagramGraphProvider: ProviderAdapter = {
  id: "instagram_graph",
  isConfigured: () => Boolean(getToken()),
  search,
};
