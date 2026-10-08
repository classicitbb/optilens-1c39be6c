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

export type ConnectionStrength = "unclassified" | "strong" | "not_strong";

export interface CrmContactRef {
  contactId: string;
  contactName: string;
  businessName: string | null;
  isCustomer: boolean;
  reason: string;
}

export interface LeadCrmMatch extends CrmContactRef {
  basis: "confirmed_link" | "name_location" | "website";
  /** True when an operator confirmed the link; false for an automatic association. */
  confirmed: boolean;
}

export interface LeadCrmState {
  identityKey: string;
  normalizedName: string;
  status: "matched" | "suggested" | "customer_marked" | "none" | "unavailable";
  match: LeadCrmMatch | null;
  suggestions: CrmContactRef[];
  isCurrentCustomer: boolean;
  customerSource: "crm_record" | "customer_account" | "manual_mark" | null;
}

export interface LeadFollowUp {
  needsFollowUp: boolean;
  /** Defaults to the signed-in operator when empty. */
  ownerId: string | null;
  dueDate: string | null;
}

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
  /** One-line rationale from the AI qualifier explaining the fit score. */
  fit_reason?: string | null;
  /** Which provider(s) surfaced this lead. */
  source_provider?: string | null;
  formatted_address?: string | null;
  search_run_id?: string | null;
  lead_source?: string | null;
  lead_segment?: "decision_makers" | "operators" | "procurement_influencers" | null;
  /** Stable across searches for the same business. */
  identity_key?: string;
  crm?: LeadCrmState;
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
