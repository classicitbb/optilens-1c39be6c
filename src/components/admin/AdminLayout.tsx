import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";
import HelpPanel from "./HelpPanel";
import { pathnameToContextSlug } from "@/lib/adminContexts";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import CrmActivityDialog from "./CrmActivityDialog";
import OperatorAttentionAlert from "./OperatorAttentionAlert";
import AdminCopilotAssistant from "./copilot/AdminCopilotAssistant";
import { useLiveHelpdeskInboxUpdates } from "@/features/admin/helpdesk/hooks/useLiveHelpdeskUpdates";

const AdminLayout = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  usePresenceHeartbeat("admin");
  useLiveHelpdeskInboxUpdates();
  const contextSlug = pathnameToContextSlug(location.pathname);
  const isDocStudio = location.pathname === "/admin/docs/studio";
  const hideSidebar =
    location.pathname === "/admin/dashboard" ||
    location.pathname.startsWith("/admin/knowledge/wiki") ||
    isDocStudio;

  return (
    <AdminRoleProvider>
      <div className="admin-tool flex flex-col h-screen w-full overflow-hidden rounded-none">
        <AdminTopBar helpOpen={helpOpen} onHelpToggle={() => setHelpOpen((prev) => !prev)} />
        <OperatorAttentionAlert />
        <div className="relative flex flex-1 min-h-0">
          {!hideSidebar && <AdminSidebar />}
          <div className="flex flex-1 min-w-0 min-h-0">
            <main
              className={`admin-content flex min-h-0 flex-1 min-w-0 flex-col overflow-hidden ${isDocStudio ? "p-0" : "p-4"}`}
            >
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                <Outlet />
              </div>
            </main>
            <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} currentSlug={contextSlug} />
            <CrmActivityDialog />
          </div>
        </div>
        <AdminCopilotAssistant />
      </div>
    </AdminRoleProvider>
  );
};

export default AdminLayout;
