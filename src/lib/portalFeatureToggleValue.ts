// Existing accounts retain inherited access; new profiles receive explicit false rows.
export const portalFeatureToggleValue = (
  feature: string,
  overrides: Record<string, boolean>,
  access: { approved: boolean; pricing: boolean; statements: boolean },
): boolean => {
  if (typeof overrides[feature] === "boolean") return overrides[feature];
  if (feature === "auto-notifications") return true;
  if (feature === "order-prices" || feature === "rx-order") return false;
  if (feature === "pricelists") return access.approved && access.pricing;
  if (feature === "statements") return access.approved && access.statements;
  return access.approved;
};
