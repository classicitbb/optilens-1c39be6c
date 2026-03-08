import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpDown, Pencil, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";
import type { MoonshotUser } from "@/features/admin/moonshot/lib/types";

type SortKey = "name" | "seat" | "supervisor" | "invite";

const invitationTone: Record<MoonshotUser["invitation"]["status"], "secondary" | "outline" | "default"> = {
  pending: "secondary",
  sent: "outline",
  accepted: "default",
};

const userRoles = ["Admin", "Integrator", "Visionary", "Manager", "Member"];

export default function MoonshotUsersPage() {
  const { users, seats, addUser, updateUser, deleteUser } = useMoonshotStore();
  const [query, setQuery] = useState("");
  const [seatFilter, setSeatFilter] = useState("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const [inviteFilter, setInviteFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [inviteEmail, setInviteEmail] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const seatsById = useMemo(() => new Map(seats.map((s) => [s.id, s])), [seats]);

  const seatUsage = useMemo(
    () =>
      seats.map((seat) => {
        const used = users.filter((u) => u.seatIds.includes(seat.id)).length;
        return { ...seat, used, available: Math.max(0, seat.capacity - used) };
      }),
    [seats, users],
  );

  const filteredUsers = useMemo(() => {
    const next = users.filter((u) => {
      const textMatch = [u.name, u.email, u.role].join(" ").toLowerCase().includes(query.trim().toLowerCase());
      const seatMatch = seatFilter === "all" || u.seatIds.includes(seatFilter);
      const supervisorMatch = supervisorFilter === "all" || u.supervisorId === supervisorFilter;
      const inviteMatch = inviteFilter === "all" || u.invitation.status === inviteFilter;
      return textMatch && seatMatch && supervisorMatch && inviteMatch;
    });

    next.sort((a, b) => {
      const seatA = a.seatIds.map((id) => seatsById.get(id)?.name ?? "").join(", ");
      const seatB = b.seatIds.map((id) => seatsById.get(id)?.name ?? "").join(", ");
      const supA = usersById.get(a.supervisorId ?? "")?.name ?? "";
      const supB = usersById.get(b.supervisorId ?? "")?.name ?? "";
      const value =
        sortKey === "name"
          ? a.name.localeCompare(b.name)
          : sortKey === "seat"
            ? seatA.localeCompare(seatB)
            : sortKey === "supervisor"
              ? supA.localeCompare(supB)
              : a.invitation.status.localeCompare(b.invitation.status);
      return sortDirection === "asc" ? value : value * -1;
    });

    return next;
  }, [inviteFilter, query, seatFilter, seatsById, sortDirection, sortKey, supervisorFilter, users, usersById]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const inviteUser = () => {
    if (!inviteEmail.trim()) return;
    const now = new Date().toISOString();
    addUser({
      name: inviteEmail.split("@")[0],
      email: inviteEmail,
      role: "Member",
      avatar: inviteEmail.slice(0, 2).toUpperCase(),
      seatsUsed: 0,
      seatIds: [],
      status: "active",
      invitation: { status: "pending", pendingAt: now },
    });
    setInviteEmail("");
  };

  const editingUser = users.find((u) => u.id === editingUserId);

  return (
    <div className="space-y-4">
      {/* Seat Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>Seat Inventory</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {seatUsage.map((seat) => (
            <div key={seat.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{seat.name}</p>
              <p className="text-muted-foreground">{seat.department}</p>
              <Badge className="mt-2" variant="outline">
                {seat.seatType}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                Capacity {seat.used}/{seat.capacity} · Available {seat.available}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* User Table */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-6">
            <Input className="md:col-span-2" placeholder="Search name, email, role..." value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={seatFilter} onValueChange={setSeatFilter}>
              <SelectTrigger><SelectValue placeholder="Seat" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All seats</SelectItem>
                {seats.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger><SelectValue placeholder="Supervisor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All supervisors</SelectItem>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={inviteFilter} onValueChange={setInviteFilter}>
              <SelectTrigger><SelectValue placeholder="Invite status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All invites</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="invite@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
              <Button onClick={inviteUser}><UserPlus className="mr-2 h-4 w-4" />Invite</Button>
            </div>
          </div>

          <div className="overflow-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2"><button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2"><button onClick={() => toggleSort("seat")} className="inline-flex items-center gap-1">Seats <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-3 py-2"><button onClick={() => toggleSort("supervisor")} className="inline-flex items-center gap-1">Supervisor <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-3 py-2"><button onClick={() => toggleSort("invite")} className="inline-flex items-center gap-1">Invite <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{u.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {u.seatIds.length > 0
                          ? u.seatIds.map((id) => <Badge key={id} variant="outline">{seatsById.get(id)?.name ?? id}</Badge>)
                          : <Badge variant="secondary">Unassigned</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2">{usersById.get(u.supervisorId ?? "")?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={invitationTone[u.invitation.status]}>{u.invitation.status}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(u.invitation.pendingAt), { addSuffix: true })}</p>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingUserId(u.id)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id)}><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={editingUser.name} onChange={(e) => updateUser(editingUser.id, { name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={editingUser.email} onChange={(e) => updateUser(editingUser.id, { email: e.target.value })} /></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={editingUser.role} onValueChange={(v) => updateUser(editingUser.id, { role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{userRoles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editingUser.status} onValueChange={(v: "active" | "inactive") => updateUser(editingUser.id, { status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Supervisor</Label>
                <Select value={editingUser.supervisorId ?? "none"} onValueChange={(v) => updateUser(editingUser.id, { supervisorId: v === "none" ? undefined : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supervisor</SelectItem>
                    {users.filter((u) => u.id !== editingUser.id).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Invitation status</Label>
                <Select
                  value={editingUser.invitation.status}
                  onValueChange={(v: "pending" | "sent" | "accepted") =>
                    updateUser(editingUser.id, {
                      invitation:
                        v === "pending"
                          ? { ...editingUser.invitation, status: v, sentAt: undefined, acceptedAt: undefined }
                          : v === "sent"
                            ? { ...editingUser.invitation, status: v, sentAt: new Date().toISOString(), acceptedAt: undefined }
                            : { ...editingUser.invitation, status: v, acceptedAt: new Date().toISOString() },
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="accepted">Accepted</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Seat assignment</Label>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-2">
                  {seats.map((seat) => {
                    const checked = editingUser.seatIds.includes(seat.id);
                    return (
                      <label key={seat.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) =>
                            updateUser(editingUser.id, {
                              seatIds: c ? [...editingUser.seatIds, seat.id] : editingUser.seatIds.filter((id) => id !== seat.id),
                            })
                          }
                        />
                        {seat.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setEditingUserId(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
