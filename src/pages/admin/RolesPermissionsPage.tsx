import PermissionGrid from "@/components/admin/PermissionGrid";
import { Lock } from "lucide-react";

const RolesPermissionsPage = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-2">
      <Lock className="h-5 w-5" style={{ color: "hsl(215 65% 50%)" }} />
      <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>Roles &amp; Permissions</h1>
    </div>
    <PermissionGrid />
  </div>
);

export default RolesPermissionsPage;
