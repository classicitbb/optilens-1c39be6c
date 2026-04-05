import { Navigate } from "react-router";
import { useUserRole } from "@/hooks/useUserRole";

const AdminHomeRedirect = () => {
  const { isLoading } = useUserRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return <Navigate to="/admin/dashboard" replace />;
};

export default AdminHomeRedirect;
