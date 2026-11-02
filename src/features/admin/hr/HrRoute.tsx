import type { ReactNode } from "react";
import { Navigate } from "react-router";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { PrivacyFilterProvider } from "@/features/admin/hr/privacy";

/** HR pages mirror the can_hr() RLS check: admins and the office administrator only. */
const HrRoute = ({ children }: { children: ReactNode }) => {
  const { isLoading, realRole } = useAdminRole();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (realRole !== "admin" && realRole !== "office_admin") {
    return <Navigate to="/admin" replace />;
  }

  return <PrivacyFilterProvider>{children}</PrivacyFilterProvider>;
};

export default HrRoute;
