import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import NotAuthorized from "./NotAuthorized";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "hsl(210 20% 97%)" }}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    return <NotAuthorized />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
