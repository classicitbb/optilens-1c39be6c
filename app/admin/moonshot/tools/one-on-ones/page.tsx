"use client";

import { FormEvent, useMemo, useState } from "react";
import { useMoonshotStore } from "../../lib/store";
import { OneOnOneTemplate } from "../../lib/types";

const cadences: OneOnOneTemplate["cadence"][] = ["weekly", "biweekly", "monthly", "quarterly"];

export default function OneOnOnesPage() {
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

  const selectedTemplate = useMemo(() => oneOnOnes.find((item) => item.id === selectedId) ?? null, [oneOnOnes, selectedId]);

  const createTemplate = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || participantIds.length < 2) return;

    addOneOnOne({
      title: title.trim(),
      cadence,
      participantIds,
      agendaNotes: agendaNotes.trim(),
      createdBy: currentUser?.id ?? users[0]?.id ?? "u1",
    });

    setTitle("");
    setCadence("weekly");
    setParticipantIds([]);
    setAgendaNotes("");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form onSubmit={createTemplate} className="space-y-3 rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">Create recurring 1:1 template</h2>
          <input className="w-full rounded-md border p-2 text-sm" placeholder="Template name" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select className="w-full rounded-md border p-2 text-sm" value={cadence} onChange={(e) => setCadence(e.target.value as OneOnOneTemplate["cadence"])}>
            {cadences.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <div className="space-y-1 rounded-md border p-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Participants</p>
            {users.map((user) => (
              <label key={user.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={participantIds.includes(user.id)}
                  onChange={(e) =>
                    setParticipantIds((prev) => (e.target.checked ? [...prev, user.id] : prev.filter((id) => id !== user.id)))
                  }
                />
                {user.name} <span className="text-xs text-slate-500">({user.role})</span>
              </label>
            ))}
          </div>
          <textarea className="min-h-24 w-full rounded-md border p-2 text-sm" placeholder="Agenda notes" value={agendaNotes} onChange={(e) => setAgendaNotes(e.target.value)} />
          <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!title.trim() || participantIds.length < 2}>
            Save template
          </button>
        </form>

        <div className="space-y-4 rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
            <p className="text-sm text-slate-500">{oneOnOnes.length} total</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {oneOnOnes.map((template) => {
              const completed = template.actionItems.filter((item) => item.completed).length;
              return (
                <button
                  key={template.id}
                  type="button"
                  className={`rounded-md border p-3 text-left ${selectedId === template.id ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
                  onClick={() => setSelectedId(template.id)}
                >
                  <p className="font-medium text-slate-900">{template.title}</p>
                  <p className="text-xs text-slate-500">Cadence: {template.cadence}</p>
                  <p className="text-xs text-slate-500">Action items: {completed}/{template.actionItems.length}</p>
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
          ) : (
            <p className="text-sm text-slate-500">Select a template to edit agenda notes and action items.</p>
          )}
        </div>
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

  return (
    <div className="space-y-4 rounded-md border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{template.title}</h3>
          <p className="text-xs text-slate-500">Last updated {new Date(template.updatedAt).toLocaleDateString()}</p>
        </div>
        <button type="button" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(template.id)}>
          Delete
        </button>
      </div>

      <textarea
        className="min-h-24 w-full rounded-md border p-2 text-sm"
        value={template.agendaNotes}
        onChange={(e) => onUpdate(template.id, { agendaNotes: e.target.value })}
      />

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-800">Action items</h4>
        {template.actionItems.map((item) => (
          <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
            <input type="checkbox" checked={item.completed} onChange={(e) => onUpdateActionItem(template.id, item.id, { completed: e.target.checked })} />
            <input className="min-w-48 flex-1 rounded-md border p-1 text-sm" value={item.text} onChange={(e) => onUpdateActionItem(template.id, item.id, { text: e.target.value })} />
            <select className="rounded-md border p-1 text-sm" value={item.ownerId} onChange={(e) => onUpdateActionItem(template.id, item.id, { ownerId: e.target.value })}>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
            </select>
            <input type="date" className="rounded-md border p-1 text-sm" value={item.dueDate} onChange={(e) => onUpdateActionItem(template.id, item.id, { dueDate: e.target.value })} />
            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => onDeleteActionItem(template.id, item.id)}>Remove</button>
          </div>
        ))}

        <div className="grid gap-2 md:grid-cols-[1fr_180px_140px_auto]">
          <input className="rounded-md border p-2 text-sm" placeholder="New action item" value={newActionText} onChange={(e) => setNewActionText(e.target.value)} />
          <select className="rounded-md border p-2 text-sm" value={newActionOwnerId} onChange={(e) => setNewActionOwnerId(e.target.value)}>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
          <input type="date" className="rounded-md border p-2 text-sm" value={newActionDueDate} onChange={(e) => setNewActionDueDate(e.target.value)} />
          <button
            type="button"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40"
            disabled={!newActionText.trim()}
            onClick={() => {
              if (!newActionText.trim()) return;
              onAddActionItem(template.id, { text: newActionText.trim(), ownerId: newActionOwnerId, dueDate: newActionDueDate });
              setNewActionText("");
            }}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
