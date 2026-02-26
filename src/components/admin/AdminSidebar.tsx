import { useState, useEffect, useMemo } from "react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { useRolePermissions } from "@/hooks/useRolePermissions";
import { ADMIN_APPS, type AppKey } from "@/features/admin/core/config/apps";
import { PanelLeftClose, PanelLeft, ArrowLeft, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const AdminSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { canView } = useRolePermissions();

  // Determine which app context we're in based on URL
  const activeAppKey = useMemo<AppKey | null>(() => {
    for (const [key, app] of Object.entries(ADMIN_APPS)) {
      if (currentPath.startsWith(app.baseRoute)) return key as AppKey;
    }
    return null;
  }, [currentPath]);

  const activeApp = activeAppKey ? ADMIN_APPS[activeAppKey] : null;

  // Auto-collapse on editor/builder routes
  const isEditorRoute =
    /\/publisher\/\d+/.test(currentPath) ||
    /\/quotations\/[^/]+$/.test(currentPath);
  const [collapsed, setCollapsed] = useState(isEditorRoute);

  useEffect(() => {
    if (isEditorRoute) setCollapsed(true);
  }, [isEditorRoute]);

  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + "/");

  const w = collapsed ? "w-14" : "w-60";
  const linkBase =
    "flex items-center gap-2 px-3 py-1.5 text-[13px] rounded transition-colors";

  return (
    <aside
      className={`admin-sidebar ${w} shrink-0 flex flex-col transition-all duration-200 border-r`}
      style={{ borderColor: "hsl(215 25% 18%)" }}
    >
      {/* Header */}
      <div
        className="h-11 flex items-center justify-between px-3 border-b rounded-none"
        style={{ borderColor: "hsl(215 25% 18%)" }}
      >
        {!collapsed && activeApp && (
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: "hsl(0 0% 100%)" }}
          >
            {activeApp.title}
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-white/10"
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" style={{ color: "hsl(210 20% 85%)" }} />
          ) : (
            <PanelLeftClose className="h-4 w-4" style={{ color: "hsl(210 20% 85%)" }} />
          )}
        </button>
      </div>

      {/* Sidebar items for active app */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 rounded-none">
        {activeApp?.sidebarItems.map((item) => {
          const active = isActive(item.route);
          return (
            <RouterNavLink
              key={item.route}
              to={item.route}
              className={`${linkBase} ${active ? "font-medium" : ""}`}
              title={collapsed ? item.label : undefined}
              style={{
                color: active
                  ? "hsl(215 65% 65%)"
                  : "hsl(210 20% 85%)",
                background: active
                  ? "hsl(215 65% 50% / 0.12)"
                  : "transparent",
              }}
            >
              {/* Use a small dot indicator instead of per-item icons */}
              {collapsed ? (
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{
                    background: active
                      ? "hsl(215 65% 65%)"
                      : "hsl(210 15% 40%)",
                  }}
                />
              ) : (
                <span>{item.label}</span>
              )}
            </RouterNavLink>
          );
        })}
      </nav>

      {/* Footer links */}
      <div
        className="border-t px-3 py-2 space-y-0.5 rounded-none"
        style={{ borderColor: "hsl(215 25% 18%)" }}
      >
        {canView("wiki") && (
          <RouterNavLink
            to="/admin/knowledge/wiki"
            className={`${linkBase} w-full ${isActive("/admin/knowledge/wiki") ? "font-medium" : ""}`}
            title={collapsed ? "Help / Wiki" : undefined}
            style={{
              color: isActive("/admin/knowledge/wiki")
                ? "hsl(215 65% 65%)"
                : "hsl(210 15% 65%)",
              background: isActive("/admin/knowledge/wiki")
                ? "hsl(215 65% 50% / 0.12)"
                : "transparent",
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
