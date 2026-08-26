import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarPlus, UserPlus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_PRIORITIES, ACTIVITY_STATES, ACTIVITY_TYPES,
  type ActivityChannelType, type ActivityPriority, type ActivityState,
  useActivities, useCreateActivity, useCrmContactOptions, useStaffDirectory, useUpdateActivity,
} from "@/features/admin/crm/hooks/useActivities";
import { PRIORITY_LABELS, STATE_LABELS } from "@/features/admin/crm/focusDesk";
import { TASK_CHANNEL_LABELS, TASK_CHANNELS, type ActivityTaskChannel } from "@/features/admin/crm/activityChannels";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import InlineDictationButton from "@/components/admin/InlineDictationButton";

type ActivityForm = {
  activityType: string; dueAt: string; type: ActivityChannelType; taskChannel: ActivityTaskChannel;
  content: string; status: ActivityState; priority: ActivityPriority; ownerId: string;
  contactId: string; helperIds: string[];
};
const EMPTY_FORM: ActivityForm = {
  activityType: "", dueAt: "", type: "note", taskChannel: "todo", content: "",
  status: "inbox", priority: "normal", ownerId: "", contactId: "", helperIds: [],
};
const toDateTimeLocal = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

const CrmActivityDialog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: activities = [] } = useActivities();
  const { data: staff = [] } = useStaffDirectory();
  const { data: contacts = [] } = useCrmContactOptions();
  const { user } = useAuth();
  const { toast } = useToast();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const editId = searchParams.get("editActivity");
  const isOpen = searchParams.get("createActivity") === "1" || !!editId;
  const editing = useMemo(() => activities.find((activity) => activity.id === editId) ?? null, [activities, editId]);
  const [form, setForm] = useState<ActivityForm>(EMPTY_FORM);
  const [mention, setMention] = useState("");

  const applyTitleDictation = useCallback((nextValue: string) => {
    setForm((current) => ({ ...current, activityType: nextValue }));
  }, []);
  const applyNotesDictation = useCallback((nextValue: string) => {
    setForm((current) => ({ ...current, content: nextValue }));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setMention("");
    setForm(editing ? {
      activityType: editing.activity_type, dueAt: toDateTimeLocal(editing.due_at), type: editing.type,
      taskChannel: editing.task_channel, content: editing.content ?? "", status: editing.status,
      priority: editing.priority, ownerId: editing.owner_id ?? user?.id ?? "", contactId: editing.contact_id ?? "",
      helperIds: editing.participants.filter((person) => person.role === "helper").map((person) => person.user_id),
    } : { ...EMPTY_FORM, ownerId: user?.id ?? "" });
  }, [editing, isOpen, user?.id]);

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("createActivity"); next.delete("editActivity");
    setSearchParams(next, { replace: true });
  };
  const mentionMatches = useMemo(() => {
    const needle = mention.replace(/^@/, "").trim().toLowerCase();
    if (!needle) return [];
    return staff.filter((person) => !form.helperIds.includes(person.user_id) && person.name.toLowerCase().includes(needle)).slice(0, 6);
  }, [form.helperIds, mention, staff]);
  const addHelper = (userId: string) => {
    setForm((current) => ({ ...current, helperIds: [...current.helperIds, userId] }));
    setMention("");
  };

  const submit = async () => {
    if (!form.activityType.trim()) return void toast({ title: "Task title required", variant: "destructive" });
    if (!form.ownerId) return void toast({ title: "Task owner required", variant: "destructive" });
    const input = {
      activityType: form.activityType.trim(), dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      type: form.type, taskChannel: form.taskChannel, content: form.content.trim() || undefined,
      status: form.status, priority: form.priority, ownerId: form.ownerId,
      contactId: form.contactId || undefined, helperIds: form.helperIds,
    };
    try {
      if (editing) await updateActivity.mutateAsync({ id: editing.id, ...input });
      else await createActivity.mutateAsync({ ...input, createdBy: user?.id });
      toast({ title: editing ? "Task updated" : "Task created" });
      close();
    } catch (error) {
      toast({ title: editing ? "Unable to update task" : "Unable to create task", description: error instanceof Error ? error.message : undefined, variant: "destructive" });
    }
  };
  const isPending = createActivity.isPending || updateActivity.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" />{editing ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>Capture the next action, who owns it, and who can help.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label htmlFor="crm-activity-title">Task title</Label><div className="relative"><Input id="crm-activity-title" value={form.activityType} onChange={(event) => setForm({ ...form, activityType: event.target.value })} placeholder="e.g., Follow up on trial lenses" className="pr-11" autoFocus /><InlineDictationButton ariaLabel="Dictate task title" onValueChange={applyTitleDictation} vocabulary="Classic Visions, CRM, contact, task, follow-up, lens" /></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Owner</Label><Select value={form.ownerId} onValueChange={(ownerId) => setForm({ ...form, ownerId })}><SelectTrigger><SelectValue placeholder="Choose owner" /></SelectTrigger><SelectContent>{staff.map((person) => <SelectItem key={person.user_id} value={person.user_id}>{person.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>Customer or contact</Label><Select value={form.contactId || "none"} onValueChange={(contactId) => setForm({ ...form, contactId: contactId === "none" ? "" : contactId })}><SelectTrigger><SelectValue placeholder="General task" /></SelectTrigger><SelectContent><SelectItem value="none">General task</SelectItem>{contacts.map((contact) => <SelectItem key={contact.id} value={contact.id}>{contact.business_name || contact.name || "Unnamed contact"}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="crm-helper-mention">Helpers</Label>
            <div className="flex flex-wrap gap-1">{form.helperIds.map((id) => { const person = staff.find((item) => item.user_id === id); return <Badge key={id} variant="secondary" className="gap-1">{person?.name ?? "Staff member"}<button type="button" aria-label={`Remove ${person?.name ?? "helper"}`} onClick={() => setForm((current) => ({ ...current, helperIds: current.helperIds.filter((helperId) => helperId !== id) }))}><X className="h-3 w-3" /></button></Badge>; })}</div>
            <div className="relative"><UserPlus className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="crm-helper-mention" className="pl-9" value={mention} onChange={(event) => setMention(event.target.value)} placeholder="@mention a staff member" autoComplete="off" />{mentionMatches.length > 0 ? <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">{mentionMatches.map((person) => <button key={person.user_id} type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-accent focus:bg-accent" onClick={() => addHelper(person.user_id)}>{person.name}</button>)}</div> : null}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2"><Label>Priority</Label><Select value={form.priority} onValueChange={(priority) => setForm({ ...form, priority: priority as ActivityPriority })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTIVITY_PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{PRIORITY_LABELS[priority]}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>Workflow state</Label><Select value={form.status} onValueChange={(status) => setForm({ ...form, status: status as ActivityState })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTIVITY_STATES.map((state) => <SelectItem key={state} value={state}>{STATE_LABELS[state]}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label htmlFor="crm-activity-due">Due</Label><Input id="crm-activity-due" type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2"><Label>Activity type</Label><Select value={form.type} onValueChange={(type) => setForm({ ...form, type: type as ActivityChannelType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTIVITY_TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-2"><Label>Task channel</Label><Select value={form.taskChannel} onValueChange={(taskChannel) => setForm({ ...form, taskChannel: taskChannel as ActivityTaskChannel })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TASK_CHANNELS.map((channel) => <SelectItem key={channel} value={channel}>{TASK_CHANNEL_LABELS[channel]}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid gap-2"><Label htmlFor="crm-activity-notes">Notes</Label><div className="relative"><Textarea id="crm-activity-notes" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Context, ideas, or the desired outcome" className="pr-11" rows={4} /><InlineDictationButton ariaLabel="Dictate task notes" onValueChange={applyNotesDictation} vocabulary="Classic Visions, CRM, contact, task, follow-up, lens" /></div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={close}>Cancel</Button><Button onClick={() => void submit()} disabled={isPending}>{isPending ? "Saving…" : editing ? "Save changes" : "Create task"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrmActivityDialog;
