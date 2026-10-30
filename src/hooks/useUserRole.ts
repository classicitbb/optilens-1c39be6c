import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "operator" | "office_admin" | "viewer" | "customer";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: role, isLoading, error } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await (supabase.from("user_roles") as any)
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.role as AppRole) ?? null;
    },
    enabled: !!user,
  });

  return {
    role: role ?? null,
    isLoading,
    error,
    canEdit: role === "admin" || role === "operator" || role === "office_admin",
    isAdmin: role === "admin",
    isCustomer: role === "customer",
    canHr: role === "admin" || role === "office_admin",
    hasAccess: role === "admin" || role === "operator" || role === "office_admin" || role === "viewer",
  };
};
