import {
  BadgeDollarSign,
  BookUser,
  FileSignature,
  LifeBuoy,
  Package,
  User,
} from "lucide-react";
import SidebarNavList, { type SidebarNavItem } from "@/components/shared/SidebarNavList";

const accountNavItems: SidebarNavItem[] = [
  { label: "My Account", to: "/profile/account", icon: User },
  { label: "My Orders", to: "/profile/orders", icon: Package },
  { label: "Address Book", to: "/profile/address-book", icon: BookUser },
  { label: "Quote Form", to: "/profile/quotes", icon: FileSignature },
  { label: "Helpdesk Tickets", to: "/profile/helpdesk", icon: LifeBuoy },
  { label: "Assigned Pricelists", to: "/profile/pricelists", icon: BadgeDollarSign },
];

interface AccountSidebarProps {
  pathname: string;
}

const AccountSidebar = ({ pathname }: AccountSidebarProps) => {
  return (
    <SidebarNavList
      items={accountNavItems}
      pathname={pathname}
      className="space-y-1"
      activeItemClassName="bg-primary/10 font-medium text-primary"
      inactiveItemClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
    />
  );
};

export default AccountSidebar;
