import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutGrid, Bell, HelpCircle, ExternalLink, LogOut,
  BookOpen, User, Download, ChevronDown, Eye, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import GlobalSearch from "./GlobalSearch";
import HelpPanel from "./HelpPanel";
import AppLauncher from "./AppLauncher";

const ROUTE_LABELS: [string, string][] = [
  ["/admin/pricing/publisher-old", "Pricing · Catalog Publisher (Legacy)"],
  ["/admin/pricing/publisher", "Pricing · Catalog Builder"],
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
  ["/admin/catalog-publisher", "Pricing · Catalog Builder"],
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
  ["/admin/audit-log", "Settings · Audit Log"],
];

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
  const [launcherOpen, setLauncherOpen] = useState(() => {
    const shown = sessionStorage.getItem("admin-launcher-shown");
    if (!shown) {
      sessionStorage.setItem("admin-launcher-shown", "1");
      return true;
    }
    return false;
  });

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Fetch display name
  const { data: profile } = useQuery({
    queryKey: ["profile-name", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const displayName = profile?.display_name || user?.email || "";
  const initials = (profile?.display_name || user?.email || "?")
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0].toUpperCase())
    .join("");

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleInstall = async () => {
    if (installPrompt) {
      (installPrompt as any).prompt();
    } else {
      window.open(window.location.href, "_blank", "width=1200,height=800,menubar=no,toolbar=no");
    }
  };

  const pageLabel = getRouteLabel(location.pathname);

  return (
    <>
      <header
        className="flex items-center gap-2 px-3 h-11 border-b shrink-0 w-full z-30"
        style={{ background: "hsl(0 0% 100%)", borderColor: "hsl(215 15% 85%)" }}
      >
        {/* ── LEFT GROUP ── */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost" size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setLauncherOpen(!launcherOpen)}
            title="Applications"
            data-apps-toggle
          >
            <LayoutGrid className="h-[18px] w-[18px]" style={{ color: "hsl(215 15% 50%)" }} />
          </Button>

          <span className="text-sm font-semibold tracking-tight select-none" style={{ color: "hsl(215 30% 15%)" }}>
            OpticAdmin
          </span>

          <span className="text-[11px] hidden md:inline-block" style={{ color: "hsl(215 15% 55%)" }}>
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
            {role !== realRole && isImpersonating && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                style={{
                  borderColor: "hsl(45 93% 47%)",
                  background: "hsl(48 100% 96%)",
                  color: "hsl(32 95% 35%)",
                }}
                onClick={stopImpersonation}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Viewing as {impersonatedUserName || role}</span>
                <span className="sm:hidden">Revert</span>
                <X className="h-3 w-3 ml-1" />
              </Button>
            )}

            {/* Bell */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                  <Bell className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 65%)" }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><span className="text-xs">Notifications — coming soon</span></TooltipContent>
            </Tooltip>

            {/* Help */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHelpOpen(!helpOpen)}>
                  <HelpCircle className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom"><span className="text-xs">Help</span></TooltipContent>
            </Tooltip>

            {/* Lovable link — admin only */}
            {realRole === "admin" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://lovable.dev/projects/d568bffd-cdad-4066-b271-1e09c9a376d6"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="bottom"><span className="text-xs">Edit with Lovable</span></TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>

          {/* User name */}
          <span className="text-xs hidden sm:inline-block max-w-[120px] truncate" style={{ color: "hsl(215 30% 15%)" }}>
            {displayName}
          </span>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-full hover:ring-2 hover:ring-primary/20 transition-all focus:outline-none">
                <Avatar className="h-7 w-7 text-[11px]">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3" style={{ color: "hsl(215 15% 55%)" }} />
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
    </>
  );
};

export default AdminTopBar;
