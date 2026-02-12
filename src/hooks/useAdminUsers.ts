import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useUserRole";

export interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AppRole | null;
  role_id: string | null;
}

export const useAdminUsers = () => {
  const qc = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch all profiles (admin RLS allows this)
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, display_name");
      if (pErr) throw pErr;

      // Fetch all roles (admin RLS allows this)
      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("id, user_id, role");
      if (rErr) throw rErr;

      const roleMap = new Map(roles?.map((r) => [r.user_id, r]) ?? []);

      return (profiles ?? []).map((p) => {
        const r = roleMap.get(p.user_id);
        return {
          user_id: p.user_id,
          email: "", // will be enriched below if possible
          display_name: p.display_name,
          role: (r?.role as AppRole) ?? null,
          role_id: r?.id ?? null,
        } satisfies AdminUser;
      });
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Upsert: if the user already has a role row, update it; otherwise insert
      const existing = users.find((u) => u.user_id === userId);
      if (existing?.role_id) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role })
          .eq("id", existing.role_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return { users, isLoading, error, assignRole, removeRole };
};
