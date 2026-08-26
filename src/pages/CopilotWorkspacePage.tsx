import PortalCopilotPage from "@/pages/admin/PortalCopilotPage";
import AdminTopBar from "@/components/admin/AdminTopBar";
import { AdminRoleProvider } from "@/contexts/AdminRoleContext";

/**
 * Standalone Copilot workspace.
 *
 * Reuses the existing PortalCopilotPage component in a full-height shell with
 * the admin top bar, but no admin sidebar.
 */
export default function CopilotWorkspacePage() {
  return (
    <AdminRoleProvider>
      <div className="admin-tool flex h-screen w-full flex-col overflow-hidden rounded-none">
        <AdminTopBar helpOpen={false} onHelpToggle={() => {}} />
        <div className="flex min-h-0 flex-1 flex-col">
          <PortalCopilotPage standalone />
        </div>
      </div>
    </AdminRoleProvider>
  );
}
