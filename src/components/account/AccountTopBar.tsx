import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, BookOpen, CircleHelp, House, KeyRound, LifeBuoy, LogOut, Menu, Monitor, Moon, Search, Shield, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SidebarNavList from "@/components/shared/SidebarNavList";
import { ACCOUNT_NAV_ITEMS } from "@/components/account/accountNav";
import { useLocation } from "react-router";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { useSupportAvailability } from "@/hooks/useSupportAvailability";
import { useUserRole } from "@/hooks/useUserRole";
import { capitalizeDisplayName } from "@/lib/profileData";
import { getLastNonProfilePath } from "@/lib/lastExternalPath";
import { CartSheet } from "@/components/CartSheet";
import { useCompanionAssistant } from "@/features/assistant/CompanionAssistantContext";
import AccountSwitcher from "@/features/portal-account-access/AccountSwitcher";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AnnotateToggleItem from "@/features/annotate/AnnotateToggleItem";
import { ANNOTATE_UI_ATTR } from "@/features/annotate/annotator";
import { useAnnotator } from "@/features/annotate/useAnnotator";

interface AccountTopBarProps {
  displayName: string;
  onSignOut: () => void;
  /** Opens the help panel for the page being viewed. */
  onPageHelp?: () => void;
}

// Marks the profile menu as annotator UI so it stays usable (and unannotatable) while annotating.
const ANNOTATE_UI = { [ANNOTATE_UI_ATTR]: "" };

const AccountTopBar = ({ displayName, onSignOut, onPageHelp }: AccountTopBarProps) => {
  const location = useLocation();
  const { canAccessFeature } = usePortalIdentity();
  const { hasAvailableSupport } = useSupportAvailability();
  const { isOpen: isAssistantOpen, openAssistant, closeAssistant } = useCompanionAssistant();
  const { hasAccess, isAdmin } = useUserRole();
  const { annotator, isActive: isAnnotating } = useAnnotator(hasAccess);
  const { theme, setTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  // Read on every render so the link always points at the most recent
  // non-profile page the user visited in this session.
  const backToWebsitePath = getLastNonProfilePath();
  const activeTheme = theme ?? "system";
  const formattedDisplayName = capitalizeDisplayName(displayName, "Customer");

  // Close the mobile sheet whenever the user navigates to a new page
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const openSupportAssistant = useCallback(() => {
    if (isAssistantOpen) {
      closeAssistant();
      return;
    }
    openAssistant({
      profile: "portal_support",
    });
  }, [closeAssistant, isAssistantOpen, openAssistant]);

  const lensAssistantEnabled = canAccessFeature("rx-order");
  const visibleItems = ACCOUNT_NAV_ITEMS.filter((item) => {
    if (item.to === "/profile/rx-order") return lensAssistantEnabled;
    if (item.to === "/profile/quotes") return canAccessFeature("quotes");
    if (item.to === "/profile/helpdesk") return canAccessFeature("helpdesk");
    if (item.to === "/profile/pricelists") return canAccessFeature("pricelists");
    if (item.to === "/profile/statements") return canAccessFeature("statements");
    return true;
  });

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="grid h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 md:px-4">
          {/* Left: return to the previous website page, then go home. */}
          <TooltipProvider delayDuration={250}>
          <div className="flex min-w-0 items-center">
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" asChild className="h-7 w-7 shrink-0">
              <Link to={backToWebsitePath} aria-label="Back to website"><ArrowLeft className="h-3.5 w-3.5 shrink-0" /></Link>
            </Button></TooltipTrigger><TooltipContent side="bottom">Return to the website page you were viewing</TooltipContent></Tooltip>
            <Separator orientation="vertical" className="mx-1 h-4" />
            <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" asChild className="h-7 w-7 shrink-0">
              <Link to="/" aria-label="Classic Visions homepage"><House className="h-3.5 w-3.5" /></Link>
            </Button></TooltipTrigger><TooltipContent side="bottom">Go to the Classic Visions homepage</TooltipContent></Tooltip>
          </div>
          </TooltipProvider>

          {/* Center: title and active account */}
          <div className="flex items-center gap-2">
            <Link to="/profile" className="shrink-0 px-2 text-sm font-semibold tracking-tight text-foreground transition-colors hover:text-primary">My Account</Link>
            <div className="hidden sm:block"><AccountSwitcher /></div>
          </div>

          {/* Right: mobile hamburger (< lg) | desktop avatar + help (>= lg) */}
          <div className="flex items-center justify-end gap-1">
            {/* Mobile only: help dot + hamburger */}
            <div className="flex items-center gap-1 lg:hidden">
              {onPageHelp && (
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Help for this page" onClick={onPageHelp}>
                  <BookOpen className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-7 w-7 shrink-0"
                aria-label={hasAvailableSupport ? "Support Online" : "Help"}
                onClick={openSupportAssistant}
              >
                {hasAvailableSupport ? <LifeBuoy className="h-3.5 w-3.5" /> : <CircleHelp className="h-3.5 w-3.5" />}
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
              <CartSheet triggerVariant="ghost" triggerSize="icon" className="h-7 min-w-7 w-auto" />
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
              {onPageHelp && (
                <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1.5 px-2 text-xs" aria-label="Help for this page" onClick={onPageHelp}>
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>Page guide</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="relative h-7 shrink-0 gap-1.5 px-2 text-xs"
                aria-label={hasAvailableSupport ? "Support Online" : "Help"}
                onClick={openSupportAssistant}
              >
                {hasAvailableSupport ? <LifeBuoy className="h-3.5 w-3.5" /> : <CircleHelp className="h-3.5 w-3.5" />}
                <span>{hasAvailableSupport ? "Support Online" : "Help"}</span>
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${
                    hasAvailableSupport ? "bg-emerald-500" : "bg-muted-foreground/50"
                  }`}
                />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-9 shrink-0 gap-2 rounded-md px-2 text-sm font-medium text-foreground hover:bg-muted"
                    aria-label={`Open account menu for ${formattedDisplayName}`}
                    {...ANNOTATE_UI}
                  >
                    <span className="max-w-[220px] truncate">{formattedDisplayName}</span>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] uppercase">
                        {formattedDisplayName.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1.5" {...ANNOTATE_UI}>
                  <DropdownMenuItem asChild className="gap-2 rounded-md px-2.5 py-2 text-sm">
                    <Link to="/profile/account">
                      <KeyRound className="h-4 w-4" />
                      Change password
                    </Link>
                  </DropdownMenuItem>
                  {hasAccess ? (
                    <div className="flex items-center gap-1">
                      <DropdownMenuItem asChild className="flex-1 gap-2 rounded-md px-2.5 py-2 text-sm">
                        <Link to="/admin">
                          <Shield className="h-4 w-4" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                      <AnnotateToggleItem annotator={annotator} isActive={isAnnotating} />
                    </div>
                  ) : null}
                  <DropdownMenuItem onSelect={onSignOut} className="gap-2 rounded-md px-2.5 py-2 text-sm">
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                  {formattedDisplayName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 truncate text-sm font-semibold">{formattedDisplayName}</span>
              {isAdmin && <Button asChild size="sm" variant="outline" className="mr-6 h-8 shrink-0 gap-1 px-2 text-xs"><Link to="/admin/dashboard"><Shield className="h-3.5 w-3.5" />Admin</Link></Button>}
            </SheetTitle>
          </SheetHeader>

          {/* Search */}
          <div className="border-b px-4 py-3">
            <div className="mb-3 sm:hidden"><AccountSwitcher compact /></div>
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
              <button
                type="button"
                onClick={() => { setMenuOpen(false); openSupportAssistant(); }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <LifeBuoy className="h-4 w-4 shrink-0" />
                <span>Support Online</span>
                <span className="ml-auto h-2 w-2 rounded-full bg-emerald-500" />
              </button>
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
