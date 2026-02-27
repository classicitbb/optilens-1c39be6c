import { useLocation, useSearchParams } from "react-router-dom";
import type { PublisherPrefillContext } from "../types";

export const useCatalogPublisherContext = (): PublisherPrefillContext => {
  const location = useLocation();
  const [params] = useSearchParams();
  const state = (location.state ?? {}) as PublisherPrefillContext;

  return {
    opportunityId: state.opportunityId ?? params.get("opportunityId"),
    leadId: state.leadId ?? params.get("leadId"),
    country: state.country ?? params.get("country"),
    volumeTier: state.volumeTier ?? params.get("volumeTier"),
    selectedProductIds: state.selectedProductIds,
  };
};
