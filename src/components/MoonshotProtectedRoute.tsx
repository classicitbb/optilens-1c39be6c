import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { canAccessRoute, hasPermission } from "@/lib/accessControl";

const MoonshotProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { role, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;
  }

  if (!user) {
    const redirect = location.pathname + location.search + location.hash;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (!hasPermission(role, "moonshot_access") || !canAccessRoute(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default MoonshotProtectedRoute;
