import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutGrid, HelpCircle, ExternalLink, LogOut,
  BookOpen, User, Download, ChevronDown, Eye, X, Sun, Moon, Monitor } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import GlobalSearch from "./GlobalSearch";
import HelpPanel from "./HelpPanel";
import AppLauncher from "./AppLauncher";
import { useAdminNotifications } from "@/features/admin/notifications/useAdminNotifications";
import NotificationBell from "./NotificationBell";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const ROUTE_LABELS: [string, string][] = [
["/admin/pricing/publisher-old", "Pricing · Lens Catalog Builder"],
["/admin/pricing/publisher", "Pricing · Lens Catalog Builder"],
["/admin/pricing/catalog", "Pricing · Product Catalog"],
["/admin/pricing/rx-lenses", "Pricing · RX Lens Prices"],
["/admin/pricing/stock-lenses", "Pricing · Stock Lens Prices"],
["/admin/pricing/supplies", "Pricing · Supplies Prices"],
["/admin/pricing/imports", "Pricing · Imports"],
["/admin/pricing/reference", "Pricing · Reference Data"],
["/admin/pricing/costings", "Costings"],
["/admin/sales/proposals", "Sales · Proposals"],
["/admin/sales/quotations", "Sales · Quotations"],
["/admin/settings/users", "Settings · Users"],
["/admin/settings/company", "Settings · Company"],
["/admin/knowledge/wiki", "Knowledge · Wiki"],
["/admin/website/content", "Website · Content"],
["/admin/contacts", "Contacts"],
["/admin/crm", "CRM"],
["/admin/helpdesk", "Helpdesk"],
["/admin/settings/audit", "Settings · Audit Log"],
["/admin/settings/integrations", "Settings · Integrations"],
["/admin/settings/runtime-errors", "Settings · Runtime Errors"],
// legacy fallbacks
["/admin/catalog-publisher", "Pricing · Lens Catalog Builder"],
["/admin/catalog", "Pricing · Product Catalog"],
["/admin/rx-lens-prices", "Pricing · RX Lens Prices"],
["/admin/stock-lens-prices", "Pricing · Stock Lens Prices"],
["/admin/supplies-prices", "Pricing · Supplies Prices"],
["/admin/imports", "Pricing · Imports"],
["/admin/reference", "Pricing · Reference Data"],
["/admin/costings", "Costings"],
["/admin/quotations", "Sales · Quotations"],
["/admin/users", "Settings · Users"],
["/admin/parameters", "Settings · Company"],
["/admin/wiki", "Knowledge · Wiki"],
["/admin/content", "Website · Content"],
["/admin/erp/contacts", "Contacts"],
["/admin/erp/crm", "CRM"],
["/admin/erp/helpdesk", "Helpdesk"],
["/admin/audit-log", "Settings · Audit Log"]];




const timeAgo = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMin = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

function getRouteLabel(pathname: string): string {
  for (const [prefix, label] of ROUTE_LABELS) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return label;
  }
  return "Dashboard";
}

const AdminTopBar = () => {
  const { user, signOut } = useAuth();
  const { role, realRole, isImpersonating, impersonatedUserName, stopImpersonation } = useAdminRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(() => {
    const shown = sessionStorage.getItem("admin-launcher-shown");
    if (!shown) {
      sessionStorage.setItem("admin-launcher-shown", "1");
      return true;
    }
    return false;
  });

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      if (!("prompt" in e)) return;
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Fetch display name
  const { data: profile } = useQuery({
    queryKey: ["profile-name", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.
      from("profiles").
      select("display_name").
      eq("user_id", user.id).
      maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000
  });

  const displayName = profile?.display_name || user?.email || "";
  const initials = (profile?.display_name || user?.email || "?").
  split(/[\s@]/).
  filter(Boolean).
  slice(0, 2).
  map((s: string) => s[0].toUpperCase()).
  join("");

  const handleSignOut = async () => {await signOut();navigate("/");};

  const handleInstall = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
    } else {
      window.open(window.location.href, "_blank", "width=1200,height=800,menubar=no,toolbar=no");
    }
  };

  const pageLabel = getRouteLabel(location.pathname);
  const activeTheme = theme ?? "system";
  const cycleTheme = () => {
    if (activeTheme === "system") {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
      return;
    }
    setTheme(activeTheme === "dark" ? "light" : "dark");
  };

  return (
    <>
      <header
        className="admin-surface flex items-center gap-2 px-3 h-11 border-b shrink-0 w-full z-30 border-[hsl(var(--admin-border))] bg-[hsl(var(--admin-topbar-bg))]">

        {/* ── LEFT GROUP ── */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setLauncherOpen(!launcherOpen)}
            title="Applications"
            data-apps-toggle>

            <LayoutGrid className="h-[18px] w-[18px] text-[hsl(var(--admin-muted-fg))]" />
          </Button>

          <span className="text-sm font-semibold tracking-tight select-none text-[hsl(var(--admin-content-fg))]">
            OpticAdmin
          </span>

          <span className="text-[11px] hidden md:inline-block text-[hsl(var(--admin-muted-fg))]">
            {pageLabel}
          </span>
        </div>

        {/* ── CENTER: search ── */}
        <div className="flex-1 min-w-0 max-w-md mx-auto">
          <GlobalSearch />
        </div>

        {/* ── RIGHT GROUP ── */}
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider delayDuration={300}>
            {/* Revert impersonation */}
            {role !== realRole && isImpersonating &&
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1.5 border-[hsl(var(--admin-warning))]/60 bg-[hsl(var(--admin-warning))]/15 text-[hsl(var(--admin-warning))]"
              onClick={stopImpersonation}>

                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Viewing as {impersonatedUserName || role}</span>
                <span className="sm:hidden">Revert</span>
                <X className="h-3 w-3 ml-1" />
              </Button>
            }

            {/* Notifications Bell */}
            <NotificationBell />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHelpOpen(!helpOpen)}>
                  <HelpCircle className="h-3.5 w-3.5 text-[hsl(var(--admin-muted-fg))]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><span className="text-xs">Help</span></TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cycleTheme} aria-label="Toggle theme">
                  {mounted && (resolvedTheme === "dark" ? <Moon className="h-3.5 w-3.5 text-[hsl(var(--admin-muted-fg))]" /> : <Sun className="h-3.5 w-3.5 text-[hsl(var(--admin-muted-fg))]" />)}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><span className="text-xs">Toggle theme</span></TooltipContent>
            </Tooltip>

          </TooltipProvider>

          {/* User name */}
          <span className="text-xs hidden sm:inline-block max-w-[120px] truncate text-[hsl(var(--admin-content-fg))]">
            {displayName}
          </span>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all focus:outline-none">
                <Avatar className="h-7 w-7 text-[11px]">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-[hsl(var(--admin-muted-fg))]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/admin/wiki")}>
                <BookOpen className="mr-2 h-4 w-4" /> Helpdesk / Wiki
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <User className="mr-2 h-4 w-4" /> My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleInstall}>
                <Download className="mr-2 h-4 w-4" /> Install App
              </DropdownMenuItem>
              {realRole === "admin" &&
              <DropdownMenuItem asChild>
                  <a
                  href="https://lovable.dev/projects/d568bffd-cdad-4066-b271-1e09c9a376d6"
                  target="_blank"
                  rel="noopener noreferrer">

                    <ExternalLink className="mr-2 h-4 w-4" /> Edit with Lovable
                  </a>
                </DropdownMenuItem>
              }
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={activeTheme} onValueChange={(value) => setTheme(value)}>
                <DropdownMenuRadioItem value="light">
                  <Sun className="mr-2 h-4 w-4" /> Theme · Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <Moon className="mr-2 h-4 w-4" /> Theme · Dark
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <Monitor className="mr-2 h-4 w-4" /> Theme · System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
    </>);

};

export default AdminTopBar;