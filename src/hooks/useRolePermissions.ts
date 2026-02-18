import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";

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
  "imports",
  "exports",
  "history",
  "parameters",
  "users",
  "audit",
  "wiki",
  "costings",
  "quotations",
] as const;

export type Feature = (typeof FEATURES)[number];

/** Map sidebar paths to feature keys */
export const PATH_FEATURE_MAP: Record<string, Feature> = {
  "/admin/catalog": "catalog",
  "/admin/reference": "reference",
  "/admin/pricing": "pricing",
  "/admin/imports": "imports",
  "/admin/exports": "exports",
  "/admin/history": "history",
  "/admin/parameters": "parameters",
  "/admin/users": "users",
  "/admin/audit": "audit",
  "/admin/wiki": "wiki",
  "/admin/costings": "costings",
  "/admin/costings/shipments": "costings",
  "/admin/costings/lens-shipments": "costings",
  "/admin/costings/non-lens-shipments": "costings",
  "/admin/costings/reports": "costings",
  "/admin/quotations": "quotations",
};

export const useRolePermissions = () => {
  const { role } = useUserRole();
  const qc = useQueryClient();

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
  const myPermissions = allPermissions.filter((p) => p.role === role);

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

  return {
    allPermissions,
    myPermissions,
    isLoading,
    canView,
    canEditFeature,
    updatePermission,
  };
};
