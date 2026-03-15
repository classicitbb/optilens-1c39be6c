import { lazy, Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import { pathnameToContextSlug } from "@/lib/adminContexts";

const HelpPanel = lazy(() => import("./HelpPanel"));

const AdminLayout = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const contextSlug = pathnameToContextSlug(location.pathname);
  const hideSidebar = location.pathname === "/admin/dashboard";

  return (
    <AdminRoleProvider>
      <div className="admin-tool dark flex flex-col h-screen w-full overflow-hidden rounded-none">
        <AdminTopBar helpOpen={helpOpen} onHelpToggle={() => setHelpOpen((prev) => !prev)} />
        <div className="flex flex-1 min-h-0">
          {!hideSidebar && <AdminSidebar />}
          <div className="flex flex-1 min-w-0">
            <main className="admin-content flex-1 overflow-auto p-4 min-w-0">
              <Outlet />
            </main>
            {helpOpen && (
              <Suspense fallback={null}>
                <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} currentSlug={contextSlug} />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </AdminRoleProvider>
  );
};

export default AdminLayout;
