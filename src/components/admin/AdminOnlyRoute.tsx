import type { ReactNode } from "react";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";

const AdminOnlyRoute = ({ children }: { children: ReactNode }) => {
  return <RoleProtectedRoute allowedRoles={["admin"]}>{children}</RoleProtectedRoute>;
};

export default AdminOnlyRoute;
