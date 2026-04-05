import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import AdminTopBar from "./AdminTopBar";
import HelpPanel from "./HelpPanel";
import { pathnameToContextSlug } from "@/lib/adminContexts";

const AdminDocsLayout = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const contextSlug = pathnameToContextSlug(location.pathname);

  return (
    <AdminRoleProvider>
      <div className="admin-tool dark flex flex-col h-screen w-full overflow-hidden rounded-none">
        <AdminTopBar helpOpen={helpOpen} onHelpToggle={() => setHelpOpen((prev) => !prev)} />
        <div className="flex flex-1 min-h-0 min-w-0">
          <main className="admin-content flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden p-4">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <Outlet />
            </div>
          </main>
          <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} currentSlug={contextSlug} />
        </div>
      </div>
    </AdminRoleProvider>
  );
};

export default AdminDocsLayout;
