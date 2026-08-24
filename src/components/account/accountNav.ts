import {
  BadgeDollarSign,
<<<<<<< Updated upstream
  BookUser,
=======
  Contact,
>>>>>>> Stashed changes
  DollarSign,
  FileSignature,
  FileText,
  LifeBuoy,
  Package,
  User,
  WalletCards,
} from "lucide-react";
import type { SidebarNavItem } from "@/components/shared/SidebarNavList";

export const ACCOUNT_NAV_ITEMS: SidebarNavItem[] = [
<<<<<<< Updated upstream
  { label: "My Account", to: "/profile", icon: User },
  { label: "My Profile", to: "/profile/account", icon: User },
=======
  { label: "My Account", to: "/profile", icon: User, exact: true },
  { label: "My Profile", to: "/profile/account", icon: Contact },
>>>>>>> Stashed changes
  { label: "My Orders", to: "/profile/orders", icon: Package },
  { label: "Saved Drafts", to: "/profile/drafts", icon: FileText },
  { label: "Address Book", to: "/profile/address-book", icon: BookUser },
  { label: "Payment Methods", to: "/profile/payment-methods", icon: WalletCards },
  { label: "Quote Requests", to: "/profile/quotes", icon: FileSignature },
  { label: "Helpdesk Tickets", to: "/profile/helpdesk", icon: LifeBuoy },
  { label: "Assigned Pricelist", to: "/profile/pricelists", icon: BadgeDollarSign },
  { label: "Statements", to: "/profile/statements", icon: DollarSign },
];
