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
