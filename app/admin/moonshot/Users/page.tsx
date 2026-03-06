"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMoonshotStore } from "../lib/store";

export default function UsersPage() {
  const { users, addUser, deleteUser } = useMoonshotStore();
  const [email, setEmail] = useState("");

  return (
    <Card>
      <CardHeader><CardTitle>Seats & Invites</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="invite@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button onClick={() => { if (!email) return; addUser({ name: email.split("@")[0], role: "Member", avatar: email.slice(0, 2).toUpperCase(), seatsUsed: 1, invitedEmail: email }); setEmail(""); }}>Invite</Button>
        </div>
        {users.map((u) => <div key={u.id} className="border rounded p-3 flex justify-between"><div>{u.name} · {u.role}</div><Button size="sm" variant="destructive" onClick={() => deleteUser(u.id)}>Remove</Button></div>)}
      </CardContent>
    </Card>
  );
}
