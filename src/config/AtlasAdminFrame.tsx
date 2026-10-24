import { useState, type ReactNode } from "react";
import AdminTopBar from "@/components/admin/AdminTopBar";
import HelpPanel from "@/components/admin/HelpPanel";
import CrmActivityDialog from "@/components/admin/CrmActivityDialog";
import HelpdeskTicketDialog from "@/features/admin/helpdesk/components/HelpdeskTicketDialog";

/**
 * The site-wide admin header around Atlas in a browser tab: launcher, search, notifications,
 * profile and help. Atlas skips it when installed (see `useStandaloneDisplay`).
 */
const AtlasAdminFrame = ({ children }: { children: ReactNode }) => {
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <>
      <AdminTopBar helpOpen={helpOpen} onHelpToggle={() => setHelpOpen((open) => !open)} />
      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1">{children}</div>
        <HelpPanel open={helpOpen} onClose={() => setHelpOpen(false)} currentSlug="all" />
        <CrmActivityDialog />
        <HelpdeskTicketDialog />
      </div>
    </>
  );
};

export default AtlasAdminFrame;
