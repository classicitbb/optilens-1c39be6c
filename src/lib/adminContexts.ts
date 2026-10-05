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

  bySlug.set("all", { value: "all", label: "All Pages", path: "/atlas/wiki" });

  Object.values(ADMIN_APPS).forEach((app) => {
    app.sidebarItems.forEach((item) => {
      if (item.route.startsWith("/atlas")) return;
      const slug = item.route.replace(/^\/admin\//, "");
      if (!bySlug.has(slug)) {
        bySlug.set(slug, { value: slug, label: item.label, path: item.route });
      }
    });

    const appSlug = app.baseRoute.replace(/^\/admin\//, "");
    if (!app.baseRoute.startsWith("/atlas") && !bySlug.has(appSlug)) {
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

/**
 * Context slugs already stored on pages for surfaces that now live in Atlas. They are still valid
 * assignments (and keep their labels) but are not pages the Copilot widget can be on, so they stay
 * out of ADMIN_CONTEXT_OPTIONS.
 */
const RETIRED_SURFACE_CONTEXTS: AdminContextOption[] = [
  { value: "knowledge/wiki", label: "Wiki", path: "/atlas/wiki" },
  { value: "knowledge/sops", label: "SOPs", path: "/atlas/sops" },
  { value: "website/content", label: "Pages / Content", path: "/atlas/website" },
  { value: "knowledge", label: "Knowledge", path: "/atlas/wiki" },
];

/** Every context a page can be assigned to: the admin pages plus the retired surfaces above. */
export const ASSIGNABLE_CONTEXT_OPTIONS: AdminContextOption[] = [...ADMIN_CONTEXT_OPTIONS, ...RETIRED_SURFACE_CONTEXTS].sort((a, b) => {
  if (a.value === "all") return -1;
  if (b.value === "all") return 1;
  return a.label.localeCompare(b.label);
});

export const getContextLabel = (slug: string) =>
  ASSIGNABLE_CONTEXT_OPTIONS.find((option) => option.value === slug)?.label ?? titleize(slug);

export const contextSlugToPath = (slug: string) =>
  ASSIGNABLE_CONTEXT_OPTIONS.find((option) => option.value === slug)?.path ?? `/admin/${slug}`;

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
