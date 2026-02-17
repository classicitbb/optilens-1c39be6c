import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "admin" | "operator" | "viewer" | "customer";

export const useUserRole = () => {
  const { user } = useAuth();

  const { data: role, isLoading, error } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_roles")
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
    canEdit: role === "admin" || role === "operator",
    isAdmin: role === "admin",
    isCustomer: role === "customer",
    hasAccess: !!role,
  };
};
