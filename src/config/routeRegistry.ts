export type RouteDomain = "public-site" | "customer-portal" | "operations-console" | "admin-console" | "moonshot";
export type RouteAudience = "public" | "customer" | "staff" | "admin" | "leadership";
export type AuthMode = "public" | "authenticated" | "admin";
export type AppLayout = "customer-shell" | "admin-shell" | "moonshot-shell";
export type RouteStatus = "active" | "hidden" | "placeholder" | "legacy-redirect";

export interface RouteDefinition {
  id: string;
  path: string;
  domain: RouteDomain;
  audience: RouteAudience;
  authMode: AuthMode;
  layout: AppLayout;
  navGroup: string;
  status: RouteStatus;
  featureFlag?: string;
  redirectTo?: string;
}

export const APP_ROUTE_REGISTRY: RouteDefinition[] = [
  { id: "public.home", path: "/", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.auth", path: "/auth", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-auth", status: "active" },
  { id: "public.reset-password", path: "/reset-password", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-auth", status: "active" },
  { id: "public.knowledge", path: "/knowledge", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals", path: "/professionals", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.for-professionals-redirect", path: "/for-professionals", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "legacy-redirect", redirectTo: "/professionals" },
  { id: "public.legal", path: "/legal/:slug", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "active" },
  { id: "public.privacy-redirect", path: "/privacy-policy", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "legacy-redirect", redirectTo: "/legal/privacy-policy" },
  { id: "public.terms-redirect", path: "/terms", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "legacy-redirect", redirectTo: "/legal/terms" },
  { id: "public.terms-of-use-redirect", path: "/terms-of-use", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "legacy-redirect", redirectTo: "/legal/terms" },
  { id: "public.cookie-policy-redirect", path: "/cookie-policy", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "legacy-redirect", redirectTo: "/legal/cookie-policy" },
  { id: "public.disclaimer-redirect", path: "/disclaimer", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "legacy-redirect", redirectTo: "/legal/disclaimer" },
  { id: "public.accessibility-redirect", path: "/accessibility", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "legacy-redirect", redirectTo: "/legal/accessibility" },
  { id: "public.return-policy", path: "/return-policy", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "active" },
  { id: "public.lenses", path: "/lenses", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "legacy-redirect", redirectTo: "/lenses/lens-types" },
  { id: "public.coatings.mirrors", path: "/coatings/mirrors", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "legacy-redirect", redirectTo: "/coatings/mirror" },
  { id: "public.coatings.mirror-finish-guide", path: "/mirror-finish-guide", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "legacy-redirect", redirectTo: "/coatings/mirror" },
  { id: "public.coatings.ar-works", path: "/coatings/how-ar-coating-works", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "legacy-redirect", redirectTo: "/knowledge#how-ar-coating-works" },
  { id: "public.coatings.caring", path: "/coatings/caring-for-coated-lenses", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "legacy-redirect", redirectTo: "/knowledge#caring-for-coated-lenses" },
  { id: "customer.store", path: "/store", domain: "customer-portal", audience: "customer", authMode: "authenticated", layout: "customer-shell", navGroup: "customer-main", status: "active" },
  { id: "customer.profile", path: "/profile/*", domain: "customer-portal", audience: "customer", authMode: "authenticated", layout: "customer-shell", navGroup: "customer-main", status: "active" },
  { id: "customer.orders-redirect", path: "/orders", domain: "customer-portal", audience: "customer", authMode: "authenticated", layout: "customer-shell", navGroup: "customer-main", status: "legacy-redirect", redirectTo: "/profile/orders" },
  { id: "admin.root", path: "/admin", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "moonshot.root", path: "/admin/moonshot", domain: "moonshot", audience: "leadership", authMode: "admin", layout: "moonshot-shell", navGroup: "moonshot", status: "active" },
  { id: "public.zenvue.home", path: "/zenvue", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.brilliance", path: "/zenvue/brilliance", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.single-vision", path: "/zenvue/single-vision", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.sundun", path: "/zenvue/sundun", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.darkun", path: "/zenvue/darkun", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.photochromic", path: "/photochromic", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.compare", path: "/zenvue/compare", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.wholesale", path: "/zenvue/wholesale", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
];

export const LEGACY_REDIRECTS = APP_ROUTE_REGISTRY.filter((route) => route.status === "legacy-redirect");


const legacyRedirectsByPath = new Map(LEGACY_REDIRECTS.map((route) => [route.path, route]));

const pickLegacyRedirects = (paths: string[]) =>
  paths
    .map((path) => legacyRedirectsByPath.get(path))
    .filter((route): route is RouteDefinition => Boolean(route));

export const PORTAL_LEGACY_REDIRECTS = pickLegacyRedirects(["/orders"]);
export const PUBLIC_MISC_REDIRECTS = pickLegacyRedirects(["/for-professionals"]);
export const PUBLIC_LEGAL_REDIRECTS = pickLegacyRedirects([
  "/privacy-policy",
  "/terms",
  "/terms-of-use",
  "/cookie-policy",
  "/disclaimer",
  "/accessibility",
]);
export const PUBLIC_LENSES_REDIRECTS = pickLegacyRedirects(["/lenses"]);
export const PUBLIC_COATINGS_REDIRECTS = pickLegacyRedirects([
  "/coatings/mirrors",
  "/mirror-finish-guide",
  "/coatings/how-ar-coating-works",
  "/coatings/caring-for-coated-lenses",
]);
