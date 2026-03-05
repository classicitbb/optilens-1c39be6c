"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMoonshotStore } from "../lib/store";

export default function RocksPage() {
  const { rocks, addRock, updateRock, deleteRock } = useMoonshotStore();
  return (
    <Card>
      <CardHeader><CardTitle>Rocks</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={() => addRock({ title: "New Rock", owner: "Classic", dueDate: new Date().toISOString().slice(0, 10), status: "On Track" })}>Add Rock</Button>
        {rocks.map((r) => <div key={r.id} className="border rounded p-3 flex justify-between"><button onClick={() => updateRock(r.id, { status: r.status === "On Track" ? "At Risk" : "On Track" })}>{r.title} · {r.status}</button><Button variant="destructive" size="sm" onClick={() => deleteRock(r.id)}>Delete</Button></div>)}
      </CardContent>
    </Card>
  );
}
