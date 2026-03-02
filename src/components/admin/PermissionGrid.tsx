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
  helpdesk: "Helpdesk",
  "helpdesk-teams": "Helpdesk Teams",
  "helpdesk-sla": "Helpdesk SLA",
  contacts: "Contacts",
  content: "Content Manager",
  wiki: "Help / Wiki",
  users: "Users",
  roles: "Roles & Permissions",
  audit: "Audit Log",
  integrations: "Integrations",
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
    if (field === "can_view" && !value) updates.can_edit = false;
    if (field === "can_edit" && value) updates.can_view = true;

    updatePermission.mutate(updates, {
      onError: () => toast({ title: "Error", description: "Failed to update permission", variant: "destructive" }),
    });
  };

  return (
    <div className="border rounded overflow-auto" style={{ borderColor: "hsl(215 22% 19%)" }}>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ background: "hsl(215 45% 28%)" }}>
            <th
              className="text-left px-3 py-2.5 font-semibold uppercase tracking-wider text-[11px]"
              style={{ color: "hsl(0 0% 100%)" }}
            >
              Feature
            </th>
            {ROLE_ORDER.map((role) => (
              <th
                key={role}
                colSpan={2}
                className="text-center px-2 py-2.5 font-semibold uppercase tracking-wider text-[11px] capitalize"
                style={{ color: "hsl(0 0% 100%)" }}
              >
                {role}
              </th>
            ))}
          </tr>
          <tr style={{ background: "hsl(215 35% 22%)" }}>
            <td />
            {ROLE_ORDER.map((role) => (
              <Fragment key={role}>
                <td
                  className="text-center px-1 py-1.5 font-medium text-[10px]"
                  style={{ color: "hsl(215 70% 75%)" }}
                >
                  View
                </td>
                <td
                  className="text-center px-1 py-1.5 font-medium text-[10px]"
                  style={{ color: "hsl(215 70% 75%)" }}
                >
                  Edit
                </td>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {FEATURES.map((feature, idx) => (
            <tr
              key={feature}
              style={{
                background: idx % 2 === 0 ? "hsl(215 30% 11%)" : "hsl(215 28% 14%)",
                borderBottom: "1px solid hsl(215 22% 19%)",
              }}
            >
              <td
                className="px-3 py-2 font-medium"
                style={{ color: "hsl(215 70% 75%)" }}
              >
                {FEATURE_LABELS[feature] ?? feature}
              </td>
              {ROLE_ORDER.map((role) => {
                const perm = grid.get(`${role}:${feature}`);
                if (!perm) return <td key={role} colSpan={2} />;
                return (
                  <Fragment key={role}>
                    <td className="text-center px-1 py-2">
                      <Checkbox
                        checked={perm.can_view}
                        onCheckedChange={(v) => handleToggle(perm, "can_view", !!v)}
                        className="mx-auto border-[hsl(215_50%_40%)] data-[state=checked]:bg-[hsl(215_65%_50%)] data-[state=checked]:border-[hsl(215_65%_50%)]"
                      />
                    </td>
                    <td className="text-center px-1 py-2">
                      <Checkbox
                        checked={perm.can_edit}
                        onCheckedChange={(v) => handleToggle(perm, "can_edit", !!v)}
                        className="mx-auto border-[hsl(215_50%_40%)] data-[state=checked]:bg-[hsl(215_65%_50%)] data-[state=checked]:border-[hsl(215_65%_50%)]"
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
