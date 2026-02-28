export type LeadCandidate = {
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

export interface ProviderSearchParams {
  query: string;
  country?: string;
  city?: string;
}

export interface ProviderAdapter {
  id: string;
  isConfigured(): boolean;
  search(params: ProviderSearchParams): Promise<LeadCandidate[]>;
}
