import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, CircleHelp, LogOut, Menu, Monitor, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SidebarNavList from "@/components/shared/SidebarNavList";
import { ACCOUNT_NAV_ITEMS } from "@/components/account/accountNav";
import { useLocation } from "react-router";
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
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const activeTheme = theme ?? "system";

  // Close the mobile sheet whenever the user navigates to a new page
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const visibleItems = ACCOUNT_NAV_ITEMS.filter((item) => {
    if (item.to === "/profile/quotes") return canAccessFeature("quotes");
    if (item.to === "/profile/helpdesk") return canAccessFeature("helpdesk");
    if (item.to === "/profile/pricelists") return canAccessFeature("pricelists");
    return true;
  });

  return (
    <>
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="grid h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 md:px-4">
          {/* Left: back to website */}
          <div className="min-w-0">
            <Button variant="ghost" asChild className="h-7 max-w-full gap-1.5 px-2 text-xs sm:text-sm">
              <Link to="/">
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Website</span>
              </Link>
            </Button>
          </div>

          {/* Center: title */}
          <Link to="/profile" className="px-2 text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors">My Account</Link>

          {/* Right: mobile hamburger (< lg) | desktop avatar + help (>= lg) */}
          <div className="flex items-center justify-end gap-1">
            {/* Mobile only: help dot + hamburger */}
            <div className="flex items-center gap-1 lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="relative h-7 w-7 shrink-0"
                aria-label="Help"
              >
                <CircleHelp className="h-3.5 w-3.5" />
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${
                    hasAvailableSupport ? "bg-emerald-500" : "bg-muted-foreground/50"
                  }`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label="Open navigation menu"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </div>

            {/* Desktop only: display name + help + avatar */}
            <div className="hidden items-center gap-2 lg:flex">
              <div className="flex items-center rounded-full border bg-muted/30 p-0.5" aria-label="Appearance">
                {[
                  { value: "system", label: "Use system theme", icon: Monitor },
                  { value: "dark", label: "Use dark theme", icon: Moon },
                  { value: "light", label: "Use light theme", icon: Sun },
                ].map((item) => {
                  const Icon = item.icon;
                  const selected = activeTheme === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-label={item.label}
                      title={item.label}
                      aria-pressed={selected}
                      onClick={() => setTheme(item.value)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full transition-colors ${
                        selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-7 w-7 shrink-0"
                aria-label="Help"
              >
                <CircleHelp className="h-3.5 w-3.5" />
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${
                    hasAvailableSupport ? "bg-emerald-500" : "bg-muted-foreground/50"
                  }`}
                />
              </Button>
              <span className="max-w-28 truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 rounded-full" asChild>
                <Link to="/profile/account">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px] uppercase">
                      {displayName.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation Sheet */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="flex w-[300px] flex-col gap-0 p-0 sm:w-[360px]">
          <SheetHeader className="border-b px-4 py-3">
            <SheetTitle className="flex items-center gap-3 text-left">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs uppercase">
                  {displayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-semibold">{displayName}</span>
            </SheetTitle>
          </SheetHeader>

          {/* Search */}
          <div className="border-b px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search my account…"
                value={mobileSearch}
                onChange={(e) => setMobileSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            <SidebarNavList
              items={visibleItems}
              pathname={location.pathname}
              className="space-y-1"
              activeItemClassName="bg-primary/10 font-medium text-primary"
              inactiveItemClassName="text-muted-foreground hover:bg-muted hover:text-foreground"
            />
          </nav>

          <Separator />

          {/* Footer actions */}
          <div className="space-y-1 px-3 py-3">
            {hasAvailableSupport && (
              <div className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground">
                <CircleHelp className="h-4 w-4 shrink-0" />
                <span>Support is available</span>
                <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                onSignOut();
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AccountTopBar;
