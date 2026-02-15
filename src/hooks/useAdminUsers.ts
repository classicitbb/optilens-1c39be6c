import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useUserRole";

export interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AppRole | null;
  role_id: string | null;
  created_at: string | null;
}

export const useAdminUsers = () => {
  const qc = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch profiles + roles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("user_id, display_name");
      if (pErr) throw pErr;

      const { data: roles, error: rErr } = await supabase
        .from("user_roles")
        .select("id, user_id, role");
      if (rErr) throw rErr;

      // Fetch auth user emails via edge function
      let authUsers: { id: string; email: string; created_at: string }[] = [];
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "admin-user-management",
          { body: { action: "list-users" } }
        );
        if (!fnErr && Array.isArray(data)) authUsers = data;
      } catch {
        // Edge function may not be deployed yet; continue without emails
      }

      const roleMap = new Map(roles?.map((r) => [r.user_id, r]) ?? []);
      const authMap = new Map(authUsers.map((u) => [u.id, u]));

      return (profiles ?? []).map((p) => {
        const r = roleMap.get(p.user_id);
        const auth = authMap.get(p.user_id);
        return {
          user_id: p.user_id,
          email: auth?.email ?? "",
          display_name: p.display_name,
          role: (r?.role as AppRole) ?? null,
          role_id: r?.id ?? null,
          created_at: auth?.created_at ?? null,
        } satisfies AdminUser;
      });
    },
  });

  const assignRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
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

  const resetPassword = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-user-management",
        { body: { action: "reset-password", email } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
  });

  return { users, isLoading, error, assignRole, removeRole, resetPassword };
};
