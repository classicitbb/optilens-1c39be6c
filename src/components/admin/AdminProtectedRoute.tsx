import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import NotAuthorized from "./NotAuthorized";
import { createAuthHref } from "@/lib/authFlow";

/** Accountants are finance-only: the one admin surface they may open. */
const ACCOUNTANT_HOME = "/admin/finance/costings";
const isAccountantPath = (pathname: string) =>
  pathname === "/admin/finance" || pathname.startsWith("/admin/finance/");

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isAccountant, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(210 20% 97%)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) {
    const redirect = location.pathname + location.search + location.hash;
    return <Navigate to={createAuthHref({ mode: "signin", redirect })} replace />;
  }

  if (isAccountant) {
    if (isAccountantPath(location.pathname)) return <>{children}</>;
    // The admin landing pages bounce to Finance; every other staff surface (/ops, /atlas, /copilot, other /admin apps) is closed.
    if (location.pathname === "/admin" || location.pathname === "/admin/" || location.pathname === "/admin/dashboard") {
      return <Navigate to={ACCOUNTANT_HOME} replace />;
    }
    return <NotAuthorized />;
  }

  if (!hasAccess) {
    return <NotAuthorized />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
