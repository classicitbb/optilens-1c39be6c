import { useState } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useRolePermissions, type Feature } from "@/hooks/useRolePermissions";
import {
  Database, DollarSign, Upload, History, Download,
  Settings, Users, FileText, PanelLeftClose, PanelLeft, ArrowLeft, Layers, BookOpen,
  ChevronDown, ChevronRight, Ship, Glasses, Package, BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path: string;
  feature: Feature;
}

interface MenuGroup {
  label: string;
  icon: React.ElementType;
  feature: Feature;
  children: MenuItem[];
}

const MENU: MenuItem[] = [
  { label: "Product Catalog", icon: Layers, path: "/admin/catalog", feature: "catalog" },
  { label: "Reference Data", icon: Database, path: "/admin/reference", feature: "reference" },
  { label: "Lens Prices", icon: DollarSign, path: "/admin/pricing", feature: "pricing" },
  { label: "Imports", icon: Upload, path: "/admin/imports", feature: "imports" },
  { label: "Runs / History", icon: History, path: "/admin/history", feature: "history" },
  { label: "Exports", icon: Download, path: "/admin/exports", feature: "exports" },
  { label: "Parameters", icon: Settings, path: "/admin/parameters", feature: "parameters" },
  { label: "Users", icon: Users, path: "/admin/users", feature: "users" },
  { label: "Audit Log", icon: FileText, path: "/admin/audit", feature: "audit" },
];

const GROUPS: MenuGroup[] = [
  {
    label: "Import Costings",
    icon: Ship,
    feature: "costings",
    children: [
      { label: "Shipments", icon: Ship, path: "/admin/costings/shipments", feature: "costings" },
      { label: "Lens Shipments", icon: Glasses, path: "/admin/costings/lens-shipments", feature: "costings" },
      { label: "Non-Lens Shipments", icon: Package, path: "/admin/costings/non-lens-shipments", feature: "costings" },
      { label: "Reports", icon: BarChart3, path: "/admin/costings/reports", feature: "costings" },
    ],
  },
];

const AdminSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { canView } = useRolePermissions();
  const location = useLocation();
  const currentPath = location.pathname;
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (currentPath.startsWith("/admin/costings")) s.add("Import Costings");
    return s;
  });

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  };

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
          if (!canView(item.feature)) return null;
          const active = isActive(item.path);
          return (
            <RouterNavLink
              key={item.path}
              to={item.path}
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

        {/* Collapsible groups */}
        {GROUPS.map((group) => {
          if (!canView(group.feature)) return null;
          const isOpen = openGroups.has(group.label);
          const groupActive = group.children.some((c) => isActive(c.path));

          return (
            <div key={group.label}>
              <button
                onClick={() => collapsed ? undefined : toggleGroup(group.label)}
                className={`${linkBase} w-full ${groupActive ? "font-medium" : ""}`}
                title={collapsed ? group.label : undefined}
                style={{
                  color: groupActive ? "hsl(215 65% 65%)" : "hsl(210 20% 85%)",
                  background: groupActive ? "hsl(215 65% 50% / 0.12)" : "transparent",
                }}
              >
                <group.icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{group.label}</span>
                    {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  </>
                )}
              </button>
              {!collapsed && isOpen && (
                <div className="ml-4 space-y-0.5">
                  {group.children.map((child) => {
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
                        <child.icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{child.label}</span>
                      </RouterNavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t px-3 py-2 space-y-0.5" style={{ borderColor: "hsl(215 25% 18%)" }}>
        {canView("wiki") && (
          <RouterNavLink
            to="/admin/wiki"
            className={`${linkBase} w-full ${isActive("/admin/wiki") ? "font-medium" : ""}`}
            title={collapsed ? "Help / Wiki" : undefined}
            style={{
              color: isActive("/admin/wiki") ? "hsl(215 65% 65%)" : "hsl(210 15% 65%)",
              background: isActive("/admin/wiki") ? "hsl(215 65% 50% / 0.12)" : "transparent",
            }}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Help / Wiki</span>}
          </RouterNavLink>
        )}
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
