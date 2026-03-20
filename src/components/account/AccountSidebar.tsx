import {
  BadgeDollarSign,
  BookUser,
  FileSignature,
  LifeBuoy,
  LockKeyhole,
  Package,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SidebarNavList, { type SidebarNavItem } from "@/components/shared/SidebarNavList";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";

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

const approvalBadge = (
  <Badge variant="secondary" className="ml-auto gap-1 text-[10px]">
    <LockKeyhole className="h-3 w-3" />
    Approval
  </Badge>
);

const AccountSidebar = ({ pathname }: AccountSidebarProps) => {
  const { canAccessFeature } = usePortalIdentity();

  const items = accountNavItems.map((item) => {
    if (item.to === "/profile/quotes") {
      return { ...item, disabled: !canAccessFeature("quotes"), badge: !canAccessFeature("quotes") ? approvalBadge : undefined };
    }

    if (item.to === "/profile/helpdesk") {
      return { ...item, disabled: !canAccessFeature("helpdesk"), badge: !canAccessFeature("helpdesk") ? approvalBadge : undefined };
    }

    if (item.to === "/profile/pricelists") {
      return { ...item, disabled: !canAccessFeature("pricelists"), badge: !canAccessFeature("pricelists") ? approvalBadge : undefined };
    }

    return item;
  });

  return (
    <SidebarNavList
      items={items}
      pathname={pathname}
      className="space-y-1"
      activeItemClassName="bg-primary/10 font-medium text-primary"
      inactiveItemClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
    />
  );
};

export default AccountSidebar;
