import { Navigate } from "react-router-dom";
import { useRolePermissions } from "@/hooks/useRolePermissions";

const AdminHomeRedirect = () => {
  const { isLoading, canView } = useRolePermissions();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (canView("crm")) {
    return <Navigate to="/admin/crm/dashboard" replace />;
  }

  if (canView("catalog")) {
    return <Navigate to="/admin/pricing/catalog" replace />;
  }

  if (canView("quotations")) {
    return <Navigate to="/admin/sales/quotations" replace />;
  }

  if (canView("contacts")) {
    return <Navigate to="/admin/contacts" replace />;
  }

  return <Navigate to="/admin/pricing/catalog" replace />;
};

export default AdminHomeRedirect;
