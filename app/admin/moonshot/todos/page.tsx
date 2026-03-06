"use client";

import { format, isPast, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMoonshotStore } from "../lib/store";

export default function TodosPage() {
  const { todos, users, meetings, currentUser, addTodo, updateTodo, deleteTodo } = useMoonshotStore();
  const [filter, setFilter] = useState<"All" | "Mine" | "Overdue">("All");
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("Classic");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingId, setMeetingId] = useState<string>(meetings[0]?.id ?? "");

  const filtered = useMemo(() => {
    if (filter === "Mine") return todos.filter((t) => t.owner === (currentUser?.name ?? "Classic"));
    if (filter === "Overdue") return todos.filter((t) => !t.completed && isPast(parseISO(t.dueDate)));
    return todos;
  }, [todos, filter, currentUser]);

  return (
    <Card className="rounded-xl border bg-white">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">To-Dos
          <div className="inline-flex gap-1 rounded-md border p-1 text-sm">{(["All", "Mine", "Overdue"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 rounded ${filter === f ? "bg-slate-900 text-white" : ""}`}>{f}</button>)}</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2 md:grid-cols-5">
          <Input placeholder="Quick add to-do" value={title} onChange={(e) => setTitle(e.target.value)} className="md:col-span-2" />
          <Select value={assignee} onValueChange={setAssignee}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{users.map((u) => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}</SelectContent></Select>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div className="flex gap-2">
            <Select value={meetingId} onValueChange={setMeetingId}><SelectTrigger><SelectValue placeholder="Meeting" /></SelectTrigger><SelectContent>{meetings.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent></Select>
            <Button onClick={() => { if (!title) return; addTodo({ title, owner: assignee, dueDate, completed: false, meetingId }); setTitle(""); }}>Add</Button>
          </div>
        </div>

        {filtered.map((todo) => {
          const linkedMeeting = meetings.find((m) => m.id === todo.meetingId);
          const overdue = !todo.completed && isPast(parseISO(todo.dueDate));
          return (
            <div key={todo.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Checkbox checked={todo.completed} onCheckedChange={(checked) => updateTodo(todo.id, { completed: Boolean(checked) })} />
                <div>
                  <p className={todo.completed ? "line-through text-muted-foreground" : ""}>{todo.title}</p>
                  <p className="text-xs text-muted-foreground">{todo.owner} · Due {format(parseISO(todo.dueDate), "MMM d")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {linkedMeeting ? <Badge variant="outline">{linkedMeeting.title}</Badge> : null}
                {overdue ? <Badge className="bg-red-100 text-red-700">Overdue</Badge> : null}
                <Button size="sm" variant="destructive" onClick={() => deleteTodo(todo.id)}>Delete</Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
