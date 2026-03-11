import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertCircle, BarChart3, Bell, Book, Calendar, CheckSquare,
  ChevronRight, FileText, Grid, Home, Menu, Rocket, Settings, Target, Wrench,
} from "lucide-react";
import AppLauncher from "@/components/admin/AppLauncher";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useMoonshotStore } from "./lib/store";

type NavItem = {
  label: string;
  route?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children?: { label: string; route: string }[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", route: "/admin/moonshot/dashboard", icon: Home },
  { label: "My Workspace", route: "/admin/moonshot/workspace", icon: Grid },
  {
    label: "Meetings", route: "/admin/moonshot/meetings", icon: Calendar,
    children: [
      { label: "All Meetings", route: "/admin/moonshot/meetings" },
      { label: "New Meeting", route: "/admin/moonshot/meetings/new" },
    ],
  },
  { label: "Scorecards", route: "/admin/moonshot/scorecards", icon: BarChart3 },
  { label: "Quarterly Rocks", route: "/admin/moonshot/rocks", icon: Target },
  { label: "To-Dos", route: "/admin/moonshot/todos", icon: CheckSquare },
  { label: "Issues", route: "/admin/moonshot/issues", icon: AlertCircle },
  { label: "Business Plan", route: "/admin/moonshot/business-plan", icon: FileText },
  {
    label: "Tools", route: "/admin/moonshot/tools", icon: Wrench,
    children: [
      { label: "Org Chart", route: "/admin/moonshot/tools/org-chart" },
      { label: "1:1s", route: "/admin/moonshot/tools/one-on-ones" },
      { label: "Right Person Right Seat", route: "/admin/moonshot/tools/right-person-right-seat" },
    ],
  },
];

const footerItems = [
  { label: "Resources", route: "/admin/moonshot/resources", icon: Book },
  { label: "Settings", route: "/admin/moonshot/settings", icon: Settings },
  { label: "Give Feedback", route: "/admin/moonshot/feedback" },
];

const isActive = (pathname: string, route?: string) =>
  route ? pathname === route || pathname.startsWith(`${route}/`) : false;

export default function MoonshotLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
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

    const matched = users.find((u) => u.email.toLowerCase() === normalizedEmail);
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

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(210 20% 97%)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted text-foreground">
      {open && (
        <button className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setOpen(false)} aria-label="Close sidebar" />
      )}
      <aside className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-[#0f766e] text-white flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="h-16 px-4 border-b border-white/20 flex items-center gap-2 font-bold text-lg">
          <button
            onClick={() => setLauncherOpen(true)}
            data-apps-toggle
            className="p-1 rounded-md hover:bg-white/20 transition-colors"
            title="Open App Launcher"
          >
            <Rocket className="h-5 w-5" />
          </button>
          <span>Moonshot</span>
        </div>
        <AppLauncher open={launcherOpen} onClose={() => setLauncherOpen(false)} />
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label}>
                <button
                  onClick={() => { if (item.route) navigate(item.route); setOpen(false); }}
                  className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition ${isActive(pathname, item.route) ? "bg-[#14b8a6]" : "hover:bg-[#14b8a6]"}`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </button>
                {item.children && (
                  <div className="pl-8 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <button
                        key={child.route}
                        onClick={() => { navigate(child.route); setOpen(false); }}
                        className={`w-full text-left text-xs rounded-md px-2 py-1.5 transition ${isActive(pathname, child.route) ? "bg-[#14b8a6]" : "text-white/90 hover:bg-[#14b8a6]"}`}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/20 p-3 space-y-1">
          {footerItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => { navigate(item.route); setOpen(false); }}
                className={`w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition ${isActive(pathname, item.route) ? "bg-[#14b8a6]" : "hover:bg-[#14b8a6]"}`}
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="md:pl-[280px]">
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
  );
}
