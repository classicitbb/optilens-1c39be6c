import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AccountSidebar from "@/components/account/AccountSidebar";
import AccountTopBar from "@/components/account/AccountTopBar";

const getPageTitle = (pathname: string) => {
  if (pathname === "/profile") return "Customer Account";
  if (pathname === "/profile/account") return "My Account";
  if (pathname === "/profile/orders") return "My Orders";
  if (pathname === "/profile/address-book") return "Address Book";
  if (pathname === "/profile/quotes") return "Quote Form";
  if (pathname === "/profile/helpdesk") return "Helpdesk Tickets";
  if (pathname === "/profile/pricelists") return "Assigned Pricelists";
  if (pathname.startsWith("/profile/")) return "Account";
  return "Customer Account";
};

const getDisplayName = (email?: string | null) => {
  if (!email) return "Customer";
  const [name] = email.split("@");
  return name || "Customer";
};

const AccountLayout = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const pageTitle = getPageTitle(location.pathname);
  const displayName = getDisplayName(user?.email);

  return (
    <div className="min-h-screen bg-background">
      <AccountTopBar pageTitle={pageTitle} displayName={displayName} onSignOut={signOut} />

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
