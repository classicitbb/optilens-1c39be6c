import PermissionGrid from "@/components/admin/PermissionGrid";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Lock } from "lucide-react";

const RolesPermissionsPage = () => (
  <div className="space-y-6">
    <AdminPageHeader icon={Lock} title="Roles & Permissions" />
    <PermissionGrid />
  </div>
);

export default RolesPermissionsPage;
