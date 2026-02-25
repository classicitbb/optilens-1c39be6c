import { useState, useEffect } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useRolePermissions, type Feature } from "@/hooks/useRolePermissions";
import {
  PanelLeftClose, PanelLeft, ArrowLeft, Layers, BookOpen,
  ChevronDown, ChevronRight,
  FlaskConical, Glasses, ShoppingCart, BookMarked } from
"lucide-react";
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
  path?: string;
  feature: Feature;
  children: MenuItem[];
}

type NavItem = MenuItem | MenuGroup;

const isGroup = (item: NavItem): item is MenuGroup => "children" in item;

const NAV: NavItem[] = [
{
  label: "Product Catalog",
  icon: Layers,
  path: "/admin/catalog",
  feature: "catalog",
  children: []
} as MenuGroup,
{ label: "RX Lens Prices", icon: FlaskConical, path: "/admin/rx-lens-prices", feature: "rx-lens-prices" } as MenuItem,
{ label: "Stock Lens Prices", icon: Glasses, path: "/admin/stock-lens-prices", feature: "stock-lens-prices" } as MenuItem,
{ label: "Supplies Prices", icon: ShoppingCart, path: "/admin/supplies-prices", feature: "supplies-prices" } as MenuItem,
{ label: "Catalog Publisher", icon: BookMarked, path: "/admin/catalog-publisher", feature: "catalog-publisher" } as MenuItem,
];


const AdminSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const isEditorRoute = /^\/admin\/catalog-publisher\/\d+/.test(currentPath) || /^\/admin\/quotations\/[^/]+$/.test(currentPath);
  const [collapsed, setCollapsed] = useState(isEditorRoute);
  const { canView } = useRolePermissions();

  // Force collapse when entering editor routes
  useEffect(() => {
    if (isEditorRoute) setCollapsed(true);
  }, [isEditorRoute]);

  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    NAV.forEach((item) => {
      if (isGroup(item)) {
        const parentMatch = item.path && currentPath.startsWith(item.path);
        const childMatch = item.children.some((c) => currentPath.startsWith(c.path));
        if (parentMatch || childMatch) s.add(item.label);
      }
    });
    return s;
  });

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + "/");

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);else next.add(label);
      return next;
    });
  };

  const w = collapsed ? "w-14" : "w-60";
  const linkBase = "flex items-center gap-2 px-3 py-1.5 text-[13px] rounded transition-colors";

  const renderMenuItem = (item: MenuItem, indent = false) => {
    if (!canView(item.feature)) return null;
    const active = isActive(item.path);
    return (
      <RouterNavLink
        key={item.path}
        to={item.path}
        className={`${linkBase} ${active ? "font-medium" : ""} ${indent ? "ml-4" : ""}`}
        title={collapsed ? item.label : undefined}
        style={{
          color: active ? "hsl(215 65% 65%)" : indent ? "hsl(210 15% 65%)" : "hsl(210 20% 85%)",
          background: active ? "hsl(215 65% 50% / 0.12)" : "transparent"
        }}>

        <item.icon className={`${indent ? "h-3.5 w-3.5" : "h-4 w-4"} shrink-0`} />
        {!collapsed && <span>{item.label}</span>}
      </RouterNavLink>);

  };

  const renderGroup = (group: MenuGroup) => {
    if (!canView(group.feature)) return null;
    const isOpen = openGroups.has(group.label);
    const parentActive = group.path ? isActive(group.path) : false;
    const childActive = group.children.some((c) => isActive(c.path));
    const groupActive = parentActive || childActive;

    return (
      <div key={group.label}>
        <div className="flex items-center">
          {group.path ?
          <RouterNavLink
            to={group.path}
            className={`${linkBase} flex-1 ${groupActive ? "font-medium" : ""}`}
            title={collapsed ? group.label : undefined}
            style={{ color: groupActive ? "hsl(215 65% 65%)" : "hsl(210 20% 85%)", background: groupActive ? "hsl(215 65% 50% / 0.12)" : "transparent" }}>

              <group.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{group.label}</span>}
            </RouterNavLink> :

          <button
            onClick={() => !collapsed && toggleGroup(group.label)}
            className={`${linkBase} w-full ${groupActive ? "font-medium" : ""}`}
            title={collapsed ? group.label : undefined}
            style={{ color: groupActive ? "hsl(215 65% 65%)" : "hsl(210 20% 85%)", background: groupActive ? "hsl(215 65% 50% / 0.12)" : "transparent" }}>

              <group.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left">{group.label}</span>}
            </button>
          }
        </div>
        {!collapsed && isOpen &&
        <div className="space-y-0.5">
            {group.children.map((child) => renderMenuItem(child, true))}
          </div>
        }
      </div>);

  };

  return (
    <aside className={`admin-sidebar ${w} shrink-0 flex flex-col transition-all duration-200 border-r`} style={{ borderColor: "hsl(215 25% 18%)" }}>
      <div className="h-11 flex items-center justify-between px-3 border-b rounded-none" style={{ borderColor: "hsl(215 25% 18%)" }}>
        {!collapsed && <span className="text-sm font-semibold tracking-tight" style={{ color: "hsl(0 0% 100%)" }}>OpticAdmin</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-white/10">
          {collapsed ? <PanelLeft className="h-4 w-4" style={{ color: "hsl(210 20% 85%)" }} /> : <PanelLeftClose className="h-4 w-4" style={{ color: "hsl(210 20% 85%)" }} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 rounded-none">
        {NAV.map((item) => isGroup(item) ? renderGroup(item) : renderMenuItem(item))}
      </nav>

      <div className="border-t px-3 py-2 space-y-0.5 rounded-none" style={{ borderColor: "hsl(215 25% 18%)" }}>
        {canView("wiki") &&
        <RouterNavLink to="/admin/wiki" className={`${linkBase} w-full ${isActive("/admin/wiki") ? "font-medium" : ""}`} title={collapsed ? "Help / Wiki" : undefined} style={{ color: isActive("/admin/wiki") ? "hsl(215 65% 65%)" : "hsl(210 15% 65%)", background: isActive("/admin/wiki") ? "hsl(215 65% 50% / 0.12)" : "transparent" }}>
            <BookOpen className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Help / Wiki</span>}
          </RouterNavLink>
        }
        <Link to="/" className={`${linkBase} w-full`} style={{ color: "hsl(210 15% 65%)" }} title={collapsed ? "Back to Site" : undefined}>
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Back to Site</span>}
        </Link>
      </div>
    </aside>);

};

export default AdminSidebar;