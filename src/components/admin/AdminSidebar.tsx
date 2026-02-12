import { useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import {
  Glasses, Database, DollarSign, Upload, History, Download,
  Settings, Users, FileText, PanelLeftClose, PanelLeft, ArrowLeft,
} from "lucide-react";
import { Link } from "react-router-dom";

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  adminOnly?: boolean;
}

const MENU: MenuItem[] = [
  { label: "Lenses", icon: Glasses, path: "/admin/lenses" },
  { label: "Reference Data", icon: Database, path: "/admin/reference" },
  { label: "Lens Prices", icon: DollarSign, path: "/admin/pricing" },
  { label: "Imports", icon: Upload, path: "/admin/imports" },
  { label: "Runs / History", icon: History, path: "/admin/history" },
  { label: "Exports", icon: Download, path: "/admin/exports" },
  { label: "Parameters", icon: Settings, path: "/admin/parameters" },
  { label: "Users", icon: Users, path: "/admin/users", adminOnly: true },
  { label: "Audit Log", icon: FileText, path: "/admin/audit", adminOnly: true },
];

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { isAdmin } = useAdminRole();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  const w = collapsed ? "w-14" : "w-60";
  const linkBase = "flex items-center gap-2 px-3 py-1.5 text-[13px] rounded transition-colors";

  return (
    <aside className={`admin-sidebar ${w} shrink-0 flex flex-col transition-all duration-200 border-r`} style={{ borderColor: "hsl(215 25% 18%)" }}>
      <div className="h-11 flex items-center justify-between px-3 border-b" style={{ borderColor: "hsl(215 25% 18%)" }}>
        {!collapsed && <span className="text-sm font-semibold tracking-tight" style={{ color: "hsl(0 0% 100%)" }}>OptiPricing</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-white/10">
          {collapsed ? <PanelLeft className="h-4 w-4" style={{ color: "hsl(210 20% 85%)" }} /> : <PanelLeftClose className="h-4 w-4" style={{ color: "hsl(210 20% 85%)" }} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {MENU.map((item) => {
          if (item.adminOnly && !isAdmin) return null;

          const active = isActive(item.path);
          return (
            <RouterNavLink
              key={item.path}
              to={item.path!}
              className={`${linkBase} ${active ? "font-medium" : ""}`}
              title={collapsed ? item.label : undefined}
              style={{
                color: active ? "hsl(215 65% 65%)" : "hsl(210 20% 85%)",
                background: active ? "hsl(215 65% 50% / 0.12)" : "transparent",
              }}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </RouterNavLink>
          );
        })}
      </nav>

      <div className="border-t px-3 py-2" style={{ borderColor: "hsl(215 25% 18%)" }}>
        <Link
          to="/"
          className={`${linkBase} w-full`}
          style={{ color: "hsl(210 15% 65%)" }}
          title={collapsed ? "Back to Site" : undefined}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Back to Site</span>}
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;
