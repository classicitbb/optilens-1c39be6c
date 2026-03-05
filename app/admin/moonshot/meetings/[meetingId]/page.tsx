"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "../../lib/store";

export default function MeetingDetailPage() {
  const params = useParams<{ meetingId: string }>();
  const { meetings, updateMeeting } = useMoonshotStore();
  const meeting = meetings.find((m) => m.id === params.meetingId);

  if (!meeting) return <p>Meeting not found.</p>;

  return (
    <Card>
      <CardHeader><CardTitle>Edit Meeting</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Input value={meeting.title} onChange={(e) => updateMeeting(meeting.id, { title: e.target.value })} />
        <Input type="date" value={meeting.date} onChange={(e) => updateMeeting(meeting.id, { date: e.target.value })} />
        <Textarea value={meeting.notes} onChange={(e) => updateMeeting(meeting.id, { notes: e.target.value })} />
        <Button onClick={() => updateMeeting(meeting.id, { status: "Completed" })}>Mark Complete</Button>
      </CardContent>
    </Card>
  );
}
