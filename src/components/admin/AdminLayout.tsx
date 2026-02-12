import { Outlet } from "react-router-dom";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

const AdminLayout = () => {
  return (
    <AdminRoleProvider>
      <div className="admin-tool flex min-h-screen w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopBar />
          <main className="admin-content flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminRoleProvider>
  );
};

export default AdminLayout;
