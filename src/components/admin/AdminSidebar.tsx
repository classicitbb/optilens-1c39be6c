import { useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import {
  Glasses, Database, DollarSign, Upload, History, Download,
  Settings, Users, FileText, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft,
} from "lucide-react";

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  adminOnly?: boolean;
  children?: { label: string; path: string }[];
}

const MENU: MenuItem[] = [
  { label: "Lenses", icon: Glasses, path: "/admin/lenses" },
  {
    label: "Reference Data",
    icon: Database,
    children: [
      { label: "Suppliers", path: "/admin/reference/suppliers" },
      { label: "Brands", path: "/admin/reference/brands" },
      { label: "Materials", path: "/admin/reference/materials" },
      { label: "MF Types", path: "/admin/reference/mftypes" },
      { label: "Lens Types", path: "/admin/reference/lenstypes" },
      { label: "Lens Options", path: "/admin/reference/lens-options" },
    ],
  },
  { label: "Pricing Profiles", icon: DollarSign, path: "/admin/pricing" },
  { label: "Imports", icon: Upload, path: "/admin/imports" },
  { label: "Runs / History", icon: History, path: "/admin/history" },
  { label: "Exports", icon: Download, path: "/admin/exports" },
  { label: "Parameters", icon: Settings, path: "/admin/parameters" },
  { label: "Users", icon: Users, path: "/admin/users", adminOnly: true },
  { label: "Audit Log", icon: FileText, path: "/admin/audit", adminOnly: true },
];

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "Reference Data": true });
  const { isAdmin } = useAdminRole();
  const location = useLocation();
  const currentPath = location.pathname;

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

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

          if (item.children) {
            const isOpen = openGroups[item.label];
            const hasActiveChild = item.children.some((c) => isActive(c.path));
            return (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && toggleGroup(item.label)}
                  className={`${linkBase} w-full justify-between`}
                  style={{ color: hasActiveChild ? "hsl(215 65% 65%)" : "hsl(210 20% 85%)" }}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </span>
                  {!collapsed && (isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-6 space-y-0.5">
                    {item.children.map((child) => {
                      const active = isActive(child.path);
                      return (
                        <RouterNavLink
                          key={child.path}
                          to={child.path}
                          className={`${linkBase} ${active ? "font-medium" : ""}`}
                          style={{
                            color: active ? "hsl(215 65% 65%)" : "hsl(210 15% 65%)",
                            background: active ? "hsl(215 65% 50% / 0.12)" : "transparent",
                          }}
                        >
                          <span>{child.label}</span>
                        </RouterNavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.path!);
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
    </aside>
  );
};

export default AdminSidebar;
