"use client";

import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpDown, Pencil, Trash2, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMoonshotStore } from "../lib/store";
import { MoonshotUser } from "../lib/types";

type SortKey = "name" | "seat" | "supervisor" | "invite";

const invitationTone: Record<MoonshotUser["invitation"]["status"], "secondary" | "outline" | "default"> = {
  pending: "secondary",
  sent: "outline",
  accepted: "default",
};

const userRoles = ["Admin", "Integrator", "Visionary", "Manager", "Member"];

export default function UsersPage() {
  const { users, seats, addUser, updateUser, deleteUser } = useMoonshotStore();
  const [query, setQuery] = useState("");
  const [seatFilter, setSeatFilter] = useState("all");
  const [supervisorFilter, setSupervisorFilter] = useState("all");
  const [inviteFilter, setInviteFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [inviteEmail, setInviteEmail] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const seatsById = useMemo(() => new Map(seats.map((seat) => [seat.id, seat])), [seats]);

  const seatUsage = useMemo(
    () =>
      seats.map((seat) => {
        const used = users.filter((user) => user.seatIds.includes(seat.id)).length;
        return { ...seat, used, available: Math.max(0, seat.capacity - used) };
      }),
    [seats, users],
  );

  const filteredUsers = useMemo(() => {
    const next = users.filter((user) => {
      const textMatch = [user.name, user.email, user.role].join(" ").toLowerCase().includes(query.trim().toLowerCase());
      const seatMatch = seatFilter === "all" || user.seatIds.includes(seatFilter);
      const supervisorMatch = supervisorFilter === "all" || user.supervisorId === supervisorFilter;
      const inviteMatch = inviteFilter === "all" || user.invitation.status === inviteFilter;
      return textMatch && seatMatch && supervisorMatch && inviteMatch;
    });

    next.sort((a, b) => {
      const seatA = a.seatIds.map((seatId) => seatsById.get(seatId)?.name ?? "").join(", ");
      const seatB = b.seatIds.map((seatId) => seatsById.get(seatId)?.name ?? "").join(", ");
      const supA = usersById.get(a.supervisorId ?? "")?.name ?? "";
      const supB = usersById.get(b.supervisorId ?? "")?.name ?? "";
      const inviteA = a.invitation.status;
      const inviteB = b.invitation.status;
      const value =
        sortKey === "name"
          ? a.name.localeCompare(b.name)
          : sortKey === "seat"
            ? seatA.localeCompare(seatB)
            : sortKey === "supervisor"
              ? supA.localeCompare(supB)
              : inviteA.localeCompare(inviteB);
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
      seatIds: [],
      status: "active",
      invitation: { status: "pending", pendingAt: now },
    });
    setInviteEmail("");
  };

  const editingUser = users.find((user) => user.id === editingUserId);

  return (
    <div className="space-y-4">
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
                {seats.map((seat) => <SelectItem key={seat.id} value={seat.id}>{seat.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger><SelectValue placeholder="Supervisor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All supervisors</SelectItem>
                {users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
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
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2"><button onClick={() => toggleSort("name")} className="inline-flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Seats</th>
                  <th className="px-3 py-2"><button onClick={() => toggleSort("supervisor")} className="inline-flex items-center gap-1">Supervisor <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-3 py-2"><button onClick={() => toggleSort("invite")} className="inline-flex items-center gap-1">Invite status <ArrowUpDown className="h-3 w-3" /></button></th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t align-top">
                    <td className="px-3 py-2 font-medium">{user.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{user.email}</td>
                    <td className="px-3 py-2">{user.role}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {user.seatIds.length > 0
                          ? user.seatIds.map((seatId) => <Badge key={seatId} variant="outline">{seatsById.get(seatId)?.name ?? seatId}</Badge>)
                          : <Badge variant="secondary">Unassigned</Badge>}
                      </div>
                    </td>
                    <td className="px-3 py-2">{usersById.get(user.supervisorId ?? "")?.name ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant={invitationTone[user.invitation.status]}>{user.invitation.status}</Badge>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNowStrict(new Date(user.invitation.pendingAt), { addSuffix: true })}</p>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingUserId(user.id)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteUser(user.id)}><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => !open && setEditingUserId(null)}>
        <DialogTrigger asChild><span /></DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          {editingUser ? (
            <div className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={editingUser.name} onChange={(e) => updateUser(editingUser.id, { name: e.target.value })} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={editingUser.email} onChange={(e) => updateUser(editingUser.id, { email: e.target.value })} /></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <Label>Role</Label>
                  <Select value={editingUser.role} onValueChange={(value) => updateUser(editingUser.id, { role: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{userRoles.map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editingUser.status} onValueChange={(value: "active" | "inactive") => updateUser(editingUser.id, { status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Supervisor</Label>
                <Select value={editingUser.supervisorId ?? "none"} onValueChange={(value) => updateUser(editingUser.id, { supervisorId: value === "none" ? undefined : value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No supervisor</SelectItem>
                    {users.filter((user) => user.id !== editingUser.id).map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Invitation status</Label>
                <Select
                  value={editingUser.invitation.status}
                  onValueChange={(value: "pending" | "sent" | "accepted") =>
                    updateUser(editingUser.id, {
                      invitation:
                        value === "pending"
                          ? { ...editingUser.invitation, status: value, pendingAt: editingUser.invitation.pendingAt || new Date().toISOString(), sentAt: undefined, acceptedAt: undefined }
                          : value === "sent"
                            ? { ...editingUser.invitation, status: value, sentAt: new Date().toISOString(), acceptedAt: undefined }
                            : { ...editingUser.invitation, status: value, acceptedAt: new Date().toISOString() },
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
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            updateUser(editingUser.id, {
                              seatIds: e.target.checked ? [...editingUser.seatIds, seat.id] : editingUser.seatIds.filter((id) => id !== seat.id),
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
          ) : null}
          <DialogFooter>
            <Button onClick={() => setEditingUserId(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
