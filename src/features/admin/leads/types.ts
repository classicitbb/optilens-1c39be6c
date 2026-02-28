export type LeadStatus = "lead" | "contacted" | "meeting" | "proposal";

export type LeadScoreFactor =
  | "firmographic_fit"
  | "role_likelihood"
  | "procurement_readiness"
  | "digital_maturity"
  | "engagement_recency"
  | "geography_fit"
  | "catalog_match";

export type LeadScoreBreakdown = Record<LeadScoreFactor, { points: number; evidence: string[] }>;

export interface LeadRecord {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  website: string | null;
  instagram_handle: string | null;
  facebook_page: string | null;
  google_rating: number | null;
  google_reviews_count: number | null;
  ai_intent_score: number | null;
  status: LeadStatus;
  score: number;
  lead_score_breakdown?: LeadScoreBreakdown | null;
  notes: string | null;
  search_run_id?: string | null;
  lead_source?: string | null;
  lead_segment?: "decision_makers" | "operators" | "procurement_influencers" | null;
}

export interface InstagramPostPack {
  caption: string;
  hashtags: string[];
  reelScript: string;
  storyIdeas: string[];
}

export interface SequenceStep {
  step: number;
  channel: "whatsapp" | "email" | "instagram_dm";
  delayHours: number;
  prompt: string;
}
