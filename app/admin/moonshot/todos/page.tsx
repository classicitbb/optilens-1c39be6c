"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useMoonshotStore } from "../lib/store";

export default function TodosPage() {
  const { todos, addTodo, updateTodo, deleteTodo } = useMoonshotStore();
  return (
    <Card>
      <CardHeader><CardTitle>Todos</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={() => addTodo({ title: "New Todo", owner: "Classic", dueDate: new Date().toISOString().slice(0, 10), completed: false })}>Add Todo</Button>
        {todos.map((t) => <div key={t.id} className="border rounded p-3 flex items-center justify-between"><div className="flex items-center gap-2"><Checkbox checked={t.completed} onCheckedChange={(checked) => updateTodo(t.id, { completed: Boolean(checked) })} />{t.title}</div><Button variant="destructive" size="sm" onClick={() => deleteTodo(t.id)}>Delete</Button></div>)}
      </CardContent>
    </Card>
  );
}
