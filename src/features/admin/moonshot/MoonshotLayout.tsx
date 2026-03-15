import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Menu,
  Rocket,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import AppLauncher from "@/components/admin/AppLauncher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useMoonshotStore } from "./lib/store";
import { ADMIN_APPS } from "@/features/admin/core/config/apps";

const moonshotApp = ADMIN_APPS.moonshot;

const navItems = moonshotApp.sidebarItems.filter((item) => item.route !== "/admin/moonshot/resources" && item.route !== "/admin/moonshot/settings");
const footerItems = moonshotApp.sidebarItems.filter((item) => item.route === "/admin/moonshot/resources" || item.route === "/admin/moonshot/settings");

const isActive = (pathname: string, route?: string) =>
  route ? pathname === route || pathname.startsWith(`${route}/`) : false;

export default function MoonshotLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const authUser = useAuth().user;
  const { currentUser, users, logout } = useMoonshotStore();

  useEffect(() => {
    if (!authUser) {
      if (currentUser) logout();
      return;
    }

    const normalizedEmail = authUser.email?.toLowerCase();
    if (!normalizedEmail) return;

    if (currentUser?.email?.toLowerCase() === normalizedEmail) return;

    const matched = users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (matched) {
      useMoonshotStore.setState({ currentUser: matched });
      return;
    }

    const fallback = users[0];
    if (!fallback) return;

    useMoonshotStore.setState({
      currentUser: {
        ...fallback,
        email: normalizedEmail,
        name: (authUser.user_metadata?.full_name as string | undefined) ?? fallback.name,
        avatar: fallback.avatar,
      },
    });
  }, [authUser, currentUser, users, logout]);

  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean).slice(2);
    return ["Moonshot", ...segments.map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))];
  }, [pathname]);

  const sidebarWidth = collapsed ? "w-[56px]" : "w-[280px]";
  const contentPadding = collapsed ? "md:pl-[56px]" : "md:pl-[280px]";

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(210 20% 97%)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  const NavButton = ({ item }: { item: (typeof moonshotApp.sidebarItems)[number] }) => {
    const Icon = item.icon;
    const active = isActive(pathname, item.route);

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { if (item.route) navigate(item.route); setOpen(false); }}
              className={`w-full flex items-center justify-center rounded-md p-2 transition ${active ? "bg-[#14b8a6]" : "hover:bg-[#14b8a6]"}`}
            >
              {Icon && <Icon className="h-4 w-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        onClick={() => { if (item.route) navigate(item.route); setOpen(false); }}
        className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition ${active ? "bg-[#14b8a6]" : "hover:bg-[#14b8a6]"}`}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-muted text-foreground">
        {open && (
          <button className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} aria-label="Close sidebar" />
        )}
        <aside className={`fixed inset-y-0 left-0 z-40 ${sidebarWidth} bg-[#0f766e] text-white flex flex-col transition-all duration-200 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
          {/* Header */}
          <div className={`h-16 px-3 border-b border-white/20 flex items-center ${collapsed ? "justify-center" : "gap-2"} font-bold text-lg`}>
            <button
              onClick={() => setLauncherOpen(true)}
              data-apps-toggle
              className="p-1 rounded-md hover:bg-white/20 transition-colors shrink-0"
              title="Open App Launcher"
            >
              <Rocket className="h-5 w-5" />
            </button>
            {!collapsed && <span>Moonshot</span>}
          </div>
          <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />

          {/* Nav */}
          <nav className={`flex-1 overflow-y-auto ${collapsed ? "px-1.5" : "px-3"} py-3 space-y-1`}>
            {navItems.map((item) => (
              <div key={item.label}>
                <NavButton item={item} />

              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className={`border-t border-white/20 ${collapsed ? "p-1.5" : "p-3"} space-y-1`}>
            {footerItems.map((item) => (
              <NavButton key={item.label} item={item} />
            ))}
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 items-center justify-center rounded-full bg-[#0f766e] border-2 border-white/30 text-white hover:bg-[#14b8a6] transition-colors shadow-md z-40"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
        </aside>

        <div className={`${contentPadding} transition-all duration-200`}>
          <header className="h-16 sticky top-0 z-20 border-b bg-card/95 backdrop-blur px-4 md:px-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:flex items-center gap-1 text-sm min-w-0">
              {crumbs.map((crumb, i) => (
                <div key={crumb + i} className="flex items-center gap-1 truncate">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                  <span className={i === crumbs.length - 1 ? "font-medium truncate" : "text-muted-foreground truncate"}>{crumb}</span>
                </div>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Input placeholder="Search" className="w-[140px] md:w-[220px] bg-muted" />
              <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full">
                    <Avatar className="h-8 w-8"><AvatarFallback>{currentUser.avatar}</AvatarFallback></Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/admin/moonshot/users")}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/admin/moonshot/settings")}>Settings</DropdownMenuItem>
                  <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="p-4 md:p-6"><Outlet /></main>
        </div>
      </div>
    </TooltipProvider>
  );
}
