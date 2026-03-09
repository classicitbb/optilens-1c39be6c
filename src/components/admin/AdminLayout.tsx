import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

const PageSpinner = () => (
  <div className="flex flex-1 items-center justify-center py-24">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const AdminLayout = () => {
  return (
    <AdminRoleProvider>
      <div className="admin-tool dark flex flex-col h-screen w-full overflow-hidden rounded-none">
        <AdminTopBar />
        <div className="flex flex-1 min-h-0">
          <AdminSidebar />
          <main className="admin-content flex-1 overflow-auto p-4">
            <Suspense fallback={<PageSpinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    </AdminRoleProvider>
  );
};

export default AdminLayout;