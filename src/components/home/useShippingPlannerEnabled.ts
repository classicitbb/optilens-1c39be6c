import { useWebsiteFeature } from "@/hooks/useWebsiteFeatures";

/** Feature Board flag (public.website_features) that reveals the #shipping section and its links. */
export const useShippingPlannerEnabled = () => useWebsiteFeature("home_shipping_planner", false).enabled;
