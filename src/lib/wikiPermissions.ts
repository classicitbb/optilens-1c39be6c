import { PATH_FEATURE_MAP, type Feature } from "@/hooks/useRolePermissions";
import { contextSlugToPath } from "@/lib/adminContexts";

const CONTEXT_FEATURE_OVERRIDES: Record<string, Feature> = {
  all: "wiki",
};

export const contextSlugToFeature = (contextSlug: string): Feature | null => {
  if (!contextSlug) return null;
  const normalized = contextSlug.replace(/^\//, "");

  const override = CONTEXT_FEATURE_OVERRIDES[normalized];
  if (override) return override;

  const directPath = normalized.startsWith("admin/") ? `/${normalized}` : `/admin/${normalized}`;
  const mapped = PATH_FEATURE_MAP[directPath];
  if (mapped) return mapped;

  const resolvedPath = contextSlugToPath(normalized);
  return PATH_FEATURE_MAP[resolvedPath] ?? null;
};

export const canViewContextSlug = (
  contextSlug: string,
  canView: (feature: Feature) => boolean
): boolean => {
  const feature = contextSlugToFeature(contextSlug);
  return feature ? canView(feature) : false;
};

const WIKI_CATEGORY_FEATURE_OVERRIDES: Record<string, Feature> = {
  "release-ledger": "wiki",
  "getting-started": "wiki",
  "pricing-app": "catalog",
  "sales-app": "quotations",
  "contacts-app": "contacts",
  "leads-app": "crm",
  "crm-app": "crm",
  "website-app": "content",
  "knowledge-app": "wiki",
  "settings-app": "roles",
};

export const canViewWikiCategory = (
  categoryId: string,
  canView: (feature: Feature) => boolean
): boolean => {
  const feature = WIKI_CATEGORY_FEATURE_OVERRIDES[categoryId] ?? "wiki";
  return canView(feature);
};
