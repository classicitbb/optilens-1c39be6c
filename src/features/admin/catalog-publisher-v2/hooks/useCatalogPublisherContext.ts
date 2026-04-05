import { useLocation, useSearchParams } from "react-router";
import type { PublisherPrefillContext, PublisherSource } from "../types";

const SOURCE_VALUES: PublisherSource[] = ["leads_ai", "crm_opportunity", "manual"];

const parseSource = (value: string | null): PublisherSource | undefined => (
  value && SOURCE_VALUES.includes(value as PublisherSource) ? (value as PublisherSource) : undefined
);

export const useCatalogPublisherContext = (): PublisherPrefillContext => {
  const location = useLocation();
  const [params] = useSearchParams();
  const state = (location.state ?? {}) as PublisherPrefillContext;

  return {
    opportunityId: state.opportunityId ?? params.get("opportunityId"),
    leadId: state.leadId ?? params.get("leadId"),
    country: state.country ?? params.get("country"),
    volumeTier: state.volumeTier ?? params.get("volumeTier"),
    source: state.source ?? parseSource(params.get("source")),
    selectedProductIds: state.selectedProductIds,
  };
};
