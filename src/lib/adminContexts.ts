import { ADMIN_APPS } from "@/features/admin/core/config/apps";

export interface AdminContextOption {
  value: string;
  label: string;
  path: string;
}

const titleize = (slug: string) =>
  slug
    .split(/[\/-]/g)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");

const buildContextOptions = (): AdminContextOption[] => {
  const bySlug = new Map<string, AdminContextOption>();

  bySlug.set("all", { value: "all", label: "All Pages", path: "/admin/knowledge/wiki" });

  Object.values(ADMIN_APPS).forEach((app) => {
    app.sidebarItems.forEach((item) => {
      const slug = item.route.replace(/^\/admin\//, "");
      if (!bySlug.has(slug)) {
        bySlug.set(slug, { value: slug, label: item.label, path: item.route });
      }
    });

    const appSlug = app.baseRoute.replace(/^\/admin\//, "");
    if (!bySlug.has(appSlug)) {
      bySlug.set(appSlug, { value: appSlug, label: app.title, path: app.defaultRoute });
    }
  });

  return [...bySlug.values()].sort((a, b) => {
    if (a.value === "all") return -1;
    if (b.value === "all") return 1;
    return a.label.localeCompare(b.label);
  });
};

export const ADMIN_CONTEXT_OPTIONS = buildContextOptions();

export const getContextLabel = (slug: string) =>
  ADMIN_CONTEXT_OPTIONS.find((option) => option.value === slug)?.label ?? titleize(slug);

export const contextSlugToPath = (slug: string) =>
  ADMIN_CONTEXT_OPTIONS.find((option) => option.value === slug)?.path ?? `/admin/${slug}`;

export const pathnameToContextSlug = (pathname: string): string => {
  const normalized = pathname.replace(/\/$/, "");
  if (!normalized.startsWith("/admin")) return "all";

  const sortedPaths = ADMIN_CONTEXT_OPTIONS
    .filter((option) => option.value !== "all")
    .map((option) => option.path)
    .sort((a, b) => b.length - a.length);

  const match = sortedPaths.find((path) => normalized === path || normalized.startsWith(`${path}/`));
  if (match) return match.replace(/^\/admin\//, "");

  const stripped = normalized.replace(/^\/admin\/?/, "");
  return stripped || "all";
};
