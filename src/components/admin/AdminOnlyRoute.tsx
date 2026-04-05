import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAdminRole } from "@/contexts/AdminRoleContext";

const AdminOnlyRoute = ({ children }: { children: ReactNode }) => {
  const { isLoading, realRole } = useAdminRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (realRole !== "admin") {
    return <Navigate to="/admin/pricing/publisher" replace />;
  }

  return <>{children}</>;
};

export default AdminOnlyRoute;
