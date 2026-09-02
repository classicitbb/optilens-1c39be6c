export type LeadCandidate = {
  name: string;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  instagram_handle?: string | null;
  facebook_page?: string | null;
  google_rating?: number | null;
  google_reviews_count?: number | null;
  formatted_address?: string | null;
  /** Raw text the provider returned about this row; read by the AI qualifier. */
  source_snippet?: string | null;
  /** Which provider surfaced this row. */
  source_provider?: string | null;
  score?: number;
  lead_score_breakdown?: Record<string, { points: number; evidence: string[] }>;
};

export interface ProviderSearchParams {
  query: string;
  country?: string;
  city?: string;
  credentials?: Record<string, string>;
}

export interface ProviderAdapter {
  id: string;
  isConfigured(credentials?: Record<string, string>): boolean;
  search(params: ProviderSearchParams): Promise<LeadCandidate[]>;
}
