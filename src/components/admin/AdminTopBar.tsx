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
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import GlobalSearch from "./GlobalSearch";
import HelpPanel from "./HelpPanel";
import AppLauncher from "./AppLauncher";
import { useAdminNotifications } from "@/features/admin/notifications/useAdminNotifications";

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
  ["/admin/audit-log", "Settings · Audit Log"],
];



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
  const { notifications, unreadCount, markRead, markAllRead, clearNotification, clearAll } = useAdminNotifications();

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
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 relative">
                      <Bell className="h-3.5 w-3.5" style={{ color: "hsl(215 15% 50%)" }} />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-[9px] text-white leading-[14px] text-center font-semibold">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom"><span className="text-xs">Notifications</span></TooltipContent>
              </Tooltip>

              <DropdownMenuContent align="end" className="w-[340px] p-0">
                <div className="p-2 border-b">
                  <DropdownMenuLabel className="px-1 py-1.5 text-xs flex items-center justify-between">
                    <span>Notifications</span>
                    <span className="text-[10px] text-muted-foreground">{unreadCount} unread</span>
                  </DropdownMenuLabel>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="outline" className="h-6 text-[10px] px-2" onClick={markAllRead}>Mark all read</Button>
                    <Button type="button" variant="outline" className="h-6 text-[10px] px-2" onClick={clearAll}>Clear all</Button>
                  </div>
                </div>

                <div className="max-h-[340px] overflow-auto p-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-2 py-4">No active notifications.</p>
                  ) : (
                    notifications.map((notification) => (
                      <div key={notification.id} className="p-2 rounded-md hover:bg-accent/60 space-y-1 border-b last:border-b-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{notification.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-tight">{notification.message}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(notification.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {notification.href && (
                            <DropdownMenuItem asChild className="h-6 px-2 text-[10px] cursor-pointer">
                              <Link to={notification.href} onClick={() => markRead(notification.id)}>Open</Link>
                            </DropdownMenuItem>
                          )}
                          <Button type="button" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => markRead(notification.id)}>Mark read</Button>
                          <Button type="button" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => clearNotification(notification.id)}>Clear</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

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
