"use client";

import { format } from "date-fns";
import { CalendarDays, Plus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMoonshotStore } from "../lib/store";

export default function MeetingsPage() {
  const router = useRouter();
  const { meetings, users, addMeeting } = useMoonshotStore();
  const [title, setTitle] = useState("Weekly Leadership");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
  const [duration, setDuration] = useState(90);
  const [attendees, setAttendees] = useState<string[]>(["u1", "u2"]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Meetings</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Meeting</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Meeting</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1"><Label>Name</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-1"><Label>Frequency</Label><Select value={frequency} onValueChange={(v: "weekly" | "biweekly" | "monthly") => setFrequency(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="biweekly">Biweekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select></div>
              <div className="space-y-1"><Label>Duration (minutes)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value || 60))} /></div>
              <div className="space-y-2">
                <Label>Attendees</Label>
                <div className="grid grid-cols-2 gap-2">
                  {users.map((user) => (
                    <label key={user.id} className="border rounded-md px-2 py-1.5 flex items-center gap-2 text-sm">
                      <Checkbox checked={attendees.includes(user.id)} onCheckedChange={(checked) => setAttendees((prev) => checked ? [...prev, user.id] : prev.filter((x) => x !== user.id))} />
                      {user.name}
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={() => {
                addMeeting({
                  title,
                  owner: "Classic",
                  date: format(new Date(), "yyyy-MM-dd"),
                  status: "Scheduled",
                  notes: "",
                  frequency,
                  duration,
                  attendeeIds: attendees,
                });
              }}>Create Meeting</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {meetings.map((meeting) => {
          const attendeeList = users.filter((u) => meeting.attendeeIds.includes(u.id));
          return (
            <Card key={meeting.id} className="rounded-xl border bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{meeting.title}</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />Next: {format(new Date(meeting.date), "EEE, MMM d")}</div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize">{meeting.frequency}</Badge>
                  <span className="text-xs text-muted-foreground">{meeting.duration} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {attendeeList.slice(0, 4).map((u) => (
                      <Avatar key={u.id} className="h-8 w-8 border-2 border-white"><AvatarFallback>{u.avatar}</AvatarFallback></Avatar>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3.5 w-3.5" />{attendeeList.length} attendees</span>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => router.push(`/admin/moonshot/meetings/${meeting.id}`)}>Join</Button>
                  <Button variant="outline" className="flex-1" onClick={() => router.push(`/admin/moonshot/meetings/${meeting.id}`)}>Start Meeting</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
