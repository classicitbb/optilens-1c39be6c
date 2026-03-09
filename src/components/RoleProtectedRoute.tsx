import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { hasRole, type CanonicalRole, getDefaultLandingPageForRole } from "@/lib/accessControl";

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: CanonicalRole[];
  loginPath?: string;
}

const RoleProtectedRoute = ({ children, allowedRoles, loginPath = "/auth" }: RoleProtectedRouteProps) => {
  const { user, loading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    const redirect = location.pathname + location.search + location.hash;
    return <Navigate to={`${loginPath}?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (!hasRole(role, allowedRoles)) {
    return <Navigate to={getDefaultLandingPageForRole(role)} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
