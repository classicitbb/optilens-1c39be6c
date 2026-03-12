import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AccountSidebar from "@/components/account/AccountSidebar";
import AccountTopBar from "@/components/account/AccountTopBar";

const getDisplayName = (email?: string | null) => {
  if (!email) return "Customer";
  const [name] = email.split("@");
  return name || "Customer";
};

const AccountLayout = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const displayName = getDisplayName(user?.email);

  return (
    <div className="min-h-screen bg-background">
      <AccountTopBar displayName={displayName} onSignOut={signOut} />

      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 md:px-6">
        <aside className="hidden w-64 shrink-0 border-r pr-4 lg:block">
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
