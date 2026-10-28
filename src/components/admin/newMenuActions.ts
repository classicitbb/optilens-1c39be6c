import { CalendarPlus, Camera, Eye, FileEdit, Landmark, Mail, Package, Ship, Store, Tags, Ticket, User, Building2, type LucideIcon } from "lucide-react";
import type { Feature } from "@/hooks/useRolePermissions";

/**
 * How a "New" action launches:
 * - `route`: navigates into the module, optionally with `?new=<value>` which the
 *   destination page consumes (see `useLaunchNew`).
 * - `in-place`: opens a dialog over whatever page the user is already on.
 */
export type NewAction = {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  access: { app: string } | { edit: Feature };
} & ({ kind: "route"; path: string } | { kind: "in-place"; param: string } | { kind: "ticket" });

export const NEW_ACTIONS: readonly NewAction[] = [
  { id: "rx-order", label: "Rx order form", group: "Orders", icon: Eye, access: { app: "orders" }, kind: "route", path: "/admin/orders/rx/new" },
  { id: "rx-capture", label: "Rx capture", group: "Orders", icon: Camera, access: { app: "orders" }, kind: "route", path: "/admin/orders/rx-capture" },
  { id: "stock-order", label: "Stock order", group: "Orders", icon: Package, access: { app: "orders" }, kind: "route", path: "/admin/orders/stock-orders" },
  { id: "activity", label: "Activity", group: "CRM", icon: CalendarPlus, access: { app: "contacts" }, kind: "in-place", param: "createActivity" },
  { id: "company", label: "Company", group: "CRM", icon: Building2, access: { app: "contacts" }, kind: "route", path: "/admin/crm/contacts?new=company" },
  { id: "person", label: "Person", group: "CRM", icon: User, access: { app: "contacts" }, kind: "route", path: "/admin/crm/contacts?new=person" },
  { id: "ticket", label: "Ticket", group: "Helpdesk", icon: Ticket, access: { edit: "helpdesk" }, kind: "ticket" },
  { id: "import-costing", label: "Import costing", group: "Finance", icon: Ship, access: { app: "costings" }, kind: "route", path: "/admin/finance/costings/new" },
  { id: "walk-in-payment", label: "Walk-in payment", group: "Finance", icon: Landmark, access: { edit: "integrations" }, kind: "route", path: "/admin/finance/walk-in-payments" },
  { id: "pricelist", label: "Pricelist", group: "Pricing", icon: Tags, access: { app: "pricing" }, kind: "route", path: "/admin/pricing/pricelists?new=1" },
  { id: "website-product", label: "Website product", group: "Website", icon: Store, access: { app: "website" }, kind: "route", path: "/admin/website/store?new=product" },
  { id: "mail", label: "Email (Mail)", group: "Email", icon: Mail, access: { app: "contacts" }, kind: "route", path: "/admin/email?new=1" },
  { id: "docstudio-email", label: "Email (Doc Studio)", group: "Email", icon: FileEdit, access: { app: "website" }, kind: "route", path: "/admin/docs/studio?tab=email" },
];
