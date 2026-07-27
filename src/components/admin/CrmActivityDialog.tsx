import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { CalendarPlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_TYPES,
  type ActivityChannelType,
  useActivities,
  useCreateActivity,
  useUpdateActivity,
} from "@/features/admin/crm/hooks/useActivities";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type ActivityForm = {
  activityType: string;
  dueAt: string;
  type: ActivityChannelType;
  content: string;
  status: string;
};

const EMPTY_FORM: ActivityForm = { activityType: "", dueAt: "", type: "note", content: "", status: "open" };

const toDateTimeLocal = (value: string | null | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
};

const CrmActivityDialog = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: activities = [] } = useActivities();
  const { user } = useAuth();
  const { toast } = useToast();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();
  const editId = searchParams.get("editActivity");
  const isOpen = searchParams.get("createActivity") === "1" || !!editId;
  const editing = useMemo(() => activities.find((activity) => activity.id === editId) ?? null, [activities, editId]);
  const [form, setForm] = useState<ActivityForm>(EMPTY_FORM);

  useEffect(() => {
    if (!isOpen) return;
    setForm(editing ? {
      activityType: editing.activity_type,
      dueAt: toDateTimeLocal(editing.due_at),
      type: editing.type,
      content: editing.content ?? "",
      status: editing.status,
    } : EMPTY_FORM);
  }, [editing, isOpen]);

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("createActivity");
    next.delete("editActivity");
    setSearchParams(next, { replace: true });
  };

  const submit = async () => {
    if (!form.activityType.trim()) {
      toast({ title: "Activity type required", variant: "destructive" });
      return;
    }
    const input = {
      activityType: form.activityType.trim(),
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      type: form.type,
      content: form.content.trim() || undefined,
      status: form.status,
    };
    try {
      if (editing) {
        await updateActivity.mutateAsync({ id: editing.id, ...input });
        toast({ title: "Activity updated" });
      } else {
        await createActivity.mutateAsync({ ...input, createdBy: user?.id });
        toast({ title: "Activity created" });
      }
      close();
    } catch {
      toast({ title: editing ? "Unable to update activity" : "Unable to create activity", variant: "destructive" });
    }
  };

  const isPending = createActivity.isPending || updateActivity.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CalendarPlus className="h-4 w-4" />{editing ? "Edit Activity" : "New Task"}</DialogTitle>
          <DialogDescription>{editing ? "Update the task details, timing, channel, or completion status." : "Add a CRM task or customer follow-up."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="crm-activity-type">Activity</Label>
            <Input id="crm-activity-type" value={form.activityType} onChange={(event) => setForm({ ...form, activityType: event.target.value })} placeholder="e.g., Follow-up call" autoFocus />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Channel</Label>
              <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as ActivityChannelType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ACTIVITY_TYPES.map((type) => <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="crm-activity-due">Due</Label>
              <Input id="crm-activity-due" type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} />
            </div>
          </div>
          {editing ? (
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(status) => setForm({ ...form, status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="open">Open</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="crm-activity-notes">Notes</Label>
            <Textarea id="crm-activity-notes" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Optional notes" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={isPending}>{isPending ? "Saving…" : editing ? "Save changes" : "Create task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CrmActivityDialog;
