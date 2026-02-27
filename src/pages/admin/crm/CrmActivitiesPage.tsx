import { useMemo, useState } from "react";
import { CalendarCheck, CheckCircle2, PlusCircle } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActivities, useCompleteActivity, useCreateActivity } from "@/features/admin/crm/hooks/useActivities";
import { useToast } from "@/hooks/use-toast";

const CrmActivitiesPage = () => {
  const { data = [], isLoading } = useActivities();
  const createActivity = useCreateActivity();
  const completeActivity = useCompleteActivity();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState("all");
  const [form, setForm] = useState({ activityType: "", dueAt: "" });

  const filtered = useMemo(
    () => data.filter((a) => statusFilter === "all" || a.status === statusFilter),
    [data, statusFilter]
  );

  const handleCreate = async () => {
    if (!form.activityType.trim()) {
      toast({ title: "Activity type required", variant: "destructive" });
      return;
    }

    try {
      await createActivity.mutateAsync({
        activityType: form.activityType.trim(),
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      });
      setForm({ activityType: "", dueAt: "" });
      toast({ title: "Activity created" });
    } catch {
      toast({ title: "Unable to create activity", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminPageHeader title="CRM Activities" icon={CalendarCheck} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Create Activity</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input
            value={form.activityType}
            onChange={(e) => setForm({ ...form, activityType: e.target.value })}
            placeholder="e.g., Follow-up call"
            className="h-8 text-xs"
          />
          <Input
            type="datetime-local"
            value={form.dueAt}
            onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
            className="h-8 text-xs"
          />
          <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={createActivity.isPending}>
            <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Activity
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            Recent Activities
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All</SelectItem>
                <SelectItem value="open" className="text-xs">Open</SelectItem>
                <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {filtered.map((a) => (
            <div key={a.id} className="border rounded p-2 text-xs flex items-center justify-between gap-2">
              <div>
                <p className="font-medium">{a.activity_type}</p>
                <p className="text-muted-foreground">Due: {a.due_at ? new Date(a.due_at).toLocaleString() : "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{a.status}</Badge>
                {a.status !== "completed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px]"
                    onClick={async () => {
                      try {
                        await completeActivity.mutateAsync(a.id);
                        toast({ title: "Activity completed" });
                      } catch {
                        toast({ title: "Unable to update activity", variant: "destructive" });
                      }
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Complete
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
          {isLoading ? <p className="text-xs text-muted-foreground">Loading activities…</p> : null}
          {!isLoading && filtered.length === 0 ? <p className="text-xs text-muted-foreground">No activities yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
};

export default CrmActivitiesPage;
