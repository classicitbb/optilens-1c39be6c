export interface PriceCatalogItem {
  id: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  description?: string | null;
  unit_price?: number | null;
  web_enabled?: boolean | null;
  wspl_enabled?: boolean | null;
}

export interface PackageLine {
  item: PriceCatalogItem;
  qty: number;
}

export type ProposalSectionKey =
  | "executive_snapshot"
  | "visibility"
  | "conversion"
  | "competitor_comparison"
  | "how_classic_visions_helps"
  | "offer_next_step";

export interface ProposalSection {
  key: ProposalSectionKey;
  title: string;
  body: string;
}

export type PublisherSource = "leads_ai" | "crm_opportunity" | "manual";

export interface PublisherPrefillContext {
  opportunityId?: string | null;
  leadId?: string | null;
  country?: string | null;
  volumeTier?: string | null;
  source?: PublisherSource | null;
  selectedProductIds?: string[];
}
