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
    <div className="border border-[hsl(var(--admin-border))] rounded max-h-[70vh] overflow-auto">
      <table className="w-full table-fixed text-xs">
        <colgroup>
          <col className="w-40" />
          {ROLE_ORDER.map((role) => (
            <Fragment key={role}>
              <col className="w-11" />
              <col className="w-11" />
            </Fragment>
          ))}
        </colgroup>
        <thead className="sticky top-0 z-10">
          <tr className="bg-[hsl(var(--admin-accent))]">
            <th className="text-left px-2 py-1.5 font-semibold uppercase tracking-wider text-[10px] text-[hsl(var(--admin-accent-fg))]">
              Feature
            </th>
            {ROLE_ORDER.map((role) => (
              <th
                key={role}
                colSpan={2}
                className="text-center px-1 py-1.5 font-semibold uppercase tracking-wider text-[10px] capitalize text-[hsl(var(--admin-accent-fg))]"
              >
                {role}
              </th>
            ))}
          </tr>
          <tr className="bg-[hsl(var(--admin-table-header-bg))]">
            <td />
            {ROLE_ORDER.map((role) => (
              <Fragment key={role}>
                <td className="text-center px-0.5 py-1 font-medium text-[9px] text-[hsl(var(--admin-table-muted-fg))]">
                  View
                </td>
                <td className="text-center px-0.5 py-1 font-medium text-[9px] text-[hsl(var(--admin-table-muted-fg))]">
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
              className={`border-b border-[hsl(var(--admin-table-border))] ${idx % 2 === 0 ? "bg-[hsl(var(--admin-table-row-even))]" : "bg-[hsl(var(--admin-table-row-odd))]"}`}
            >
              <td className="truncate px-2 py-1 font-medium text-[hsl(var(--admin-table-fg))]">
                {FEATURE_LABELS[feature] ?? feature}
              </td>
              {ROLE_ORDER.map((role) => {
                const perm = grid.get(`${role}:${feature}`);
                if (!perm) return <td key={role} colSpan={2} />;
                return (
                  <Fragment key={role}>
                    <td className="text-center px-0.5 py-1">
                      <Checkbox
                        checked={perm.can_view}
                        onCheckedChange={(v) => handleToggle(perm, "can_view", !!v)}
                        className="mx-auto border-[hsl(var(--admin-border))] data-[state=checked]:bg-[hsl(var(--admin-accent))] data-[state=checked]:border-[hsl(var(--admin-accent))]"
                      />
                    </td>
                    <td className="text-center px-0.5 py-1">
                      <Checkbox
                        checked={perm.can_edit}
                        onCheckedChange={(v) => handleToggle(perm, "can_edit", !!v)}
                        className="mx-auto border-[hsl(var(--admin-border))] data-[state=checked]:bg-[hsl(var(--admin-accent))] data-[state=checked]:border-[hsl(var(--admin-accent))]"
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
