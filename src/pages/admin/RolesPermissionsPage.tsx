import PermissionGrid from "@/components/admin/PermissionGrid";

const RolesPermissionsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Roles &amp; Permissions</h1>
      <p className="text-muted-foreground text-sm mt-1">
        Configure feature access for each role across the platform.
      </p>
    </div>
    <PermissionGrid />
  </div>
);

export default RolesPermissionsPage;
