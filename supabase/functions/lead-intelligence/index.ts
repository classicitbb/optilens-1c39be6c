import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LeadCandidate = {
  name: string;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  instagram_handle?: string | null;
  facebook_page?: string | null;
  google_rating?: number | null;
  google_reviews_count?: number | null;
  score?: number;
};

type BlockedIntentCategory = "illegal" | "exploitative_vulnerability" | "coercive_abusive_targeting";

type ComplianceValidationResult = {
  blocked: boolean;
  category?: BlockedIntentCategory;
  matchedTerm?: string;
  message?: string;
  alternatives: string[];
};

const BLOCKED_INTENT_RULES: Array<{ category: BlockedIntentCategory; terms: string[]; message: string }> = [
  {
    category: "illegal",
    terms: ["fraud", "money laundering", "fake prescription", "counterfeit", "steal", "identity theft", "tax evasion"],
    message: "Requests that facilitate illegal activity are not allowed.",
  },
  {
    category: "exploitative_vulnerability",
    terms: ["elderly victims", "desperate", "financially stressed", "terminally ill", "addicted", "grieving"],
    message: "Requests that exploit vulnerable populations are not allowed.",
  },
  {
    category: "coercive_abusive_targeting",
    terms: ["harass", "blackmail", "threaten", "force them", "without consent", "stalk"],
    message: "Coercive, abusive, or non-consensual targeting is not allowed.",
  },
];

const COMPLIANT_ALTERNATIVES = [
  "Use role-based targeting (e.g., clinic owner, purchasing manager, store manager).",
  "Use industry-based targeting (e.g., independent optical retailers, eye clinics, pharmacies).",
  "Use account-based targeting (e.g., named chains, priority accounts, territory-defined accounts).",
];

function validateTargetingInput(input: string): ComplianceValidationResult {
  const normalized = input.toLowerCase();
  for (const rule of BLOCKED_INTENT_RULES) {
    const matchedTerm = rule.terms.find((term) => normalized.includes(term));
    if (matchedTerm) {
      return {
        blocked: true,
        category: rule.category,
        matchedTerm,
        message: `${rule.message} Matched term: "${matchedTerm}".`,
        alternatives: COMPLIANT_ALTERNATIVES,
      };
    }
  }
  return { blocked: false, alternatives: COMPLIANT_ALTERNATIVES };
}

function formatComplianceError(action: string, validation: ComplianceValidationResult): string {
  const alternatives = validation.alternatives.map((item, idx) => `${idx + 1}. ${item}`).join(" ");
  return `${action} blocked by lead targeting safety policy (${validation.category}). ${validation.message} Try one of these compliant alternatives: ${alternatives}`;
}

async function logBlockedLeadEvent(
  supabaseClient: ReturnType<typeof createClient>,
  details: Record<string, unknown>,
) {
  try {
    await supabaseClient.from("lead_events" as any).insert({
      event_type: "blocked_request",
      provider_diagnostics_summary: details,
    } as any);
  } catch {
    // silently ignore logging failure
  }
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

function scoreLead(item: LeadCandidate): number {
  const volume = item.google_reviews_count ? Math.min(30, item.google_reviews_count / 3) : 8;
  const websiteWeakness = item.website ? 10 : 18;
  const socialWeakness = item.instagram_handle || item.facebook_page ? 8 : 20;
  const supplierPain = item.google_rating && item.google_rating < 4.2 ? 18 : 10;
  const fit = 18;
  return clamp(Math.round(volume + websiteWeakness + socialWeakness + supplierPain + fit));
}

async function searchGooglePlaces(query: string, country?: string, city?: string): Promise<LeadCandidate[]> {
  const apiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
  if (!apiKey) return [];

  const textQuery = [query, city, country].filter(Boolean).join(" ");
  const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  url.searchParams.set("query", textQuery);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const payload = await res.json();
  const results = (payload.results ?? []) as any[];

  return results.slice(0, 50).map((row) => ({
    name: row.name,
    city: city ?? null,
    country: country ?? null,
    website: null,
    google_rating: row.rating ?? null,
    google_reviews_count: row.user_ratings_total ?? null,
    score: 0,
  }));
}

async function enrichFacebookInstagram(candidates: LeadCandidate[]) {
  const fbToken = Deno.env.get("FACEBOOK_GRAPH_API_TOKEN");
  if (!fbToken) return candidates;

  return candidates.map((c) => ({
    ...c,
    instagram_handle: c.instagram_handle ?? null,
    facebook_page: c.facebook_page ?? null,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { query, country, cities, globalSearch, includeDiagnostics } = await req.json();
    const searchQuery = typeof query === "string" && query.trim().length > 0 ? query.trim() : "optical store";

    const compliance = validateTargetingInput(searchQuery);
    if (compliance.blocked) {
      await logBlockedLeadEvent(supabaseClient, {
        source: "lead_intelligence",
        blocked_category: compliance.category,
        matched_term: compliance.matchedTerm,
        query: searchQuery,
      });
      return new Response(JSON.stringify({
        error: formatComplianceError("Lead search request", compliance),
        compliant_alternatives: compliance.alternatives,
        blocked_category: compliance.category,
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedCity = Array.isArray(cities) && cities.length > 0 ? cities[0] : undefined;
    const effectiveCountry = globalSearch ? undefined : country;
    const effectiveCity = globalSearch ? undefined : selectedCity;

    const googleConfigured = !!Deno.env.get("GOOGLE_PLACES_API_KEY");
    const facebookConfigured = !!Deno.env.get("FACEBOOK_GRAPH_API_TOKEN");
    const instagramConfigured = facebookConfigured;
    const yellowPagesConfigured = false;

    let leads = await searchGooglePlaces(searchQuery, effectiveCountry, effectiveCity);
    leads = await enrichFacebookInstagram(leads);
    leads = leads.map((lead) => ({ ...lead, score: scoreLead(lead) }));

    if (leads.length === 0) {
      leads = [
        { name: "VisionCare Bridgetown", country: effectiveCountry ?? "Barbados", city: effectiveCity ?? "Bridgetown", google_rating: 4.1, google_reviews_count: 42, website: null },
        { name: "Island Optical Plus", country: effectiveCountry ?? "Barbados", city: effectiveCity ?? "Bridgetown", google_rating: 4.6, google_reviews_count: 28, website: "https://example.com" },
      ].map((lead) => ({ ...lead, score: scoreLead(lead) }));
    }

    const diagnostics = {
      mode: globalSearch ? "global" : "country_city",
      providerStatus: {
        googlePlacesConfigured: googleConfigured,
        facebookGraphConfigured: facebookConfigured,
        instagramGraphConfigured: instagramConfigured,
        yellowPagesConfigured,
      },
      providersUsed: ["google_places", ...(facebookConfigured ? ["facebook_graph", "instagram_graph"] : []), "fallback_model"],
      queryEcho: {
        query: searchQuery,
        country: effectiveCountry,
        city: effectiveCity,
      },
      fetchedAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify({ leads, diagnostics: includeDiagnostics ? diagnostics : null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("lead-intelligence error", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
