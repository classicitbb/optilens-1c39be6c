import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { callAdminUserManagement } from "@/features/admin/api/adminUserManagement";
import { useUserRole, type AppRole } from "@/hooks/useUserRole";
import { validateAdminFunctionRequest } from "@/features/admin/security/adminFunctionPolicy";

export interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  full_name: string | null;
  phone: string | null;
  organization_name: string | null;
  avatar_url: string | null;
  role: AppRole | null;
  role_id: string | null;
  created_at: string | null;
  email_confirmed_at: string | null;
}

export const useAdminUsers = () => {
  const qc = useQueryClient();
  const { role } = useUserRole();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
        (supabase.from("profiles") as any)
          .select("user_id, display_name, full_name, email, phone, organization_name, avatar_url"),
        (supabase.from("user_roles") as any)
          .select("id, user_id, role"),
      ]);
      if (pErr) throw pErr;
      if (rErr) throw rErr;

      let authUsers: { id: string; email: string; created_at: string; email_confirmed_at: string | null }[] = [];
      try {
        const data = await callAdminUserManagement<{ id: string; email: string; created_at: string; email_confirmed_at: string | null }[]>(
          validateAdminFunctionRequest({ actorRole: role, action: "list-users" })
        );
        if (Array.isArray(data)) authUsers = data;
      } catch {
        // Edge function may not be deployed yet; continue without emails
      }

      const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.user_id, profile]));
      const roleMap = new Map((roles ?? []).map((r: any) => [r.user_id, r]) ?? []);
      const authMap = new Map(authUsers.map((user) => [user.id, user]));
      const userIds = new Set<string>([
        ...Array.from(profileMap.keys() as Iterable<string>),
        ...Array.from(roleMap.keys() as Iterable<string>),
        ...Array.from(authMap.keys()),
      ]);

      return Array.from(userIds).map((userId) => {
        const profile = profileMap.get(userId) as any;
        const role = roleMap.get(userId) as any;
        const auth = authMap.get(userId);
        return {
          user_id: userId,
          email: auth?.email ?? profile?.email ?? "",
          display_name: profile?.display_name ?? null,
          full_name: profile?.full_name ?? null,
          phone: profile?.phone ?? null,
          organization_name: profile?.organization_name ?? null,
          avatar_url: profile?.avatar_url ?? null,
          role: (role?.role as AppRole) ?? null,
          role_id: role?.id ?? null,
          created_at: auth?.created_at ?? null,
          email_confirmed_at: auth?.email_confirmed_at ?? null,
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
        const { error } = await (supabase.from("user_roles") as any)
          .update({ role })
          .eq("id", existing.role_id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("user_roles") as any)
          .insert({ user_id: userId, role });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await (supabase.from("user_roles") as any)
        .delete()
        .eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const resetPassword = useMutation({
    mutationFn: async (email: string) => {
      await callAdminUserManagement(
        validateAdminFunctionRequest({ actorRole: role, action: "reset-password", payload: { email } })
      );
    },
  });

  const inviteUser = useMutation({
    mutationFn: async ({ email, customerId, contactId, displayName, sendEmail }: { email: string; customerId?: number; contactId?: string; displayName?: string; sendEmail?: boolean }) => {
      return callAdminUserManagement<{ success: boolean; alreadyExisted?: boolean; userId?: string; actionLink?: string }>(
        validateAdminFunctionRequest({ actorRole: role, action: "invite-user", payload: { email, customerId, contactId, displayName, sendEmail } })
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const createUser = useMutation({
    mutationFn: async ({ email, password, displayName, customerId, contactId, sendWelcomeEmail }: { email: string; password: string; displayName?: string; customerId?: number; contactId?: string; sendWelcomeEmail?: boolean }) => {
      return callAdminUserManagement<{ success: boolean; userId?: string }>(
        validateAdminFunctionRequest({ actorRole: role, action: "create-user", payload: { email, password, displayName, customerId, contactId, sendWelcomeEmail } })
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const linkCustomerPortalAccount = useMutation({
    mutationFn: async ({ userId, customerId, contactId, displayName }: { userId: string; customerId: number; contactId?: string; displayName?: string }) => {
      await callAdminUserManagement(
        validateAdminFunctionRequest({ actorRole: role, action: "link-customer-portal-account", payload: { userId, customerId, contactId, displayName } })
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const confirmPortalStaff = useMutation({
    mutationFn: async ({ userId, customerId }: { userId: string; customerId: number }) => {
      await callAdminUserManagement(
        validateAdminFunctionRequest({ actorRole: role, action: "confirm-portal-staff", payload: { userId, customerId } })
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const archivePortalProfile = useMutation({
    mutationFn: async ({ userId, archived }: { userId: string; archived: boolean }) => {
      await callAdminUserManagement(
        validateAdminFunctionRequest({ actorRole: role, action: "archive-portal-profile", payload: { userId, archived } })
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const setLoginDisabled = useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) => {
      await callAdminUserManagement(
        validateAdminFunctionRequest({ actorRole: role, action: "set-login-disabled", payload: { userId, disabled } })
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const emulatePortalUser = useMutation({
    mutationFn: async (userId: string) => {
      return callAdminUserManagement<{
        success: boolean;
        userId: string;
        email: string;
        tokenHash: string;
        verificationType: "magiclink" | "email";
      }>(
        validateAdminFunctionRequest({ actorRole: role, action: "emulate-portal-user", payload: { userId } })
      );
    },
  });

  return { users, isLoading, error, assignRole, removeRole, resetPassword, inviteUser, createUser, linkCustomerPortalAccount, confirmPortalStaff, archivePortalProfile, setLoginDisabled, emulatePortalUser };
};
