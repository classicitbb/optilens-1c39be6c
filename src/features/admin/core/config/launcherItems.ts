import {
  BookOpen,
  DollarSign,
  Globe,
  LifeBuoy,
  Plug,
  Rocket,
  Settings,
  ShoppingCart,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Feature } from "@/hooks/useRolePermissions";
import type { CanonicalRole } from "@/lib/accessControl";

export type LauncherItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
  allowedRoles: CanonicalRole[];
  requiredAnyFeature?: Feature[];
};

export const LAUNCHER_ITEMS: LauncherItem[] = [
  { key: "pricing", label: "Pricing", icon: DollarSign, route: "/admin/pricing/catalog", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["catalog", "pricing"] },
  { key: "sales", label: "Sales", icon: ShoppingCart, route: "/admin/sales/proposals", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["catalog-publisher", "quotations", "orders"] },
  { key: "contacts", label: "Contacts", icon: Users, route: "/admin/contacts", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["contacts"] },
  { key: "leads", label: "Leads", icon: Target, route: "/admin/leads/finder", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["leads"] },
  { key: "crm", label: "CRM", icon: Target, route: "/admin/crm/dashboard", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["crm"] },
  { key: "helpdesk", label: "Helpdesk", icon: LifeBuoy, route: "/admin/helpdesk/overview", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["helpdesk", "helpdesk-teams", "helpdesk-sla"] },
  { key: "website", label: "Website", icon: Globe, route: "/admin/website/content", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["content", "website"] },
  { key: "moonshot", label: "Moonshot", icon: Rocket, route: "/moonshot/dashboard", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["moonshot"] },
  { key: "settings", label: "Settings", icon: Settings, route: "/admin/settings/company", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["parameters", "users", "roles", "audit", "integrations", "runtime-errors"] },
  { key: "wiki", label: "Help / Wiki", icon: BookOpen, route: "/admin/knowledge/wiki", allowedRoles: ["admin", "operator"], requiredAnyFeature: ["wiki"] },
  { key: "integrations", label: "Integrations", icon: Plug, route: "/admin/settings/integrations", allowedRoles: ["admin"], requiredAnyFeature: ["integrations"] },
];
