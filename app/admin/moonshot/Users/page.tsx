"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMoonshotStore } from "../lib/store";

export default function UsersPage() {
  const { users, orgChart, addUser, deleteUser } = useMoonshotStore();
  const [email, setEmail] = useState("");

  const seatsByUser = useMemo(() => {
    return orgChart.seats.reduce<Record<string, string[]>>((acc, seat) => {
      seat.assignedUserIds.forEach((userId) => {
        acc[userId] = [...(acc[userId] ?? []), seat.title];
      });
      return acc;
    }, {});
  }, [orgChart.seats]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seats & Invites</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="invite@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button
            onClick={() => {
              if (!email) return;
              addUser({ name: email.split("@")[0], role: "Member", avatar: email.slice(0, 2).toUpperCase(), seatsUsed: 0, invitedEmail: email });
              setEmail("");
            }}
          >
            Invite
          </Button>
        </div>
        {users.map((u) => (
          <div key={u.id} className="space-y-2 rounded border p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                {u.name} · {u.role}
              </div>
              <Button size="sm" variant="destructive" onClick={() => deleteUser(u.id)}>
                Remove
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(seatsByUser[u.id] ?? []).length > 0 ? (
                (seatsByUser[u.id] ?? []).map((seatTitle) => (
                  <Badge key={`${u.id}-${seatTitle}`} variant="outline">
                    {seatTitle}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary">No seats assigned</Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
