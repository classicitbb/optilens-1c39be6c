import { Outlet, useLocation, useNavigate } from "react-router";
import { Eye, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import AccountSidebar from "@/components/account/AccountSidebar";
import AccountTopBar from "@/components/account/AccountTopBar";
import { Button } from "@/components/ui/button";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { clearStoredPortalAdminSession, restorePortalAdminSession, stopPortalEmulation } from "@/lib/portalEmulation";
import { capitalizeDisplayName } from "@/lib/profileData";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const getDisplayName = (email?: string | null) => {
  if (!email) return "Customer";
  const [name] = email.split("@");
  return capitalizeDisplayName(name, "Customer");
};

const EmulationBanner = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { emulation, portalSessionEmulation } = usePortalIdentity();
  const [isRestoring, setIsRestoring] = useState(false);
  const visibleEmulation = portalSessionEmulation ?? emulation;
  if (!visibleEmulation) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <Eye className="h-4 w-4" />
      Signed in as {visibleEmulation.label}
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-amber-800 bg-transparent text-amber-950 hover:bg-amber-400"
        disabled={isRestoring}
        onClick={async () => {
          setIsRestoring(true);
          try {
            if (portalSessionEmulation) {
              await restorePortalAdminSession(supabase);
            }
            stopPortalEmulation();
            clearStoredPortalAdminSession();
            queryClient.clear();
            navigate("/admin/website/portals", { replace: true });
          } finally {
            setIsRestoring(false);
          }
        }}
      >
        <X className="mr-1 h-3.5 w-3.5" /> {isRestoring ? "Exiting…" : "Exit emulation"}
      </Button>
    </div>
  );
};

const AccountLayout = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { emulation, portalSessionEmulation } = usePortalIdentity();
  usePresenceHeartbeat("customer");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("cv.portal.sidebar-collapsed") === "true"; } catch { return false; }
  });

  const visibleEmulation = portalSessionEmulation ?? emulation;
  const displayName = visibleEmulation ? capitalizeDisplayName(visibleEmulation.label, "Customer") : getDisplayName(user?.email);

  return (
    <div className="h-dvh overflow-y-auto bg-background">
      <EmulationBanner />
      <AccountTopBar displayName={displayName} onSignOut={signOut} />

      <div className="flex w-full gap-6 px-4 py-6 sm:px-6 xl:px-8 2xl:px-10">
        <aside className={`sticky top-16 hidden shrink-0 self-start border-r pr-4 transition-[width] lg:block ${sidebarCollapsed ? "w-14" : "w-64 xl:w-72 xl:pr-6"}`}>
          <AccountSidebar pathname={location.pathname} collapsed={sidebarCollapsed} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-border/70 bg-background p-0 shadow-xs"
            aria-label={sidebarCollapsed ? "Expand account navigation" : "Collapse account navigation"}
            onClick={() => setSidebarCollapsed((current) => {
              const next = !current;
              try { localStorage.setItem("cv.portal.sidebar-collapsed", String(next)); } catch { /* optional */ }
              return next;
            })}
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-3 w-3" /> : <PanelLeftClose className="h-3 w-3" />}
          </Button>
        </aside>

        <main className="mx-auto min-w-0 w-full max-w-[1280px] flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AccountLayout;
