import { useMemo, Fragment } from "react";
import { useRolePermissions, FEATURES, type RolePermission } from "@/hooks/useRolePermissions";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import type { AppRole } from "@/hooks/useUserRole";

const ROLE_ORDER: AppRole[] = ["admin", "operator", "viewer", "customer"];

const FEATURE_LABELS: Record<string, string> = {
  catalog: "Product Catalog",
  reference: "Reference Data",
  pricing: "Lens Prices",
  "rx-lens-prices": "RX Lens Prices",
  "stock-lens-prices": "Stock Lens Prices",
  "supplies-prices": "Supplies Prices",
  "pricing-settings": "Pricing Settings",
  imports: "Imports",
  exports: "Exports",
  costings: "Import Costings",
  "catalog-publisher": "Lens Catalog Builder",
  quotations: "Quotations",
  crm: "CRM",
  contacts: "Contacts",
  content: "Content Manager",
  wiki: "Help / Wiki",
  users: "Users",
  roles: "Roles & Permissions",
  audit: "Audit Log",
  parameters: "Company Settings",
  history: "Runs / History",
};

const PermissionGrid = () => {
  const { allPermissions, updatePermission } = useRolePermissions();
  const { toast } = useToast();

  const grid = useMemo(() => {
    const map = new Map<string, RolePermission>();
    for (const p of allPermissions) map.set(`${p.role}:${p.feature}`, p);
    return map;
  }, [allPermissions]);

  const handleToggle = (perm: RolePermission, field: "can_view" | "can_edit", value: boolean) => {
    const updates = {
      id: perm.id,
      can_view: field === "can_view" ? value : perm.can_view,
      can_edit: field === "can_edit" ? value : perm.can_edit,
    };
    // If disabling view, also disable edit
    if (field === "can_view" && !value) updates.can_edit = false;
    // If enabling edit, also enable view
    if (field === "can_edit" && value) updates.can_view = true;

    updatePermission.mutate(updates, {
      onError: () => toast({ title: "Error", description: "Failed to update permission", variant: "destructive" }),
    });
  };

  return (
    <div className="border rounded overflow-auto" style={{ borderColor: "hsl(215 15% 85%)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "hsl(210 20% 97%)" }}>
            <th className="text-left px-3 py-2 font-medium" style={{ color: "hsl(215 15% 50%)" }}>Feature</th>
            {ROLE_ORDER.map((role) => (
              <th key={role} colSpan={2} className="text-center px-2 py-2 font-medium capitalize" style={{ color: "hsl(215 15% 50%)" }}>
                {role}
              </th>
            ))}
          </tr>
          <tr style={{ background: "hsl(210 20% 97%)" }}>
            <td />
            {ROLE_ORDER.map((role) => (
              <Fragment key={role}>
                <td className="text-center px-1 py-1 font-normal text-[10px]" style={{ color: "hsl(215 15% 60%)" }}>View</td>
                <td className="text-center px-1 py-1 font-normal text-[10px]" style={{ color: "hsl(215 15% 60%)" }}>Edit</td>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature) => (
            <tr key={feature} className="border-t" style={{ borderColor: "hsl(215 15% 92%)" }}>
              <td className="px-3 py-1.5 font-medium" style={{ color: "hsl(215 30% 15%)" }}>
                {FEATURE_LABELS[feature] ?? feature}
              </td>
              {ROLE_ORDER.map((role) => {
                const perm = grid.get(`${role}:${feature}`);
                if (!perm) return <td key={role} colSpan={2} />;
                return (
                  <Fragment key={role}>
                    <td className="text-center px-1 py-1.5">
                      <Checkbox
                        checked={perm.can_view}
                        onCheckedChange={(v) => handleToggle(perm, "can_view", !!v)}
                        disabled={role === "admin"}
                        className="mx-auto"
                      />
                    </td>
                    <td className="text-center px-1 py-1.5">
                      <Checkbox
                        checked={perm.can_edit}
                        onCheckedChange={(v) => handleToggle(perm, "can_edit", !!v)}
                        disabled={role === "admin"}
                        className="mx-auto"
                      />
                    </td>
                  </Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PermissionGrid;
