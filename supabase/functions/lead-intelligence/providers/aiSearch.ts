import type { LeadCandidate, ProviderAdapter, ProviderSearchParams } from "./types.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const aiFallbackEnabled = () => (Deno.env.get("ENABLE_AI_SEARCH_FALLBACK") ?? "").trim().toLowerCase() === "true";

const search = async ({ query, country, city }: ProviderSearchParams): Promise<LeadCandidate[]> => {
  if (!aiFallbackEnabled()) throw new Error("NOT_CONFIGURED");

  const apiKey = Deno.env.get("LOVABLE_API_KEY")?.trim();
  if (!apiKey) throw new Error("NOT_CONFIGURED");

  const locationParts = [city, country].filter(Boolean).join(", ");
  const locationClause = locationParts ? ` in ${locationParts}` : "";

  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a strict business data extractor for B2B lead research. " +
            "Only return businesses that are real and verifiable. " +
            "Never invent names, addresses, websites, ratings, review counts, or social handles. " +
            "If you cannot verify a business, omit it. If no verified businesses are found, return an empty list.",
        },
        {
          role: "user",
          content: `Find up to 10 verified businesses${locationClause} matching \"${query}\". Return only businesses you can verify as real. If uncertain, exclude the business. Include fields: name, city, country, website URL if known, instagram_handle if known, facebook_page if known, google_rating if known, google_reviews_count if known.`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_leads",
            description: "Return a list of verified business leads matching the search criteria.",
            parameters: {
              type: "object",
              properties: {
                leads: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Business name" },
                      city: { type: "string", description: "City" },
                      country: { type: "string", description: "Country" },
                      google_rating: { type: "number", description: "Google rating 1-5 if known" },
                      google_reviews_count: { type: "integer", description: "Google reviews count if known" },
                      website: { type: "string", description: "Website URL or null" },
                      instagram_handle: { type: "string", description: "Instagram handle or null" },
                      facebook_page: { type: "string", description: "Facebook page URL or null" },
                    },
                    required: ["name", "city", "country"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["leads"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_leads" } },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const body = await response.text();
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status === 402) throw new Error("PAYMENT_REQUIRED");
    throw new Error(`AI_GATEWAY_${status}: ${body.slice(0, 200)}`);
  }

  const data = await response.json();
  const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) {
    throw new Error("AI_NO_TOOL_CALL");
  }

  let parsed: { leads?: unknown[] };
  try {
    parsed = JSON.parse(toolCall.function.arguments);
  } catch {
    throw new Error("AI_INVALID_JSON");
  }

  if (!Array.isArray(parsed.leads)) return [];

  return parsed.leads.slice(0, 20).map((item: any) => ({
    name: String(item.name ?? "Unknown"),
    city: item.city ?? city ?? null,
    country: item.country ?? country ?? null,
    website: item.website || null,
    instagram_handle: item.instagram_handle || null,
    facebook_page: item.facebook_page || null,
    google_rating: typeof item.google_rating === "number" ? item.google_rating : null,
    google_reviews_count: typeof item.google_reviews_count === "number" ? item.google_reviews_count : null,
    score: 0,
  }));
};

export const aiSearchProvider: ProviderAdapter = {
  id: "ai_search",
  isConfigured: () => aiFallbackEnabled() && Boolean(Deno.env.get("LOVABLE_API_KEY")?.trim()),
  search,
};
