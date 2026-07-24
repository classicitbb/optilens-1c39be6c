export type ConflictingFeatureKey = "pricelists" | "statements";

export type FeatureOverrideConflict = {
  featureKey: ConflictingFeatureKey;
  label: string;
  requiredTagLabel: string;
};

const FEATURE_LABELS: Record<ConflictingFeatureKey, string> = {
  pricelists: "Pricelists",
  statements: "Statements",
};

const REQUIRED_TAG_LABELS: Record<ConflictingFeatureKey, string> = {
  pricelists: "Approved Access to Pricing (or CEO)",
  statements: "Approved Access to Statement (or CEO)",
};

// Mirrors the tag names checked by can_access_customer_pricing /
// can_access_customer_statement (lower-cased, btrim'd comparison).
const REQUIRED_TAG_NAMES: Record<ConflictingFeatureKey, string[]> = {
  pricelists: ["approved access to pricing", "ceo"],
  statements: ["approved access to statement", "approved access to statements", "ceo"],
};

const CONFLICT_FEATURE_KEYS = Object.keys(REQUIRED_TAG_NAMES) as ConflictingFeatureKey[];

/**
 * Does this contact's tag set satisfy the access-granting tag for a feature?
 * Same rule as can_access_customer_pricing / can_access_customer_statement.
 */
export const tagsGrantFeatureAccess = (tagNames: string[], featureKey: ConflictingFeatureKey): boolean => {
  const normalized = new Set(tagNames.map((name) => name.trim().toLowerCase()));
  return REQUIRED_TAG_NAMES[featureKey].some((tag) => normalized.has(tag));
};

/**
 * A customer_portal_feature_overrides row with enabled=false silently wins
 * over an access-granting tag: can_access_customer_portal_feature returns
 * false the instant the override is false, regardless of tags or approval
 * status (see that function's `IF v_override = false THEN RETURN false`).
 * This finds that contradiction — tag says grant, override says block — so
 * the UI can warn before it becomes a "why can't this CEO see statements"
 * support case, and let an admin clear the stale override on purpose.
 */
export const detectFeatureOverrideConflicts = (
  overrides: Record<string, boolean | undefined>,
  wouldGrantAccessByFeature: Partial<Record<ConflictingFeatureKey, boolean>>,
): FeatureOverrideConflict[] =>
  CONFLICT_FEATURE_KEYS.filter(
    (featureKey) => overrides[featureKey] === false && wouldGrantAccessByFeature[featureKey] === true,
  ).map((featureKey) => ({
    featureKey,
    label: FEATURE_LABELS[featureKey],
    requiredTagLabel: REQUIRED_TAG_LABELS[featureKey],
  }));
