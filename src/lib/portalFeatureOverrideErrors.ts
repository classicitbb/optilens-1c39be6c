const PORTAL_FEATURE_OVERRIDE_CHECK = "customer_portal_feature_overrides_feature_key_check";

const FEATURE_LABELS: Record<string, string> = {
  quotes: "Quotes",
  helpdesk: "Helpdesk",
  pricelists: "Pricelists",
  "private-orders": "Private orders",
  "live-order-status": "Live order status",
  statements: "Statements",
  "auto-notifications": "Auto notifications",
};

const FEATURE_MIGRATION_HINTS: Record<string, string> = {
  "live-order-status":
    "Apply supabase/migrations/20260717090000_live_order_status_feature_gate.sql so the check constraint includes live-order-status.",
  statements:
    "Apply supabase/migrations/20260716120000_allow_statements_feature_key.sql so the check constraint includes statements.",
  "auto-notifications":
    "Add auto-notifications to the portal feature override allowlist or move notification opt-out state to a table with its own supported keys.",
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
};

const isFeatureKeyCheckError = (error: unknown) => {
  const message = getErrorMessage(error);
  if (message.includes(PORTAL_FEATURE_OVERRIDE_CHECK)) return true;
  if (!error || typeof error !== "object") return false;

  const record = error as { code?: unknown; details?: unknown };
  return (
    record.code === "23514" &&
    typeof record.details === "string" &&
    record.details.includes(PORTAL_FEATURE_OVERRIDE_CHECK)
  );
};

export const describePortalFeatureOverrideError = (error: unknown, featureKey: string) => {
  const message = getErrorMessage(error);
  if (!isFeatureKeyCheckError(error)) {
    return message || "Failed to update portal feature.";
  }

  const label = FEATURE_LABELS[featureKey] ?? featureKey;
  const hint = FEATURE_MIGRATION_HINTS[featureKey] ?? `Update the database feature-key allowlist to include ${featureKey}.`;

  return `Cannot update ${label} (${featureKey}). The database rejected this feature key through ${PORTAL_FEATURE_OVERRIDE_CHECK}. ${hint}`;
};
