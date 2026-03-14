import type { AppKey } from "@/features/admin/core/config/apps";

export interface NavigationDefinition {
  id: string;
  routeId: string;
  label: string;
  context: "public-site" | "customer-portal" | "operations-console" | "admin-console" | "moonshot";
  group: string;
  appKey?: AppKey;
  order: number;
  status: "active" | "hidden";
}

export const NAVIGATION_REGISTRY: NavigationDefinition[] = [
  { id: "admin.dashboard", routeId: "admin.dashboard", label: "Launch Pad", context: "admin-console", group: "launcher", order: 0, status: "active" },
  { id: "admin.pricing", routeId: "admin.pricing", label: "Pricing", context: "admin-console", group: "launcher", appKey: "pricing", order: 1, status: "active" },
  { id: "admin.sales", routeId: "admin.sales", label: "Sales", context: "admin-console", group: "launcher", appKey: "sales", order: 2, status: "active" },
  { id: "admin.contacts", routeId: "admin.contacts", label: "Contacts", context: "admin-console", group: "launcher", appKey: "contacts", order: 3, status: "active" },
  { id: "admin.leads", routeId: "admin.leads", label: "Leads", context: "admin-console", group: "launcher", appKey: "leads", order: 4, status: "active" },
  { id: "admin.crm", routeId: "admin.crm", label: "CRM", context: "admin-console", group: "launcher", appKey: "crm", order: 5, status: "active" },
  { id: "admin.helpdesk", routeId: "admin.helpdesk", label: "Helpdesk", context: "admin-console", group: "launcher", appKey: "helpdesk", order: 6, status: "active" },
  { id: "admin.website", routeId: "admin.website", label: "Website", context: "admin-console", group: "launcher", appKey: "website", order: 7, status: "active" },
  { id: "admin.knowledge", routeId: "admin.knowledge", label: "Knowledge", context: "admin-console", group: "launcher", appKey: "knowledge", order: 8, status: "active" },
  { id: "admin.settings", routeId: "admin.settings", label: "Settings", context: "admin-console", group: "launcher", appKey: "settings", order: 9, status: "active" },
  { id: "moonshot.workspace", routeId: "moonshot.workspace", label: "Moonshot", context: "moonshot", group: "launcher", appKey: "moonshot", order: 10, status: "active" },
  { id: "moonshot.feedback", routeId: "moonshot.feedback", label: "Give Feedback", context: "moonshot", group: "footer", order: 999, status: "hidden" },
];

export const ACTIVE_NAVIGATION_REGISTRY = NAVIGATION_REGISTRY.filter((item) => item.status === "active");
