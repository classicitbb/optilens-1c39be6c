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
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, display_name"),
        supabase
          .from("user_roles")
          .select("id, user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

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

      const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      const roleMap = new Map(roles?.map((r) => [r.user_id, r]) ?? []);
      const authMap = new Map(authUsers.map((user) => [user.id, user]));
      const userIds = new Set<string>([
        ...Array.from(profileMap.keys()),
        ...Array.from(roleMap.keys()),
        ...Array.from(authMap.keys()),
      ]);

      return Array.from(userIds).map((userId) => {
        const profile = profileMap.get(userId);
        const role = roleMap.get(userId);
        const auth = authMap.get(userId);
        return {
          user_id: userId,
          email: auth?.email ?? "",
          display_name: profile?.display_name ?? null,
          role: (role?.role as AppRole) ?? null,
          role_id: role?.id ?? null,
          created_at: auth?.created_at ?? null,
        } satisfies AdminUser;
      }).sort((left, right) => {
        const leftLabel = (left.display_name || left.email || left.user_id).toLowerCase();
        const rightLabel = (right.display_name || right.email || right.user_id).toLowerCase();
        return leftLabel.localeCompare(rightLabel);
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

  const inviteUser = useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-user-management",
        { body: { action: "invite-user", email } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const createUser = useMutation({
    mutationFn: async ({ email, password, displayName }: { email: string; password: string; displayName?: string }) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-user-management",
        { body: { action: "create-user", email, password, displayName } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return { users, isLoading, error, assignRole, removeRole, resetPassword, inviteUser, createUser };
};
