"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMoonshotStore } from "../lib/store";

export default function IssuesPage() {
  const { issues, addIssue, updateIssue, deleteIssue } = useMoonshotStore();

  return (
    <Card>
      <CardHeader><CardTitle>Issues List (IDS)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Button onClick={() => addIssue({ title: "New Issue", owner: "Classic", priority: "Medium", status: "Open" })}>Add Issue</Button>
        {issues.map((i) => <div key={i.id} className="border rounded p-3 flex justify-between"><button onClick={() => updateIssue(i.id, { status: i.status === "Open" ? "Resolved" : "Open" })}>{i.title} · {i.status}</button><Button variant="destructive" size="sm" onClick={() => deleteIssue(i.id)}>Delete</Button></div>)}
      </CardContent>
    </Card>
  );
}
