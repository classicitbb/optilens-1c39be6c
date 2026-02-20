import { useState, useMemo, Fragment } from "react";
import { useAdminUsers, type AdminUser } from "@/hooks/useAdminUsers";
import type { AppRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Edit2, KeyRound, Search, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import PermissionGrid from "@/components/admin/PermissionGrid";
import CustomerPricingPanel from "@/components/admin/CustomerPricingPanel";

const ROLES: AppRole[] = ["admin", "operator", "viewer", "customer"];

const roleBadgeStyle: Record<string, {bg: string;color: string;}> = {
  admin: { bg: "hsl(0 72% 51% / 0.12)", color: "hsl(0 72% 51%)" },
  operator: { bg: "hsl(215 65% 50% / 0.12)", color: "hsl(215 65% 50%)" },
  viewer: { bg: "hsl(215 15% 50% / 0.12)", color: "hsl(215 15% 50%)" },
  customer: { bg: "hsl(150 60% 40% / 0.12)", color: "hsl(150 60% 40%)" }
};

const UsersPage = () => {
  const { users, isLoading, assignRole, removeRole, resetPassword } = useAdminUsers();
  const { toast } = useToast();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>("viewer");
  const [search, setSearch] = useState("");
  const [permOpen, setPermOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "hsl(215 65% 50%)", borderTopColor: "transparent" }} />
      </div>);

  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" style={{ color: "hsl(215 65% 50%)" }} />
          <h1 className="text-lg font-semibold" style={{ color: "hsl(215 30% 15%)" }}>User Management</h1>
        </div>
        <span className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
          {filtered.length} of {users.length} user{users.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Permission Grid Accordion */}
      <Collapsible open={permOpen} onOpenChange={setPermOpen}>
        <CollapsibleTrigger asChild>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium rounded border transition-colors"
            style={{
              borderColor: "hsl(215 15% 85%)",
              background: permOpen ? "hsl(215 65% 50% / 0.05)" : "hsl(210 20% 97%)",
              color: "hsl(215 30% 15%)"
            }}>

            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${permOpen ? "rotate-180" : ""}`} />
            Role Permissions Matrix
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <PermissionGrid />
        </CollapsibleContent>
      </Collapsible>

      <div className="relative py-[16px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm" />

      </div>

      <div className="border rounded" style={{ borderColor: "hsl(215 15% 85%)", background: "hsl(0 0% 100%)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "hsl(215 15% 90%)", background: "hsl(210 20% 97%)" }}>
              <th className="text-left px-3 py-2 font-medium text-xs" style={{ color: "hsl(215 15% 50%)" }}>User</th>
              <th className="text-left px-3 py-2 font-medium text-xs" style={{ color: "hsl(215 15% 50%)" }}>Email</th>
              <th className="text-left px-3 py-2 font-medium text-xs" style={{ color: "hsl(215 15% 50%)" }}>Role</th>
              <th className="text-left px-3 py-2 font-medium text-xs" style={{ color: "hsl(215 15% 50%)" }}>Created</th>
              <th className="text-right px-3 py-2 font-medium text-xs w-36" style={{ color: "hsl(215 15% 50%)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) =>
            <Fragment key={user.user_id}>
                <tr className="border-b last:border-b-0" style={{ borderColor: "hsl(215 15% 92%)" }}>
                  <td className="px-3 py-2">
                    <span className="text-[13px] font-medium" style={{ color: "hsl(215 30% 15%)" }}>
                      {user.display_name || "Unnamed user"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs" style={{ color: "hsl(215 15% 40%)" }}>
                      {user.email || <span className="italic" style={{ color: "hsl(215 15% 65%)" }}>{user.user_id.slice(0, 8)}…</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {editingUser === user.user_id ?
                  <div className="flex items-center gap-2">
                        <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) =>
                        <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                        )}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-7 text-xs px-3" onClick={() => handleAssign(user.user_id, selectedRole)} disabled={assignRole.isPending}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingUser(null)}>
                          Cancel
                        </Button>
                      </div> :
                  user.role ?
                  <Badge
                    className="text-[10px] px-1.5 py-0 h-5 font-medium border-0"
                    style={{ background: roleBadgeStyle[user.role]?.bg, color: roleBadgeStyle[user.role]?.color }}>

                        {user.role}
                      </Badge> :

                  <span className="text-xs italic" style={{ color: "hsl(215 15% 65%)" }}>No role</span>
                  }
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                      {user.created_at ? format(new Date(user.created_at), "dd MMM yyyy") : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editingUser !== user.user_id &&
                  <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Send password reset" onClick={() => handleResetPassword(user)} disabled={resetPassword.isPending || !user.email}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={user.role ? "Change role" : "Assign role"} onClick={() => {setSelectedRole(user.role ?? "viewer");setEditingUser(user.user_id);}}>
                          {user.role ? <Edit2 className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                        </Button>
                        {user.role === "customer" &&
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Manage pricelists" onClick={() => setSelectedCustomer(selectedCustomer === user.user_id ? null : user.user_id)} style={{ color: selectedCustomer === user.user_id ? "hsl(215 65% 50%)" : undefined }}>
                            <Shield className="h-3.5 w-3.5" />
                          </Button>
                    }
                        {user.role_id &&
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Remove role" onClick={() => handleRemove(user)} disabled={removeRole.isPending}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                    }
                      </div>
                  }
                  </td>
                </tr>
                {selectedCustomer === user.user_id &&
              <tr>
                    <td colSpan={5} className="px-3 py-3" style={{ background: "hsl(210 20% 97%)" }}>
                      <CustomerPricingPanel userId={selectedCustomer} />
                    </td>
                  </tr>
              }
              </Fragment>
            )}
            {filtered.length === 0 &&
            <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-xs" style={{ color: "hsl(215 15% 50%)" }}>
                  {search ? "No users match your search." : "No users found."}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>);

};

export default UsersPage;