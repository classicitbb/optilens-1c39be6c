import { useState, useEffect, useMemo } from "react";
import { useLocation, Link } from "react-router-dom";
import { ADMIN_APPS, type AppKey } from "@/features/admin/core/config/apps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PanelLeftClose, PanelLeft, ArrowLeft } from "lucide-react";
import SidebarNavList, { type SidebarNavItem } from "@/components/shared/SidebarNavList";

type IntegrationConnectionRow = {
  status: "connected" | "error" | "not_configured" | null;
};

const AdminSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const activeAppKey = useMemo<AppKey | null>(() => {
    for (const [key, app] of Object.entries(ADMIN_APPS)) {
      if (currentPath.startsWith(app.baseRoute)) return key as AppKey;
    }
    return null;
  }, [currentPath]);

  const activeApp = activeAppKey ? ADMIN_APPS[activeAppKey] : null;

  const { data: integrationStatus } = useQuery({
    queryKey: ["integration-connection-status", "odoo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .select("status")
        .eq("provider", "odoo")
        .eq("tenant_key", "default")
        .maybeSingle();
      if (error) throw error;
      return (data as IntegrationConnectionRow | null)?.status ?? "not_configured";
    },
    enabled: activeAppKey === "settings",
  });

  const isEditorRoute = /\/publisher\/\d+/.test(currentPath) || /\/quotations\/[^/]+$/.test(currentPath);
  const [collapsed, setCollapsed] = useState(isEditorRoute);

  useEffect(() => {
    if (isEditorRoute) setCollapsed(true);
  }, [isEditorRoute]);

  const w = collapsed ? "w-14" : "w-60";
  const linkBase = "flex items-center gap-2 px-3 py-1.5 text-[13px] rounded transition-colors";

  const integrationStatusLabel =
    integrationStatus === "connected" ? "Connected" : integrationStatus === "error" ? "Error" : "Not configured";

  const sidebarItems: SidebarNavItem[] = useMemo(
    () =>
      activeApp?.sidebarItems.map((item) => ({
        label: item.label,
        to: item.route,
        icon: item.icon,
        badge:
          item.route === "/admin/settings/integrations" ? (
            <Badge
              variant="outline"
              className={`ml-auto text-[10px] py-0 h-4 ${
                integrationStatus === "connected"
                  ? "text-green-400 border-green-400/50"
                  : integrationStatus === "error"
                    ? "text-red-400 border-red-400/50"
                    : ""
              }`}
            >
              {integrationStatusLabel}
            </Badge>
          ) : null,
      })) ?? [],
    [activeApp, integrationStatus, integrationStatusLabel],
  );

  return (
    <aside
      className={`admin-sidebar ${w} shrink-0 flex flex-col transition-all duration-200 border-r border-[hsl(var(--admin-border))]`}
    >
      <div className="h-11 flex items-center justify-between px-3 border-b rounded-none border-[hsl(var(--admin-border))]">
        {!collapsed && activeApp && (
          <span className="text-sm font-semibold tracking-tight text-[hsl(var(--admin-sidebar-fg))]">{activeApp.title}</span>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-[hsl(var(--admin-sidebar-hover))]">
          {collapsed ? (
            <PanelLeft className="h-4 w-4 text-[hsl(var(--admin-sidebar-fg))]" />
          ) : (
            <PanelLeftClose className="h-4 w-4 text-[hsl(var(--admin-sidebar-fg))]" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5 rounded-none">
        <SidebarNavList
          items={sidebarItems}
          pathname={currentPath}
          collapsed={collapsed}
          className="space-y-0.5"
          itemClassName={linkBase}
          activeItemClassName="font-medium bg-[hsl(var(--admin-sidebar-active))]/20 text-[hsl(var(--admin-sidebar-active-fg))]"
          inactiveItemClassName="text-[hsl(var(--admin-sidebar-fg))] hover:bg-[hsl(var(--admin-sidebar-hover))]"
          labelClassName="text-sidebar-ring"
        />
      </div>

      <div className="border-t px-3 py-2 space-y-0.5 rounded-none border-[hsl(var(--admin-border))]">
        <Link
          to="/"
          className={`${linkBase} w-full text-[hsl(var(--admin-sidebar-fg))] hover:bg-[hsl(var(--admin-sidebar-hover))]`}
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
