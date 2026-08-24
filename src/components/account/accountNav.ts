import {
  BadgeDollarSign,
  Contact,
  DollarSign,
  FileSignature,
  FileText,
  LifeBuoy,
  Package,
  User,
  Glasses,
  BookOpen,
} from "lucide-react";
import type { SidebarNavItem } from "@/components/shared/SidebarNavList";

export const ACCOUNT_NAV_ITEMS: SidebarNavItem[] = [
  { label: "My Account", to: "/profile", icon: User, exact: true },
  { label: "My Profile", to: "/profile/account", icon: Contact },
  { label: "My Orders", to: "/profile/orders", icon: Package },
  { label: "Saved Drafts", to: "/profile/drafts", icon: FileText },
  { label: "Rx Order Form", to: "/profile/rx-order", icon: Glasses },
  { label: "Quote Requests", to: "/profile/quotes", icon: FileSignature },
  { label: "Helpdesk Tickets", to: "/profile/helpdesk", icon: LifeBuoy },
  { label: "Assigned Pricelist", to: "/profile/pricelists", icon: BadgeDollarSign },
  { label: "Statements", to: "/profile/statements", icon: DollarSign },
  { label: "Dispenser Handbook", to: "/profile/handbook", icon: BookOpen },
];
