"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMoonshotStore } from "../lib/store";

export default function IssuesPage() {
  const { issues, meetings, addIssue, updateIssue, deleteIssue } = useMoonshotStore();
  const [title, setTitle] = useState("");
  const [meetingId, setMeetingId] = useState(meetings[0]?.id ?? "");

  return (
    <Card className="rounded-xl border bg-white">
      <CardHeader><CardTitle>Issues (IDS)</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Identify issue" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={meetingId} onValueChange={setMeetingId}><SelectTrigger className="w-56"><SelectValue placeholder="Linked meeting" /></SelectTrigger><SelectContent>{meetings.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent></Select>
          <Button onClick={() => { if (!title) return; addIssue({ title, owner: "Classic", priority: "Medium", status: "Open", identified: title, discussed: "", solved: "", meetingId }); setTitle(""); }}>Add</Button>
        </div>

        {issues.map((issue) => {
          const linkedMeeting = meetings.find((m) => m.id === issue.meetingId);
          return (
            <div key={issue.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{issue.title}</p>
                <div className="flex items-center gap-2">
                  <Badge className={issue.priority === "High" ? "bg-red-100 text-red-700" : issue.priority === "Medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}>{issue.priority}</Badge>
                  <Select value={issue.status} onValueChange={(v: "Open" | "In Progress" | "Resolved") => updateIssue(issue.id, { status: v })}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Resolved">Solved</SelectItem></SelectContent></Select>
                  <Button size="sm" variant="destructive" onClick={() => deleteIssue(issue.id)}>Delete</Button>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <div><p className="text-xs mb-1 text-muted-foreground">Identify</p><Textarea value={issue.identified ?? ""} onChange={(e) => updateIssue(issue.id, { identified: e.target.value })} className="min-h-20" /></div>
                <div><p className="text-xs mb-1 text-muted-foreground">Discuss</p><Textarea value={issue.discussed ?? ""} onChange={(e) => updateIssue(issue.id, { discussed: e.target.value })} className="min-h-20" /></div>
                <div><p className="text-xs mb-1 text-muted-foreground">Solve</p><Textarea value={issue.solved ?? ""} onChange={(e) => updateIssue(issue.id, { solved: e.target.value })} className="min-h-20" /></div>
              </div>

              {linkedMeeting ? <Badge variant="outline">Linked: {linkedMeeting.title}</Badge> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
