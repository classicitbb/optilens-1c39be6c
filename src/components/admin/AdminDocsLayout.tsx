import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
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
        <div className="flex flex-1 min-h-0">
          <main className="admin-content flex-1 overflow-auto p-4 min-w-0">
            <Outlet />
          </main>
          <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} currentSlug={contextSlug} />
        </div>
      </div>
    </AdminRoleProvider>
  );
};

export default AdminDocsLayout;
