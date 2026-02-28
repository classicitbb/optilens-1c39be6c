import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

const AdminHomeRedirect = () => {
  const { role, isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  const hasCrmAccess = role === "admin" || role === "operator" || role === "viewer";
  return <Navigate to={hasCrmAccess ? "/admin/crm/pipeline" : "/admin/pricing/catalog"} replace />;
};

export default AdminHomeRedirect;
