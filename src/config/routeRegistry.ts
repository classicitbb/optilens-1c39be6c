export type RouteDomain = "public-site" | "customer-portal" | "operations-console" | "admin-console";
export type RouteAudience = "public" | "customer" | "staff" | "admin";
export type AuthMode = "public" | "authenticated" | "admin";
export type AppLayout = "customer-shell" | "admin-shell";
export type RouteStatus = "active" | "hidden";

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
  { id: "public.assistant.window", path: "/assistant/window", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.optical-retail-websites", path: "/optical-retail-websites", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.rx-order", path: "/rx-order", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.rx-job-status", path: "/rx-job-status", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.auth", path: "/auth", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-auth", status: "active" },
  { id: "public.reset-password", path: "/reset-password", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-auth", status: "active" },
  { id: "public.blog", path: "/blog", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.blog.article", path: "/blog/:slug", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.knowledge", path: "/knowledge", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.knowledge.article", path: "/knowledge/:articleSlug", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals", path: "/professionals", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients", path: "/patients", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients.lens-differences", path: "/patients/lens-differences", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients.progressive-lenses", path: "/patients/progressive-lenses", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients.anti-fatigue-lenses", path: "/patients/anti-fatigue-lenses", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients.caring-for-glasses", path: "/patients/caring-for-glasses", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients.computer-mobile-use", path: "/patients/computer-mobile-use", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients.sunlight-protection", path: "/patients/sunlight-protection", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients.regular-eye-exams", path: "/patients/regular-eye-exams", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.find-a-retailer", path: "/find-a-retailer", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.find-a-retailer.barbados", path: "/find-a-retailer/barbados", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.patients.night-driving-aids", path: "/patients/night-driving-aids", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.dispensing-tips", path: "/dispensing-tips", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals.chemistrie-lens-system", path: "/professionals/chemistrie-lens-system", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals.customer-supplied-frames-policy", path: "/professionals/customer-supplied-frames-policy", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals.freight-delivery-policy", path: "/professionals/freight-delivery-policy", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals.repairs-policy", path: "/professionals/repairs-policy", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals.returns-replacements", path: "/professionals/returns-replacements", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals.lens-ordering-tips", path: "/professionals/lens-ordering-tips", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals.lab-process-overview", path: "/professionals/lab-process-overview", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.professionals.tracing-cutting-guide", path: "/professionals/tracing-cutting-guide", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-main", status: "active" },
  { id: "public.legal", path: "/legal/:slug", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "active" },
  { id: "public.return-policy", path: "/return-policy", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-legal", status: "active" },
  { id: "public.lenses.lens-types", path: "/lenses/lens-types", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.single-vision", path: "/lenses/single-vision", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.progressive", path: "/lenses/progressive", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.anti-fatigue", path: "/lenses/anti-fatigue", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.office-occupational", path: "/lenses/office-occupational", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.bifocals", path: "/lenses/bifocals", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.myopia-control", path: "/lenses/myopia-control", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.led-pro", path: "/lenses/led-pro", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.blue-filter", path: "/lenses/blue-filter", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.polarized", path: "/lenses/polarized", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.tints-fashion-colors", path: "/lenses/tints-fashion-colors", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.specialty", path: "/lenses/specialty", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.materials", path: "/lenses/materials", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.lenses.thickness-chart", path: "/lenses/thickness-chart", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.coatings", path: "/coatings", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.coatings.mirror", path: "/coatings/mirror", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.coatings.ultraclear-ar", path: "/coatings/ultraclear-ar", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.coatings.blueblock-ar", path: "/coatings/blueblock-ar", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.coatings.scratch-resistant", path: "/coatings/scratch-resistant", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.coatings.uv-shield", path: "/coatings/uv-shield", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.coatings.hydrophobic-oleophobic", path: "/coatings/hydrophobic-oleophobic", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "customer.store", path: "/store", domain: "customer-portal", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "customer-main", status: "active" },
  { id: "customer.store.product", path: "/store/product/:productType/:productId", domain: "customer-portal", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "customer-main", status: "active" },
  { id: "customer.checkout", path: "/checkout", domain: "customer-portal", audience: "customer", authMode: "authenticated", layout: "customer-shell", navGroup: "customer-main", status: "active" },
  { id: "customer.profile", path: "/profile/*", domain: "customer-portal", audience: "customer", authMode: "authenticated", layout: "customer-shell", navGroup: "customer-main", status: "active" },
  { id: "admin.root", path: "/admin", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "admin.pricing.compare", path: "/admin/pricing/compare", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "admin.website.store", path: "/admin/website/store", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "admin.website.store.variants", path: "/admin/website/store/variants/:productType/:productId", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "admin.knowledge.wiki", path: "/admin/knowledge/wiki", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "admin.knowledge.wiki.article", path: "/admin/knowledge/wiki/:articleSlug", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "admin.settings.releases", path: "/admin/settings/releases", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "admin.settings.email-previews", path: "/admin/settings/email-previews", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "admin.settings.edge-functions", path: "/admin/settings/edge-functions", domain: "admin-console", audience: "staff", authMode: "admin", layout: "admin-shell", navGroup: "admin", status: "active" },
  { id: "public.photochromic", path: "/photochromic", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-product", status: "active" },
  { id: "public.zenvue.home", path: "/zenvue", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.brilliance", path: "/zenvue/brilliance", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.single-vision", path: "/zenvue/single-vision", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.darkun", path: "/zenvue/darkun", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.compare", path: "/zenvue/compare", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
  { id: "public.zenvue.wholesale", path: "/zenvue/wholesale", domain: "public-site", audience: "public", authMode: "public", layout: "customer-shell", navGroup: "public-zenvue", status: "active" },
];
