import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "react-router";
import { ADMIN_APPS, type AppKey } from "@/features/admin/core/config/apps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PanelLeftClose, PanelLeft, Pin, PinOff } from "lucide-react";
import SidebarNavList, { type SidebarNavItem } from "@/components/shared/SidebarNavList";
import { cn } from "@/lib/utils";

// "pinned"   — always open, no flyout (user locked it)
// "open"     — open, will collapse to icon rail on manual toggle
// "collapsed"— icon rail; hovers over it open a flyout overlay
type SidebarMode = "pinned" | "open" | "collapsed";

type IntegrationConnectionRow = {
  status: "connected" | "error" | "not_configured" | null;
};

const AdminSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [mode, setMode] = useState<SidebarMode>("open");
  const [isHovering, setIsHovering] = useState(false);
  const userInteractedRef = useRef(false);

  // Auto-collapse 5s after page load (unless user pins/toggles or hovers first)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!userInteractedRef.current) {
        setMode((prev) => (prev === "open" ? "collapsed" : prev));
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

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
      const { data, error } = await (supabase.from("integration_connections") as any)
        .select("status")
        .eq("provider", "odoo")
        .eq("tenant_key", "default")
        .maybeSingle();
      if (error) throw error;
      return (data as IntegrationConnectionRow | null)?.status ?? "not_configured";
    },
    enabled: activeAppKey === "settings",
  });

  // Editor routes (publisher, quotation editor) → always force-collapsed, no flyout
  const isEditorRoute =
    /\/publisher\/\d+/.test(currentPath) || /\/quotations\/[^/]+$/.test(currentPath);

  const isPinned = mode === "pinned";
  // Icon-rail state: editor route always collapses; user can collapse manually
  const isCollapsed = isEditorRoute || mode === "collapsed";
  // Flyout overlay: only when collapsed (not editor) and mouse is over the rail
  const showFlyout = isCollapsed && !isEditorRoute && isHovering;
  // Whether labels should appear (expanded view)
  const showLabels = !isCollapsed || showFlyout;

  const integrationStatusLabel =
    integrationStatus === "connected"
      ? "Connected"
      : integrationStatus === "error"
        ? "Error"
        : "Not configured";

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

  const handleToggle = () => {
    if (isEditorRoute) return;
    if (isPinned) {
      setMode("open");
      return;
    }
    // Toggle between open ↔ collapsed
    setMode(mode === "open" ? "collapsed" : "open");
  };

  const handlePinToggle = () => {
    if (isEditorRoute) return;
    setMode(isPinned ? "open" : "pinned");
  };

  const linkBase = "flex items-center gap-2 px-3 py-1.5 text-[13px] rounded transition-colors";

  return (
    <aside
      className={cn(
        "admin-sidebar relative shrink-0 flex flex-col transition-all duration-200",
        isCollapsed ? "w-10" : "w-60",
      )}
      data-sidebar-mode={isEditorRoute ? "editor" : mode}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Inner panel — switches between inline and flyout overlay */}
      <div
        className={cn(
          "flex flex-col border-r border-[hsl(var(--admin-border))] transition-all duration-200",
          showFlyout
            ? // Flyout: absolute, full sidebar width, overlays main content
              "absolute inset-y-0 left-0 w-60 z-50 shadow-xl bg-[hsl(var(--admin-sidebar-bg))]"
            : // Inline: fill the aside's own width
              "h-full w-full",
        )}
      >
        {/* Header row */}
        <div
          className={cn(
            "h-11 flex items-center border-b rounded-none border-[hsl(var(--admin-border))]",
            showLabels ? "justify-between px-3" : "justify-center px-1",
          )}
        >
          {showLabels && activeApp && (
            <span className="text-sm font-semibold tracking-tight text-[hsl(var(--admin-sidebar-fg))] truncate">
              {activeApp.title}
            </span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {showLabels && !isEditorRoute && (
              <button
                onClick={handlePinToggle}
                className="p-1 rounded hover:bg-[hsl(var(--admin-sidebar-hover))]"
                aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
                title={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
              >
                {isPinned ? (
                  <PinOff className="h-4 w-4 text-[hsl(var(--admin-sidebar-fg))]" />
                ) : (
                  <Pin className="h-4 w-4 text-[hsl(var(--admin-sidebar-fg))]" />
                )}
              </button>
            )}
            {!isEditorRoute && (
              <button
                onClick={handleToggle}
                className="p-1 rounded hover:bg-[hsl(var(--admin-sidebar-hover))]"
                aria-label={showLabels ? "Collapse sidebar" : "Open sidebar"}
                title={showLabels ? "Collapse sidebar" : "Open sidebar"}
              >
                {showLabels ? (
                  <PanelLeftClose className="h-4 w-4 text-[hsl(var(--admin-sidebar-fg))]" />
                ) : (
                  <PanelLeft className="h-4 w-4 text-[hsl(var(--admin-sidebar-fg))]" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-0.5 rounded-none">
          <SidebarNavList
            items={sidebarItems}
            pathname={currentPath}
            collapsed={!showLabels}
            className="space-y-0.5"
            itemClassName={linkBase}
            activeItemClassName="font-medium bg-[hsl(var(--admin-sidebar-active))]/20 text-[hsl(var(--admin-sidebar-active-fg))]"
            inactiveItemClassName="text-[hsl(var(--admin-sidebar-fg))] hover:bg-[hsl(var(--admin-sidebar-hover))]"
            labelClassName="text-[hsl(var(--admin-sidebar-fg))]"
          />
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
