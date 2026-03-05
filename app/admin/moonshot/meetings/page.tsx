"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMoonshotStore } from "../lib/store";

export default function MeetingsPage() {
  const { meetings, addMeeting, deleteMeeting } = useMoonshotStore();
  const [filter, setFilter] = useState("");

  return (
    <Card>
      <CardHeader><CardTitle>Meetings</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input placeholder="Filter by title" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <Button onClick={() => addMeeting({ title: "New Sync", owner: "Classic", date: format(new Date(), "yyyy-MM-dd"), status: "Draft", notes: "" })}>Add</Button>
        </div>
        {meetings.filter((m) => m.title.toLowerCase().includes(filter.toLowerCase())).map((m) => (
          <div key={m.id} className="border rounded p-3 flex items-center justify-between gap-2">
            <div>
              <Link className="font-medium hover:underline" href={`/admin/moonshot/meetings/${m.id}`}>{m.title}</Link>
              <p className="text-xs text-muted-foreground">{m.date} · {m.status}</p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => deleteMeeting(m.id)}>Delete</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
