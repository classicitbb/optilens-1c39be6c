import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { getDefaultLandingPageForRole } from "@/lib/accessControl";

const AdminHomeRedirect = () => {
  const { role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return <Navigate to={getDefaultLandingPageForRole(role)} replace />;
};

export default AdminHomeRedirect;
