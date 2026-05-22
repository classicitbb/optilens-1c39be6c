import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import HelpPanel from "./HelpPanel";
import { pathnameToContextSlug } from "@/lib/adminContexts";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";

const AdminLayout = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  usePresenceHeartbeat("admin");
  const contextSlug = pathnameToContextSlug(location.pathname);
  const hideSidebar = location.pathname === "/admin/dashboard" || location.pathname.startsWith("/admin/knowledge/wiki");

  return (
    <AdminRoleProvider>
      <div className="admin-tool flex flex-col h-screen w-full overflow-hidden rounded-none">
        <AdminTopBar helpOpen={helpOpen} onHelpToggle={() => setHelpOpen((prev) => !prev)} />
        <div className="relative flex flex-1 min-h-0">
          {!hideSidebar && <AdminSidebar />}
          <div className="flex flex-1 min-w-0 min-h-0">
            <main className="admin-content flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden p-4">
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <Outlet />
              </div>
            </main>
            <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} currentSlug={contextSlug} />
          </div>
        </div>
      </div>
    </AdminRoleProvider>
  );
};

export default AdminLayout;
