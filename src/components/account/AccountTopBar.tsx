import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, CircleHelp, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import TopBarActionCluster from "@/components/shared/TopBarActionCluster";
import SidebarNavList from "@/components/shared/SidebarNavList";
import { ACCOUNT_NAV_ITEMS } from "@/components/account/accountNav";
import { useLocation } from "react-router-dom";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useSupportAvailability } from "@/hooks/useSupportAvailability";

interface AccountTopBarProps {
  displayName: string;
  onSignOut: () => void;
}

const AccountTopBar = ({ displayName, onSignOut }: AccountTopBarProps) => {
  const location = useLocation();
  const { canAccessFeature } = usePortalIdentity();
  const { hasAvailableSupport } = useSupportAvailability();
  const visibleItems = ACCOUNT_NAV_ITEMS.filter((item) => {
    if (item.to === "/profile/quotes") return canAccessFeature("quotes");
    if (item.to === "/profile/helpdesk") return canAccessFeature("helpdesk");
    if (item.to === "/profile/pricelists") return canAccessFeature("pricelists");
    return true;
  });

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="grid h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 md:px-4">
        <div className="min-w-0">
          <Button variant="ghost" asChild className="h-7 max-w-full gap-1.5 px-2 text-xs sm:text-sm">
            <Link to="/">
              <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Website</span>
            </Link>
          </Button>
        </div>

        <h1 className="hidden px-2 text-sm font-semibold tracking-tight text-foreground md:block">My Account</h1>

        <TopBarActionCluster
          className="min-w-0 gap-1 justify-self-end md:gap-2"
          utilities={
            <>
              <Button variant="ghost" size="icon" className="relative h-7 w-7 shrink-0" aria-label="Help">
                <CircleHelp className="h-3.5 w-3.5" />
                <span className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${hasAvailableSupport ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
              </Button>
            </>
          }
          identity={<span className="hidden max-w-28 truncate text-sm font-medium text-foreground md:inline">{displayName}</span>}
          menu={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-8 shrink-0 gap-1 rounded-full px-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] uppercase">{displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile Home</Link>
                </DropdownMenuItem>
                <div className="px-2 py-2 md:hidden">
                  <SidebarNavList
                    items={visibleItems}
                    pathname={location.pathname}
                    className="space-y-1"
                    activeItemClassName="bg-primary/10 font-medium text-primary"
                    inactiveItemClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
                  />
                </div>
                <DropdownMenuItem onClick={onSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
        />
      </div>
    </header>
  );
};

export default AccountTopBar;
