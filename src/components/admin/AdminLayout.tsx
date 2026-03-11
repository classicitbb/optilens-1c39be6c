import { Outlet, useLocation } from "react-router-dom";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";


const AdminLayout = () => {
  const { pathname } = useLocation();
  const hideSidebar = pathname === "/admin/dashboard";

  return (
    <AdminRoleProvider>
      <div className="admin-tool dark flex flex-col h-screen w-full overflow-hidden rounded-none">
        <AdminTopBar />
        <div className="flex flex-1 min-h-0">
          {!hideSidebar ? <AdminSidebar /> : null}
          <main className="admin-content flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
        
      </div>
    </AdminRoleProvider>);

};

export default AdminLayout;
