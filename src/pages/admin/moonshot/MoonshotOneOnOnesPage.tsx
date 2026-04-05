import { FormEvent, useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMoonshotStore } from "@/features/admin/moonshot/lib/store";
import type { OneOnOneTemplate } from "@/features/admin/moonshot/lib/types";

const cadences: OneOnOneTemplate["cadence"][] = ["weekly", "biweekly", "monthly", "quarterly"];

export default function MoonshotOneOnOnesPage() {
  const users = useMoonshotStore((s) => s.users);
  const currentUser = useMoonshotStore((s) => s.currentUser);
  const oneOnOnes = useMoonshotStore((s) => s.oneOnOnes);
  const addOneOnOne = useMoonshotStore((s) => s.addOneOnOne);
  const updateOneOnOne = useMoonshotStore((s) => s.updateOneOnOne);
  const deleteOneOnOne = useMoonshotStore((s) => s.deleteOneOnOne);
  const addActionItem = useMoonshotStore((s) => s.addOneOnOneActionItem);
  const updateActionItem = useMoonshotStore((s) => s.updateOneOnOneActionItem);
  const deleteActionItem = useMoonshotStore((s) => s.deleteOneOnOneActionItem);

  const [selectedId, setSelectedId] = useState<string | null>(oneOnOnes[0]?.id ?? null);
  const [title, setTitle] = useState("");
  const [cadence, setCadence] = useState<OneOnOneTemplate["cadence"]>("weekly");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [agendaNotes, setAgendaNotes] = useState("");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [timeZone, setTimeZone] = useState("America/Asuncion");

  const selectedTemplate = useMemo(() => oneOnOnes.find((item) => item.id === selectedId) ?? null, [oneOnOnes, selectedId]);

  const createTemplate = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || participantIds.length < 2) return;
    addOneOnOne({
      title: title.trim(),
      cadence,
      participantIds,
      agendaNotes: agendaNotes.trim(),
      scheduleAnchorDate: new Date().toISOString().slice(0, 10),
      scheduleTime,
      timeZone,
      talkingPoints: [],
      privateNotes: "",
      sharedNotes: "",
      createdBy: currentUser?.id ?? users[0]?.id ?? "u1",
    });
    setTitle("");
    setCadence("weekly");
    setParticipantIds([]);
    setAgendaNotes("");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Tool links & help</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Button asChild size="sm" variant="outline"><Link to="/admin/moonshot/tools/org-chart">Go to Org Chart</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/admin/moonshot/tools/right-person-right-seat">Go to Right Person Right Seat</Link></Button>
          <Button asChild size="sm" variant="ghost"><Link to="/admin/moonshot/resources">Open help resources</Link></Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader><CardTitle>Create recurring 1:1 template</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={createTemplate} className="space-y-3">
              <Input placeholder="Template name" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Select value={cadence} onValueChange={(v) => setCadence(v as OneOnOneTemplate["cadence"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{cadences.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                <Input placeholder="Timezone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
              </div>
              <div className="space-y-1 rounded-md border p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Participants</p>
                {users.map((user) => (
                  <label key={user.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={participantIds.includes(user.id)}
                      onCheckedChange={(checked) => setParticipantIds((prev) => checked ? [...prev, user.id] : prev.filter((id) => id !== user.id))}
                    />
                    {user.name} <span className="text-xs text-muted-foreground">({user.role})</span>
                  </label>
                ))}
              </div>
              <textarea className="min-h-24 w-full rounded-md border bg-background p-2 text-sm" placeholder="Agenda notes" value={agendaNotes} onChange={(e) => setAgendaNotes(e.target.value)} />
              <Button type="submit" disabled={!title.trim() || participantIds.length < 2}>Save template</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Templates</CardTitle>
              <Badge variant="secondary">{oneOnOnes.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              {oneOnOnes.map((template) => {
                const completed = template.actionItems.filter((item) => item.completed).length;
                const open = template.actionItems.length - completed;
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={`rounded-md border p-3 text-left transition ${selectedId === template.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"}`}
                    onClick={() => setSelectedId(template.id)}
                  >
                    <p className="font-medium">{template.title}</p>
                    <p className="text-xs text-muted-foreground">Cadence: {template.cadence} • {template.scheduleTime ?? "10:00"} {template.timeZone ?? "local"}</p>
                    <p className="text-xs text-muted-foreground">Follow-up todos open: {open}</p>
                  </button>
                );
              })}
            </div>

            {selectedTemplate ? (
              <TemplateEditor
                key={selectedTemplate.id}
                template={selectedTemplate}
                users={users}
                onUpdate={updateOneOnOne}
                onDelete={(id) => {
                  deleteOneOnOne(id);
                  if (selectedId === id) setSelectedId(oneOnOnes.find((item) => item.id !== id)?.id ?? null);
                }}
                onAddActionItem={addActionItem}
                onUpdateActionItem={updateActionItem}
                onDeleteActionItem={deleteActionItem}
              />
            ) : <p className="text-sm text-muted-foreground">Select a template to edit talking points, notes, and follow-up todos.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type EditorProps = {
  template: OneOnOneTemplate;
  users: ReturnType<typeof useMoonshotStore.getState>["users"];
  onUpdate: ReturnType<typeof useMoonshotStore.getState>["updateOneOnOne"];
  onDelete: (id: string) => void;
  onAddActionItem: ReturnType<typeof useMoonshotStore.getState>["addOneOnOneActionItem"];
  onUpdateActionItem: ReturnType<typeof useMoonshotStore.getState>["updateOneOnOneActionItem"];
  onDeleteActionItem: ReturnType<typeof useMoonshotStore.getState>["deleteOneOnOneActionItem"];
};

function TemplateEditor({ template, users, onUpdate, onDelete, onAddActionItem, onUpdateActionItem, onDeleteActionItem }: EditorProps) {
  const [newActionText, setNewActionText] = useState("");
  const [newActionOwnerId, setNewActionOwnerId] = useState(users[0]?.id ?? "");
  const [newActionDueDate, setNewActionDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [talkingPointDraft, setTalkingPointDraft] = useState("");

  const talkingPoints = template.talkingPoints ?? [];

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{template.title}</h3>
          <p className="text-xs text-muted-foreground">Last updated {new Date(template.updatedAt).toLocaleDateString()}</p>
        </div>
        <Button size="sm" variant="destructive" onClick={() => onDelete(template.id)}>Delete</Button>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Select value={template.cadence} onValueChange={(v) => onUpdate(template.id, { cadence: v as OneOnOneTemplate["cadence"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{cadences.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="time" value={template.scheduleTime ?? "10:00"} onChange={(e) => onUpdate(template.id, { scheduleTime: e.target.value })} />
        <Input value={template.timeZone ?? "America/Asuncion"} onChange={(e) => onUpdate(template.id, { timeZone: e.target.value })} />
      </div>

      <textarea className="min-h-24 w-full rounded-md border bg-background p-2 text-sm" value={template.agendaNotes} onChange={(e) => onUpdate(template.id, { agendaNotes: e.target.value })} />

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Talking points</h4>
        {talkingPoints.map((point, idx) => (
          <div key={`${template.id}_tp_${idx}`} className="flex gap-2">
            <Input value={point} onChange={(e) => {
              const next = [...talkingPoints];
              next[idx] = e.target.value;
              onUpdate(template.id, { talkingPoints: next });
            }} />
            <Button size="sm" variant="outline" onClick={() => onUpdate(template.id, { talkingPoints: talkingPoints.filter((_, i) => i !== idx) })}>Remove</Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Input placeholder="Add talking point" value={talkingPointDraft} onChange={(e) => setTalkingPointDraft(e.target.value)} />
          <Button size="sm" onClick={() => {
            if (!talkingPointDraft.trim()) return;
            onUpdate(template.id, { talkingPoints: [...talkingPoints, talkingPointDraft.trim()] });
            setTalkingPointDraft("");
          }}>Add</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">Private notes</p>
          <textarea className="min-h-20 w-full rounded-md border bg-background p-2 text-sm" value={template.privateNotes ?? ""} onChange={(e) => onUpdate(template.id, { privateNotes: e.target.value })} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase text-muted-foreground">Shared notes</p>
          <textarea className="min-h-20 w-full rounded-md border bg-background p-2 text-sm" value={template.sharedNotes ?? ""} onChange={(e) => onUpdate(template.id, { sharedNotes: e.target.value })} />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold">Follow-up todos</h4>
        {template.actionItems.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
            <Checkbox checked={item.completed} onCheckedChange={(checked) => onUpdateActionItem(template.id, item.id, { completed: !!checked })} />
            <Input className="min-w-48 flex-1" value={item.text} onChange={(e) => onUpdateActionItem(template.id, item.id, { text: e.target.value })} />
            <Select value={item.ownerId} onValueChange={(v) => onUpdateActionItem(template.id, item.id, { ownerId: v })}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input type="date" className="w-[150px]" value={item.dueDate} onChange={(e) => onUpdateActionItem(template.id, item.id, { dueDate: e.target.value })} />
            <Button size="sm" variant="outline" onClick={() => onDeleteActionItem(template.id, item.id)}>Remove</Button>
          </div>
        ))}

        <div className="grid gap-2 md:grid-cols-[1fr_180px_140px_auto]">
          <Input placeholder="New follow-up todo" value={newActionText} onChange={(e) => setNewActionText(e.target.value)} />
          <Select value={newActionOwnerId} onValueChange={setNewActionOwnerId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="date" value={newActionDueDate} onChange={(e) => setNewActionDueDate(e.target.value)} />
          <Button disabled={!newActionText.trim()} onClick={() => {
            if (!newActionText.trim()) return;
            onAddActionItem(template.id, { text: newActionText.trim(), ownerId: newActionOwnerId, dueDate: newActionDueDate });
            setNewActionText("");
          }}>Add</Button>
        </div>
      </div>
    </div>
  );
}
