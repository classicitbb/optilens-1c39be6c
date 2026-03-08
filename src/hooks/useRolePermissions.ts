import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { useAdminRoleSafe } from "@/contexts/AdminRoleContext";

export interface RolePermission {
  id: string;
  role: AppRole;
  feature: string;
  can_view: boolean;
  can_edit: boolean;
}

export const FEATURES = [
  "catalog",
  "reference",
  "pricing",
  "rx-lens-prices",
  "stock-lens-prices",
  "supplies-prices",
  "pricing-settings",
  "imports",
  "exports",
  "costings",
  "catalog-publisher",
  "quotations",
  "orders",
  "crm",
  "helpdesk",
  "helpdesk-teams",
  "helpdesk-sla",
  "contacts",
  "leads",
  "content",
  "website",
  "wiki",
  "users",
  "roles",
  "audit",
  "integrations",
  "parameters",
  "history",
  "moonshot",
  "runtime-errors",
] as const;

export type Feature = (typeof FEATURES)[number];

/** Map sidebar paths to feature keys */
export const PATH_FEATURE_MAP: Record<string, Feature> = {
  // Pricing
  "/admin/pricing/catalog": "catalog",
  "/admin/pricing/reference": "reference",
  "/admin/pricing/rx-lenses": "rx-lens-prices",
  "/admin/pricing/stock-lenses": "stock-lens-prices",
  "/admin/pricing/supplies": "supplies-prices",
  "/admin/pricing/settings": "pricing-settings",
  "/admin/pricing/imports": "imports",
  "/admin/pricing/costings": "costings",
  "/admin/pricing/costings/reports": "costings",
  "/admin/pricing/publisher": "catalog-publisher",
  // Sales
  "/admin/sales/proposals": "catalog-publisher",
  "/admin/sales/quotations": "quotations",
  "/admin/sales/web-orders": "orders",
  "/admin/sales/rx-orders": "orders",
  // Contacts
  "/admin/contacts": "contacts",
  "/admin/contacts/config/tags": "contacts",
  "/admin/contacts/config/industries": "contacts",
  // Leads
  "/admin/leads": "leads",
  "/admin/leads/finder": "leads",
  "/admin/leads/campaigns": "leads",
  "/admin/leads/reports": "leads",
  "/admin/leads/ai": "leads",
  "/admin/leads/settings": "leads",
  // CRM
  "/admin/crm": "crm",
  "/admin/crm/dashboard": "crm",
  "/admin/crm/pipeline": "crm",
  "/admin/crm/activities": "crm",
  // Helpdesk
  "/admin/helpdesk": "helpdesk",
  "/admin/helpdesk/tickets": "helpdesk",
  "/admin/helpdesk/teams": "helpdesk-teams",
  "/admin/helpdesk/stages": "helpdesk",
  "/admin/helpdesk/config": "helpdesk",
  "/admin/helpdesk/sla": "helpdesk-sla",
  // Website
  "/admin/website/content": "content",
  "/admin/website/features": "website",
  "/admin/website/portals": "website",
  "/admin/website/store": "website",
  // Knowledge
  "/admin/knowledge/wiki": "wiki",
  // Moonshot
  "/admin/moonshot": "moonshot",
  "/admin/moonshot/dashboard": "moonshot",
  "/admin/moonshot/workspace": "moonshot",
  "/admin/moonshot/meetings": "moonshot",
  "/admin/moonshot/scorecards": "moonshot",
  "/admin/moonshot/rocks": "moonshot",
  "/admin/moonshot/todos": "moonshot",
  "/admin/moonshot/issues": "moonshot",
  "/admin/moonshot/business-plan": "moonshot",
  "/admin/moonshot/tools": "moonshot",
  "/admin/moonshot/users": "moonshot",
  "/admin/moonshot/resources": "moonshot",
  "/admin/moonshot/settings": "moonshot",
  // Settings
  "/admin/settings/company": "parameters",
  "/admin/settings/users": "users",
  "/admin/settings/roles": "roles",
  "/admin/settings/audit": "audit",
  "/admin/settings/integrations": "integrations",
  "/admin/settings/runtime-errors": "runtime-errors",
  // Legacy paths
  "/admin/catalog": "catalog",
  "/admin/reference": "reference",
  "/admin/pricing": "pricing",
  "/admin/rx-lens-prices": "rx-lens-prices",
  "/admin/stock-lens-prices": "stock-lens-prices",
  "/admin/supplies-prices": "supplies-prices",
  "/admin/imports": "imports",
  "/admin/exports": "exports",
  "/admin/history": "history",
  "/admin/parameters": "parameters",
  "/admin/users": "users",
  "/admin/audit": "audit",
  "/admin/wiki": "wiki",
  "/admin/costings": "costings",
  "/admin/costings/shipments": "costings",
  "/admin/costings/reports": "costings",
  "/admin/quotations": "quotations",
  "/admin/content": "content",
  "/admin/catalog-publisher": "catalog-publisher",
};

export const useRolePermissions = () => {
  const { role: realRole } = useUserRole();
  const { role: activeRole } = useAdminRoleSafe();
  const qc = useQueryClient();
  
  // Use impersonated role if available, otherwise fall back to real role
  const effectiveRole = activeRole ?? realRole;

  const { data: allPermissions = [], isLoading } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("role_permissions")
        .select("*")
        .order("role")
        .order("feature");
      if (error) throw error;
      return data as RolePermission[];
    },
  });

  /** Permissions for the current user's role */
  const myPermissions = allPermissions.filter((p) => p.role === effectiveRole);

  const canView = (feature: Feature): boolean =>
    myPermissions.some((p) => p.feature === feature && p.can_view);

  const canEditFeature = (feature: Feature): boolean =>
    myPermissions.some((p) => p.feature === feature && p.can_edit);

  const updatePermission = useMutation({
    mutationFn: async ({
      id,
      can_view,
      can_edit,
    }: {
      id: string;
      can_view: boolean;
      can_edit: boolean;
    }) => {
      const { error } = await supabase
        .from("role_permissions")
        .update({ can_view, can_edit })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["role-permissions"] }),
  });

  /** Check if user has access to at least one feature under an app's featurePrefix */
  const hasAppAccess = (featurePrefix: string): boolean => {
    // Admin always has access to everything
    if (effectiveRole === "admin") return true;
    // Check if any permission with a matching feature prefix grants view access
    return myPermissions.some(
      (p) => (p.feature === featurePrefix || p.feature.startsWith(featurePrefix + "-")) && p.can_view
    );
  };

  return {
    allPermissions,
    myPermissions,
    isLoading,
    canView,
    canEditFeature,
    hasAppAccess,
    updatePermission,
  };
};
