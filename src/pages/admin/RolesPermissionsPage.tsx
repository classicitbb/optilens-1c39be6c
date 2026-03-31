import PermissionGrid from "@/components/admin/PermissionGrid";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Lock } from "lucide-react";
import ReleaseWhatChangedLink from "@/components/admin/ReleaseWhatChangedLink";

const RolesPermissionsPage = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-2">
      <AdminPageHeader icon={Lock} title="Roles & Permissions" />
      <ReleaseWhatChangedLink section="permissions" />
    </div>
    <PermissionGrid />
  </div>
);

export default RolesPermissionsPage;
