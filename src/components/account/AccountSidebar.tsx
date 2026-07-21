import SidebarNavList from "@/components/shared/SidebarNavList";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useUserRole } from "@/hooks/useUserRole";
import { useWebsiteFeature } from "@/hooks/useWebsiteFeatures";
import { ACCOUNT_NAV_ITEMS } from "@/components/account/accountNav";

interface AccountSidebarProps {
  pathname: string;
}

const AccountSidebar = ({ pathname }: AccountSidebarProps) => {
  const { canAccessFeature } = usePortalIdentity();
  const { isAdmin } = useUserRole();
  const publicLensAssistant = useWebsiteFeature("lens_assistant_public", false);
  const adminLensAssistant = useWebsiteFeature("lens_assistant_admin", true);
  const lensAssistantEnabled = isAdmin ? adminLensAssistant.enabled : publicLensAssistant.enabled;

  const items = ACCOUNT_NAV_ITEMS.filter((item) => {
    if (item.to.startsWith("/lens-assistant")) return lensAssistantEnabled;
    if (item.to === "/profile/quotes") return canAccessFeature("quotes");
    if (item.to === "/profile/helpdesk") return canAccessFeature("helpdesk");
    if (item.to === "/profile/pricelists") return canAccessFeature("pricelists");
    if (item.to === "/profile/statements") return canAccessFeature("statements");
    return true;
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
