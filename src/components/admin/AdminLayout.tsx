import { Outlet } from "react-router-dom";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import AdminChatbot from "./AdminChatbot";

const AdminLayout = () => {
  return (
    <AdminRoleProvider>
      <div className="admin-tool flex h-screen overflow-hidden w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminTopBar />
          <main className="admin-content flex-1 overflow-auto p-4">
            <Outlet />
          </main>
        </div>
        <AdminChatbot />
      </div>
    </AdminRoleProvider>
  );
};

export default AdminLayout;
