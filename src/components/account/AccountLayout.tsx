import { Outlet, useLocation } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import AccountSidebar from "@/components/account/AccountSidebar";
import AccountTopBar from "@/components/account/AccountTopBar";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

const getDisplayName = (email?: string | null) => {
  if (!email) return "Customer";
  const [name] = email.split("@");
  return name || "Customer";
};

const AccountLayout = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  usePresenceHeartbeat("customer");

  const displayName = getDisplayName(user?.email);

  return (
    <div className="min-h-screen bg-background">
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
