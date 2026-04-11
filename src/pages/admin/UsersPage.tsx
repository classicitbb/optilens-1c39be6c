import { useState, useMemo, Fragment } from "react";
import { callAdminUserManagement } from "@/features/admin/api/adminUserManagement";
import { useAdminUsers, type AdminUser } from "@/hooks/useAdminUsers";
import type { AppRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/contexts/AdminRoleContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Edit2, KeyRound, Search, Check, X, Lock, Mail, Eye } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import CustomerPricingPanel from "@/components/admin/CustomerPricingPanel";

const ROLES: AppRole[] = ["admin", "operator", "viewer", "customer"];

const roleBadgeStyle: Record<string, { bg: string; color: string }> = {
  admin: { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(var(--admin-destructive))" },
  operator: { bg: "hsl(var(--admin-accent) / 0.12)", color: "hsl(var(--admin-accent))" },
  viewer: { bg: "hsl(var(--admin-muted-fg) / 0.12)", color: "hsl(var(--admin-muted-fg))" },
  customer: { bg: "hsl(var(--admin-success) / 0.12)", color: "hsl(var(--admin-success))" },
};

const UsersPage = () => {
  const { users, isLoading, assignRole, removeRole, resetPassword, inviteUser, createUser } = useAdminUsers();
  const { realRole, startImpersonation } = useAdminRole();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("viewer");
  const [search, setSearch] = useState("");
  
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  // Inline name editing
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Password dialog
  const [pwDialogUser, setPwDialogUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [settingPw, setSettingPw] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createName, setCreateName] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.display_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleAssign = async (userId: string, role: AppRole) => {
    try {
      await assignRole.mutateAsync({ userId, role });
      setEditingUser(null);
      toast({ title: "Role updated", description: `User role set to ${role}.` });
    } catch {
      toast({ title: "Error", description: "Failed to update role.", variant: "destructive" });
    }
  };

  const handleRemove = async (user: AdminUser) => {
    if (!user.role_id) return;
    try {
      await removeRole.mutateAsync(user.role_id);
      toast({ title: "Role removed", description: "User role has been removed." });
    } catch {
      toast({ title: "Error", description: "Failed to remove role.", variant: "destructive" });
    }
  };

  const handleResetPassword = async (user: AdminUser) => {
    if (!user.email) {
      toast({ title: "Error", description: "No email available for this user.", variant: "destructive" });
      return;
    }
    try {
      await resetPassword.mutateAsync(user.email);
      toast({ title: "Password reset sent", description: `Recovery email sent to ${user.email}.` });
    } catch {
      toast({ title: "Error", description: "Failed to send password reset.", variant: "destructive" });
    }
  };

  const startEditName = (user: AdminUser) => {
    setEditingName(user.user_id);
    setNameValue(user.display_name ?? "");
  };

  const saveDisplayName = async (userId: string) => {
    setSavingName(true);
    try {
      const { error } = await (supabase.from("profiles") as any)
        .upsert({ user_id: userId, display_name: nameValue || null }, { onConflict: "user_id" });
      if (error) throw error;
      toast({ title: "Name updated" });
      setEditingName(null);
      // Force refetch
      window.location.reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingName(false);
    }
  };

  const handleSetPassword = async () => {
    if (!pwDialogUser || !newPassword || newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    setSettingPw(true);
    try {
      await callAdminUserManagement({
        action: "set-password",
        userId: pwDialogUser.user_id,
        password: newPassword,
      });
      toast({ title: "Password set", description: `Password updated for ${pwDialogUser.email || pwDialogUser.display_name}.` });
      setPwDialogUser(null);
      setNewPassword("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSettingPw(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--admin-accent))] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <AdminPageHeader icon={Shield} title="User Management" />
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => { setInviteEmail(""); setInviteOpen(true); }}>
            <Mail className="h-3.5 w-3.5" />
            Invite
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => { setCreateEmail(""); setCreatePassword(""); setCreateName(""); setCreateOpen(true); }}>
            <UserPlus className="h-3.5 w-3.5" />
            Add User
          </Button>
          <span className="text-xs ml-2 text-[hsl(var(--admin-muted-fg))]">
            {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--admin-muted-fg))]" />
        <Input
          placeholder="Search by name, email or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <div className="border rounded border-[hsl(var(--admin-table-border))] bg-[hsl(var(--admin-table-surface))]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[hsl(var(--admin-table-border))] bg-[hsl(var(--admin-table-header-bg))]">
              <th className="text-left px-3 py-2 font-medium text-xs text-[hsl(var(--admin-table-muted-fg))]">User</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-[hsl(var(--admin-table-muted-fg))]">Email</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-[hsl(var(--admin-table-muted-fg))]">Role</th>
              <th className="text-left px-3 py-2 font-medium text-xs text-[hsl(var(--admin-table-muted-fg))]">Created</th>
              <th className="text-right px-3 py-2 font-medium text-xs w-44 text-[hsl(var(--admin-table-muted-fg))]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user, idx) => (
              <Fragment key={user.user_id}>
                <tr className={`border-b last:border-b-0 border-[hsl(var(--admin-table-border))] ${idx % 2 === 0 ? "bg-[hsl(var(--admin-table-row-even))]" : "bg-[hsl(var(--admin-table-row-odd))]"}`}>
                  <td className="px-3 py-2">
                    {editingName === user.user_id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          className="h-7 text-xs w-36"
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") saveDisplayName(user.user_id); if (e.key === "Escape") setEditingName(null); }}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => saveDisplayName(user.user_id)} disabled={savingName}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingName(null)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        className="text-[13px] font-medium hover:underline cursor-pointer text-left text-[hsl(var(--admin-table-fg))]"
                        onClick={() => startEditName(user)}
                        title="Click to edit name"
                      >
                        {user.display_name || "Unnamed user"}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-[hsl(var(--admin-table-muted-fg))]">
                      {user.email || <span className="italic opacity-60">{user.user_id.slice(0, 8)}…</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {editingUser === user.user_id ? (
                      <div className="flex items-center gap-2">
                        <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-7 text-xs px-3" onClick={() => handleAssign(user.user_id, selectedRole)} disabled={assignRole.isPending}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingUser(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : user.role ? (
                      <Badge
                        className="text-[10px] px-1.5 py-0 h-5 font-medium border-0"
                        style={{ background: roleBadgeStyle[user.role]?.bg, color: roleBadgeStyle[user.role]?.color }}
                      >
                        {user.role}
                      </Badge>
                    ) : (
                      <span className="text-xs italic text-[hsl(var(--admin-muted-fg))]">No role</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-[hsl(var(--admin-table-muted-fg))]">
                      {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editingUser !== user.user_id && (
                      <div className="flex items-center justify-end gap-1">
                        {realRole === "admin" && user.role && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" title={`Preview as ${user.display_name || user.email}`}
                            onClick={() => {
                              startImpersonation(user.role!, user.display_name || user.email || user.role!);
                              toast({ title: "Impersonating", description: `Now viewing as ${user.role} role.` });
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Set password" onClick={() => { setPwDialogUser(user); setNewPassword(""); }}>
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Send password reset email" onClick={() => handleResetPassword(user)} disabled={resetPassword.isPending || !user.email}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={user.role ? "Change role" : "Assign role"} onClick={() => { setSelectedRole(user.role ?? "viewer"); setEditingUser(user.user_id); }}>
                          {user.role ? <Edit2 className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                        </Button>
                        {user.role === "customer" && (
                          <Button variant="ghost" size="icon" title="Manage pricelists" onClick={() => setSelectedCustomer(selectedCustomer === user.user_id ? null : user.user_id)} className={`h-7 w-7 ${selectedCustomer === user.user_id ? "text-[hsl(var(--admin-accent))]" : ""}`}>
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {user.role_id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Remove role" onClick={() => handleRemove(user)} disabled={removeRole.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
                {selectedCustomer === user.user_id && (
                  <tr>
                    <td colSpan={5} className="px-3 py-3 bg-[hsl(var(--admin-table-header-bg))]">
                      <CustomerPricingPanel userId={selectedCustomer} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-xs text-[hsl(var(--admin-muted-fg))]">
                  {search ? "No users match your search." : "No users found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Set Password Dialog */}
      <Dialog open={!!pwDialogUser} onOpenChange={() => setPwDialogUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-[hsl(var(--admin-accent))]" />
              Set Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-[hsl(var(--admin-muted-fg))]">
              Set a new password for <strong>{pwDialogUser?.display_name || pwDialogUser?.email || "this user"}</strong>.
            </p>
            <Input
              type="password"
              placeholder="New password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPwDialogUser(null)}>Cancel</Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={handleSetPassword}
              disabled={settingPw || newPassword.length < 8}
            >
              {settingPw ? "Setting…" : "Set Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-[hsl(var(--admin-accent))]" />
              Invite User by Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-[hsl(var(--admin-muted-fg))]">
              Send an invitation email. The user will receive a link to set their password and sign in.
            </p>
            <Input
              type="email"
              placeholder="user@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={inviteUser.isPending || !inviteEmail.includes("@")}
              onClick={async () => {
                try {
                  await inviteUser.mutateAsync(inviteEmail);
                  toast({ title: "Invitation sent", description: `Invite email sent to ${inviteEmail}.` });
                  setInviteOpen(false);
                } catch {
                  toast({ title: "Error", description: "Failed to send invitation.", variant: "destructive" });
                }
              }}
            >
              {inviteUser.isPending ? "Sending…" : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-[hsl(var(--admin-accent))]" />
              Create User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-[hsl(var(--admin-muted-fg))]">
              Create a new user account with a password. The user can sign in immediately.
            </p>
            <Input
              type="text"
              placeholder="Display name (optional)"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="h-8 text-xs"
              autoFocus
            />
            <Input
              type="email"
              placeholder="Email address"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              className="h-8 text-xs"
            />
            <Input
              type="password"
              placeholder="Password (min 8 characters)"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={createUser.isPending || !createEmail.includes("@") || createPassword.length < 8}
              onClick={async () => {
                try {
                  await createUser.mutateAsync({ email: createEmail, password: createPassword, displayName: createName || undefined });
                  toast({ title: "User created", description: `Account created for ${createEmail}.` });
                  setCreateOpen(false);
                } catch {
                  toast({ title: "Error", description: "Failed to create user.", variant: "destructive" });
                }
              }}
            >
              {createUser.isPending ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersPage;
