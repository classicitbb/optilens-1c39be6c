import RoleProtectedRoute from "@/components/RoleProtectedRoute";

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <RoleProtectedRoute allowedRoles={["admin", "operator"]}>
      {children}
    </RoleProtectedRoute>
  );
};

export default AdminProtectedRoute;
