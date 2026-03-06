import { format } from "date-fns";
import { Clock3, Plus } from "lucide-react";
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MetricsTable } from "@/features/admin/moonshot/components/MetricsTable";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";

export default function MoonshotMeetingDetailPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const {
    meetings, users, rocks, todos, issues,
    addTodo, updateTodo, updateRock, addIssue, updateIssue, updateMeeting, addAgendaSection, endMeeting,
  } = useMoonshotStore();
  const meeting = meetings.find((m) => m.id === meetingId);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [newSection, setNewSection] = useState("");
  const [newTodo, setNewTodo] = useState("");
  const [newIssue, setNewIssue] = useState("");

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (meeting && !activeSectionId) setActiveSectionId(meeting.agenda[0]?.id ?? null);
  }, [meeting, activeSectionId]);

  const activeSection = meeting?.agenda.find((a) => a.id === activeSectionId) ?? meeting?.agenda[0];

  const remaining = useMemo(() => {
    if (!activeSection) return 0;
    const target = activeSection.minutes * 60;
    return Math.max(0, target - elapsed);
  }, [activeSection, elapsed]);

  if (!meeting) return <p>Meeting not found.</p>;

  const sectionKey = activeSection?.title.toLowerCase();

  return (
    <div className="flex gap-4">
      <aside className="w-[320px] shrink-0 rounded-xl border bg-card h-[calc(100vh-120px)] sticky top-20 p-3 flex flex-col">
        <h3 className="text-2xl font-bold mb-3">Agenda</h3>
        <Button className="bg-teal-500 hover:bg-teal-600 text-white mb-3" onClick={() => {
          setRunning(true);
          updateMeeting(meeting.id, { status: "In Progress" });
        }}>Start Meeting</Button>
        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Clock3 className="h-3.5 w-3.5" />Running timer: {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</div>

        <div className="space-y-1 overflow-auto flex-1">
          {meeting.agenda.map((section) => (
            <button key={section.id} onClick={() => { setActiveSectionId(section.id); setElapsed(0); }} className={`w-full rounded-md px-3 py-2 text-left flex items-center justify-between text-sm ${activeSectionId === section.id ? "bg-teal-50 text-teal-800" : "hover:bg-muted"}`}>
              <span>{section.title}</span><span>{section.minutes}m</span>
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <Input placeholder="Add section" value={newSection} onChange={(e) => setNewSection(e.target.value)} />
          <Button size="icon" variant="outline" onClick={() => {
            if (!newSection) return;
            addAgendaSection(meeting.id, { title: newSection, minutes: 5 });
            setNewSection("");
          }}><Plus className="h-4 w-4" /></Button>
        </div>
      </aside>

      <main className="flex-1 space-y-4">
        <Card><CardHeader><CardTitle>{meeting.title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{meeting.summary || "Last meeting's summary will appear here."}</CardContent></Card>

        {sectionKey?.includes("check") && (
          <Card>
            <CardHeader><CardTitle>Check-in</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border bg-teal-50 p-3 text-sm">{meeting.checkInPrompt}</div>
              <Textarea placeholder="Share good news..." value={meeting.checkInResponse} onChange={(e) => updateMeeting(meeting.id, { checkInResponse: e.target.value, notes: `${meeting.notes}\nCheck-in: ${e.target.value}` })} />
              <div className="flex gap-2">{users.filter((u) => meeting.attendeeIds.includes(u.id)).map((u) => <Badge key={u.id} variant="outline">{u.name}</Badge>)}</div>
            </CardContent>
          </Card>
        )}

        {sectionKey?.includes("metric") && (
          <Card>
            <CardHeader><CardTitle>Metrics</CardTitle></CardHeader>
            <CardContent className="overflow-auto">
              <MetricsTable frequency="weekly" compact />
            </CardContent>
          </Card>
        )}

        {sectionKey?.includes("goal") && (
          <Card>
            <CardHeader><CardTitle>Goals (Rocks)</CardTitle></CardHeader>
            <CardContent className="space-y-2">{rocks.map((r) => <div key={r.id} className="border rounded p-2 flex items-center justify-between"><span>{r.title}</span><Select value={r.status} onValueChange={(v: "On Track" | "At Risk" | "Off Track" | "Completed") => updateRock(r.id, { status: v })}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="On Track">On Track</SelectItem><SelectItem value="At Risk">At Risk</SelectItem><SelectItem value="Off Track">Off Track</SelectItem><SelectItem value="Completed">Completed</SelectItem></SelectContent></Select></div>)}</CardContent>
          </Card>
        )}

        {sectionKey?.includes("headline") && (
          <Card>
            <CardHeader><CardTitle>Headlines</CardTitle></CardHeader>
            <CardContent><Textarea placeholder="Capture major headlines and blockers..." value={meeting.notes} onChange={(e) => updateMeeting(meeting.id, { notes: e.target.value })} /></CardContent>
          </Card>
        )}

        {sectionKey?.includes("to-do") && (
          <Card>
            <CardHeader><CardTitle>To-Dos</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2"><Input placeholder="Add a to-do" value={newTodo} onChange={(e) => setNewTodo(e.target.value)} /><Button onClick={() => {
                if (!newTodo) return;
                addTodo({ title: newTodo, owner: "Classic", dueDate: format(new Date(), "yyyy-MM-dd"), completed: false });
                setNewTodo("");
              }}>Add</Button></div>
              {todos.map((t) => <div key={t.id} className="border rounded p-2 flex items-center justify-between"><label className="flex items-center gap-2"><input type="checkbox" checked={t.completed} onChange={(e) => updateTodo(t.id, { completed: e.target.checked })} />{t.title}</label><span className="text-xs text-muted-foreground">{t.owner}</span></div>)}
            </CardContent>
          </Card>
        )}

        {sectionKey?.includes("issue") && (
          <Card>
            <CardHeader><CardTitle>Issues (IDS)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2"><Input placeholder="Identify issue" value={newIssue} onChange={(e) => setNewIssue(e.target.value)} /><Button onClick={() => {
                if (!newIssue) return;
                addIssue({ title: newIssue, owner: "Classic", priority: "Medium", status: "Open" });
                setNewIssue("");
              }}>Add</Button></div>
              {issues.map((issue) => <div key={issue.id} className="border rounded p-2 flex items-center justify-between gap-2"><div><p>{issue.title}</p><p className="text-xs text-muted-foreground">{issue.priority}</p></div><Select value={issue.status} onValueChange={(v: "Open" | "In Progress" | "Resolved") => updateIssue(issue.id, { status: v })}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Identify</SelectItem><SelectItem value="In Progress">Discuss</SelectItem><SelectItem value="Resolved">Solve</SelectItem></SelectContent></Select></div>)}
            </CardContent>
          </Card>
        )}

        {sectionKey?.includes("wrap") && (
          <Card>
            <CardHeader><CardTitle>Wrap-up</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea placeholder="Auto-save meeting notes" value={meeting.notes} onChange={(e) => updateMeeting(meeting.id, { notes: e.target.value })} />
              <Button variant="destructive" onClick={() => endMeeting(meeting.id)}>End Meeting & Generate Summary</Button>
              {meeting.summary ? <div className="rounded-md border bg-emerald-50 p-3 text-sm">{meeting.summary}</div> : null}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
