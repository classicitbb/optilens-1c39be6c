"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMoonshotStore } from "../lib/store";

export default function WorkspacePage() {
  const { rocks, issues, todos } = useMoonshotStore();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card><CardHeader><CardTitle>Priority Rocks</CardTitle></CardHeader><CardContent className="space-y-2">{rocks.map((r) => <div key={r.id} className="rounded border p-2 text-sm">{r.title}</div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Top Issues</CardTitle></CardHeader><CardContent className="space-y-2">{issues.map((i) => <div key={i.id} className="rounded border p-2 text-sm">{i.title}</div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Actions</CardTitle></CardHeader><CardContent className="space-y-2">{todos.map((t) => <div key={t.id} className="rounded border p-2 text-sm">{t.title}</div>)}</CardContent></Card>
    </div>
  );
}
