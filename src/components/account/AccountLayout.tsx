import { Outlet, useLocation, useNavigate } from "react-router";
<<<<<<< Updated upstream
import { Eye, X } from "lucide-react";
=======
import { ChevronLeft, Eye, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
>>>>>>> Stashed changes
import { useAuth } from "@/contexts/AuthContext";
import AccountSidebar from "@/components/account/AccountSidebar";
import AccountTopBar from "@/components/account/AccountTopBar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { usePortalIdentity } from "@/hooks/usePortalIdentity";
import { stopPortalEmulation } from "@/lib/portalEmulation";

const getDisplayName = (email?: string | null) => {
  if (!email) return "Customer";
  const [name] = email.split("@");
  return name || "Customer";
};

const EmulationBanner = () => {
  const navigate = useNavigate();
  const { emulation } = usePortalIdentity();
  if (!emulation) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-amber-950">
      <Eye className="h-4 w-4" />
      Viewing portal as {emulation.label} — actions here affect their account view only.
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-amber-800 bg-transparent text-amber-950 hover:bg-amber-400"
<<<<<<< Updated upstream
        onClick={() => {
          stopPortalEmulation();
          navigate("/admin/website/portals");
=======
        disabled={isRestoring}
        onClick={async () => {
          setIsRestoring(true);
          try {
            const restoredAdmin = portalSessionEmulation ? await restorePortalAdminSession(supabase) : false;
            stopPortalEmulation();
            clearStoredPortalAdminSession();
            queryClient.clear();
            if (restoredAdmin) {
              navigate("/admin/website/portals", { replace: true });
            } else {
              // The "signed in as" flow opens a separate-origin preview tab that
              // never held an admin session to restore, so navigating to an
              // admin route here would leave this tab stuck signed in as the
              // customer. Sign out of the emulated session and close the tab
              // instead — the admin's original tab is untouched.
              await supabase.auth.signOut({ scope: "local" });
              window.close();
              navigate("/", { replace: true });
            }
          } finally {
            setIsRestoring(false);
          }
>>>>>>> Stashed changes
        }}
      >
        <X className="mr-1 h-3.5 w-3.5" /> Exit emulation
      </Button>
    </div>
  );
};

const AccountLayout = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { emulation } = usePortalIdentity();
  usePresenceHeartbeat("customer");

  const displayName = emulation ? emulation.label : getDisplayName(user?.email);

  return (
    <div className="min-h-screen bg-background">
      <EmulationBanner />
      <AccountTopBar displayName={displayName} onSignOut={signOut} />

<<<<<<< Updated upstream
      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-6 sm:px-6 xl:px-8 2xl:px-10">
        <aside className="hidden w-64 shrink-0 border-r pr-4 lg:block xl:w-72 xl:pr-6">
          <AccountSidebar pathname={location.pathname} />
=======
      <div className="flex w-full gap-6 px-4 py-6 sm:px-6 xl:px-8 2xl:px-10">
        <aside className={`sticky top-16 hidden shrink-0 self-start border-r pr-4 transition-[width] lg:block ${sidebarCollapsed ? "w-14" : "w-64 xl:w-72 xl:pr-6"}`}>
          <AccountSidebar pathname={location.pathname} collapsed={sidebarCollapsed} />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute -right-3.5 top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border-border/70 bg-background p-0 shadow-xs hover:scale-105 hover:shadow-sm"
                aria-label={sidebarCollapsed ? "Expand account navigation" : "Collapse account navigation"}
                onClick={() => setSidebarCollapsed((current) => {
                  const next = !current;
                  try { localStorage.setItem("cv.portal.sidebar-collapsed", String(next)); } catch { /* optional */ }
                  return next;
                })}
              >
                <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-300 ${sidebarCollapsed ? "rotate-180" : ""}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}</TooltipContent>
          </Tooltip>
>>>>>>> Stashed changes
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AccountLayout;
