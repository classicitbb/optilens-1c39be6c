import { ACCOUNT_NAV_ITEMS } from "@/components/account/accountNav";

/** Help context for every customer portal page, e.g. /profile/orders -> portal/orders, /profile -> portal/home. */
export const portalPathToContextSlug = (pathname: string) => {
  const rest = pathname.replace(/\/$/, "").replace(/^\/profile\/?/, "");
  return `portal/${rest.split("/")[0] || "home"}`;
};

/** Context slug shared by every portal page. */
export const PORTAL_ALL_CONTEXT = "portal/all";

export const PORTAL_CONTEXT_OPTIONS = ACCOUNT_NAV_ITEMS.map((item) => ({
  value: portalPathToContextSlug(item.to),
  label: item.label,
  path: item.to,
}));
