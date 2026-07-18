import { Outlet, useLocation, useNavigate } from "react-router";
import { Eye, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AccountSidebar from "@/components/account/AccountSidebar";
import AccountTopBar from "@/components/account/AccountTopBar";
import { Button } from "@/components/ui/button";
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
        onClick={() => {
          stopPortalEmulation();
          navigate("/admin/website/portals");
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

      <div className="mx-auto flex w-full max-w-[1600px] gap-6 px-4 py-6 sm:px-6 xl:px-8 2xl:px-10">
        <aside className="hidden w-64 shrink-0 border-r pr-4 lg:block xl:w-72 xl:pr-6">
          <AccountSidebar pathname={location.pathname} />
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AccountLayout;
